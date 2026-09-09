import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { QueueService } from "../../common/queue/queue.service";

export const SEARCH_INDEX_JOB = "search.index";
export const SEARCH_REINDEX_JOB = "search.reindex";

const INDEX_NAME = "products";

interface ProductDocument {
  id: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  manufacturer: string | null;
  summary: string | null;
  standard: string | null;
  categorySlug: string;
  categoryName: string;
  attributes: string[];
  suppliers: string[];
  supplierSlugs: string[];
  cities: string[];
  minPrice: number | null;
  totalStock: number;
  rating: number;
  inStock: boolean;
}

/**
 * Meilisearch индекс. `MEILISEARCH_HOST` тохируулаагүй үед идэвхгүй байж,
 * хайлт PostgreSQL дээр ажиллана (архитектурын баримтын 9-р хэсэг).
 */
@Injectable()
export class MeiliService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MeiliService.name);
  private readonly host = (process.env.MEILISEARCH_HOST ?? "").replace(/\/$/, "");
  private readonly apiKey = process.env.MEILISEARCH_API_KEY ?? "";
  private ready = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  get enabled(): boolean {
    return this.host.length > 0;
  }

  /** Meilisearch REST API руу хандах нимгэн wrapper */
  private async call<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.host}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Meilisearch ${response.status}: ${text.slice(0, 200)}`);
    }
    return (await response.json()) as T;
  }

  async onApplicationBootstrap(): Promise<void> {
    this.queue.register(SEARCH_INDEX_JOB, async (payload) => {
      const { productId } = payload as { productId: string };
      await this.indexProduct(productId);
    });
    this.queue.register(SEARCH_REINDEX_JOB, async () => {
      await this.reindexAll();
    });

    if (!this.enabled) {
      this.logger.log("MEILISEARCH_HOST алга — PostgreSQL хайлт ашиглана");
      return;
    }

    try {
      await this.call("/indexes", "POST", {
        uid: INDEX_NAME,
        primaryKey: "id",
      }).catch(() => undefined);

      await this.call(`/indexes/${INDEX_NAME}/settings`, "PATCH", {
        searchableAttributes: [
          "name",
          "variantLabel",
          "manufacturer",
          "categoryName",
          "suppliers",
          "attributes",
          "summary",
          "standard",
        ],
        filterableAttributes: [
          "categorySlug",
          "supplierSlugs",
          "cities",
          "manufacturer",
          "minPrice",
          "inStock",
        ],
        sortableAttributes: ["minPrice", "totalStock", "rating"],
      });

      this.ready = true;
      this.logger.log("Meilisearch индекс бэлэн");
    } catch (error) {
      this.logger.warn(`Meilisearch холбогдсонгүй: ${(error as Error).message}`);
      this.ready = false;
    }
  }

  /** Өөрчлөгдсөн бүтээгдэхүүнийг дараалалаар дахин индексжүүлнэ */
  async enqueueIndex(productId: string): Promise<void> {
    if (!this.enabled) return;
    await this.queue.enqueue(SEARCH_INDEX_JOB, { productId });
  }

  async enqueueReindex(): Promise<void> {
    await this.queue.enqueue(SEARCH_REINDEX_JOB, {});
  }

  /**
   * Хайлтын үр дүн: бүтээгдэхүүний id-г эрэмбэлсэн байдлаар буцаана.
   * Индекс идэвхгүй бол `null` буцаах бөгөөд дуудагч PostgreSQL руу шилжинэ.
   */
  async searchIds(
    term: string,
    filters: { category?: string; cities?: string[]; suppliers?: string[]; manufacturers?: string[] },
    limit = 200,
  ): Promise<string[] | null> {
    if (!this.ready) return null;

    const filter: string[] = [];
    if (filters.category) filter.push(`categorySlug = "${filters.category}"`);
    if (filters.cities?.length) {
      filter.push(`(${filters.cities.map((city) => `cities = "${city}"`).join(" OR ")})`);
    }
    if (filters.suppliers?.length) {
      filter.push(
        `(${filters.suppliers.map((slug) => `supplierSlugs = "${slug}"`).join(" OR ")})`,
      );
    }
    if (filters.manufacturers?.length) {
      filter.push(
        `(${filters.manufacturers.map((name) => `manufacturer = "${name}"`).join(" OR ")})`,
      );
    }

    try {
      const result = await this.call<{ hits: { id: string }[] }>(
        `/indexes/${INDEX_NAME}/search`,
        "POST",
        {
          q: term,
          limit,
          ...(filter.length > 0 ? { filter } : {}),
          attributesToRetrieve: ["id"],
        },
      );
      return result.hits.map((hit) => hit.id);
    } catch (error) {
      this.logger.warn(`Meilisearch хайлт амжилтгүй: ${(error as Error).message}`);
      return null;
    }
  }

  async indexProduct(productId: string): Promise<void> {
    if (!this.ready) return;
    const document = await this.buildDocument(productId);
    if (!document) {
      await this.call(`/indexes/${INDEX_NAME}/documents/${productId}`, "DELETE").catch(
        () => undefined,
      );
      return;
    }
    await this.call(`/indexes/${INDEX_NAME}/documents`, "POST", [document]);
  }

  async reindexAll(): Promise<{ indexed: number }> {
    if (!this.ready) return { indexed: 0 };

    const products = await this.prisma.product.findMany({
      where: { active: true },
      select: { id: true },
    });

    const documents: ProductDocument[] = [];
    for (const product of products) {
      const document = await this.buildDocument(product.id);
      if (document) documents.push(document);
    }

    if (documents.length > 0) {
      await this.call(`/indexes/${INDEX_NAME}/documents`, "POST", documents);
    }
    this.logger.log(`Meilisearch: ${documents.length} бүтээгдэхүүн индексжлээ`);
    return { indexed: documents.length };
  }

  private async buildDocument(productId: string): Promise<ProductDocument | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        attributes: { include: { attribute: true } },
        reviews: { select: { rating: true } },
        offers: {
          where: { active: true },
          include: {
            supplier: true,
            inventory: { include: { warehouse: true } },
          },
        },
      },
    });
    if (!product || !product.active) return null;

    const cities = new Set<string>();
    let totalStock = 0;
    for (const offer of product.offers) {
      for (const city of offer.deliversTo) cities.add(city);
      for (const row of offer.inventory) {
        cities.add(row.warehouse.city);
        totalStock += Math.max(0, row.quantity - row.reserved);
      }
    }

    const prices = product.offers.map((offer) => offer.price).sort((a, b) => a - b);
    const ratingSum = product.reviews.reduce((sum, review) => sum + review.rating, 0);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: product.variantLabel,
      manufacturer: product.manufacturer,
      summary: product.summary,
      standard: product.standard,
      categorySlug: product.category.slug,
      categoryName: product.category.name,
      attributes: product.attributes.map(
        (value) => `${value.attribute.label}: ${value.value}${value.attribute.unit ?? ""}`,
      ),
      suppliers: product.offers.map((offer) => offer.supplier.name),
      supplierSlugs: product.offers.map((offer) => offer.supplier.slug),
      cities: [...cities],
      minPrice: prices[0] ?? null,
      totalStock,
      rating: product.reviews.length ? ratingSum / product.reviews.length : 0,
      inStock: totalStock > 0,
    };
  }
}
