import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { ProductsService } from "../products/products.service";
import type { ProductQueryDto } from "../products/dto";
import { MeiliService } from "./meili.service";

/**
 * Хайлт. Meilisearch тохируулсан үед бүтээгдэхүүний тохирлыг индексээс,
 * дэлгэрэнгүй мэдээллийг PostgreSQL-ээс авна. Индекс байхгүй үед бүхэлдээ
 * PostgreSQL текст хайлтаар ажиллана (архитектурын баримтын 9-р хэсэг).
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly meili: MeiliService,
  ) {}

  async search(query: ProductQueryDto) {
    const term = query.q?.trim();
    if (!term || !this.meili.enabled) return this.products.list(query);

    const ids = await this.meili.searchIds(term, {
      category: query.category,
      cities: query.city,
      suppliers: query.supplier,
      manufacturers: query.manufacturer,
    });
    if (ids === null) return this.products.list(query);
    if (ids.length === 0) {
      return this.products.list({ ...query, q: undefined, ids: ["__none__"] });
    }

    // Тохирлыг индексээс, үнэ/үлдэгдэл зэрэг бодит өгөгдлийг DB-ээс авна
    return this.products.list({ ...query, q: undefined, ids });
  }

  /** Хайлтын мөрөнд гарах түргэн санал болголт */
  async suggest(term: string, take = 8) {
    if (!term?.trim()) return { products: [], suppliers: [], categories: [] };

    const [products, suppliers, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { manufacturer: { contains: term, mode: "insensitive" } },
          ],
        },
        select: { slug: true, name: true, variantLabel: true, art: true },
        take,
      }),
      this.prisma.supplier.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        select: { slug: true, name: true, verified: true },
        take: 4,
      }),
      this.prisma.category.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        select: { slug: true, name: true, icon: true },
        take: 4,
      }),
    ]);

    return { products, suppliers, categories };
  }

  /** Админ: индексийг бүхэлд нь дахин барих */
  reindex() {
    return this.meili.reindexAll();
  }

  get indexEnabled(): boolean {
    return this.meili.enabled;
  }
}
