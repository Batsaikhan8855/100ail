import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { MeiliService } from "../search/meili.service";
import { StorageService } from "../storage/storage.service";
import { paginate } from "../../common/dto/pagination.dto";
import { CreateProductDto, ProductQueryDto } from "./dto";

/** Санал дээр агуулахын үлдэгдэл, байршлыг нэмж буулгасан хэлбэр */
export type MappedOffer = ReturnType<ProductsService["mapOffer"]>;

const offerInclude = {
  supplier: true,
  inventory: { include: { warehouse: true } },
} satisfies Prisma.OfferInclude;

const productInclude = {
  category: true,
  attributes: { include: { attribute: true } },
  offers: { where: { active: true }, include: offerInclude },
  reviews: true,
  images: { orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/**
 * Гулсуурын дээд хязгаар: эрэмбэлэгдсэн үнийн 99 хувийн цэгийг мянгад
 * дугуйрсан утга. Бүх үнэ ойролцоо бол жинхэнэ дээд утга буцна.
 */
function percentileMax(sorted: number[]): number {
  if (sorted.length === 0) return 1_000_000;
  const top = sorted[sorted.length - 1];
  if (sorted.length < 20) return top;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? top;
  return Math.min(top, Math.ceil(p99 / 1000) * 1000);
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly meili: MeiliService,
  ) {}

  mapOffer(offer: Prisma.OfferGetPayload<{ include: typeof offerInclude }>) {
    const stock = offer.inventory.reduce(
      (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
      0,
    );
    // Хамгийн их үлдэгдэлтэй агуулахыг үндсэн байршил болгоно
    const main = [...offer.inventory].sort(
      (a, b) => b.quantity - a.quantity,
    )[0];

    return {
      id: offer.id,
      productId: offer.productId,
      price: offer.price,
      bulkPrice: offer.bulkPrice,
      bulkMinQty: offer.bulkMinQty,
      unit: offer.unit,
      deliveryPrice: offer.deliveryPrice,
      deliveryDays: offer.deliveryDays,
      deliversTo: offer.deliversTo,
      stock,
      location: main?.warehouse.city ?? null,
      warehouses: offer.inventory.map((row) => ({
        id: row.warehouseId,
        name: row.warehouse.name,
        city: row.warehouse.city,
        address: row.warehouse.address,
        lat: row.warehouse.lat,
        lng: row.warehouse.lng,
        quantity: row.quantity - row.reserved,
      })),
      supplier: {
        id: offer.supplier.id,
        slug: offer.supplier.slug,
        name: offer.supplier.name,
        verified: offer.supplier.verified,
        rating: offer.supplier.rating,
        reviewCount: offer.supplier.reviewCount,
      },
    };
  }

  mapProduct(product: ProductWithRelations) {
    const offers = product.offers
      .map((offer) => this.mapOffer(offer))
      .sort((a, b) => a.price - b.price);

    const ratingSum = product.reviews.reduce((sum, r) => sum + r.rating, 0);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: product.variantLabel,
      manufacturer: product.manufacturer,
      art: product.art,
      summary: product.summary,
      standard: product.standard,
      usage: product.usage,
      category: {
        id: product.category.id,
        slug: product.category.slug,
        name: product.category.name,
        icon: product.category.icon,
      },
      attributes: product.attributes.map((value) => ({
        key: value.attribute.key,
        label: value.attribute.label,
        unit: value.attribute.unit,
        value: value.value,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        key: image.key,
        url: this.storage.publicUrl(image.key),
      })),
      offers,
      bestOffer: offers[0] ?? null,
      offerCount: offers.length,
      minPrice: offers[0]?.price ?? null,
      maxPrice: offers[offers.length - 1]?.price ?? null,
      totalStock: offers.reduce((sum, offer) => sum + offer.stock, 0),
      rating: product.reviews.length
        ? Number((ratingSum / product.reviews.length).toFixed(1))
        : null,
      reviewCount: product.reviews.length,
    };
  }

  /**
   * Каталогийн жагсаалт: хайлт, ангилал, үнэ, байршил, нийлүүлэгч,
   * үйлдвэрлэгч, үлдэгдлээр шүүнэ. Facet-ийн тоог мөн буцаана.
   */
  async list(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const inStockOnly = query.inStock === "true";

    // Facet-ийн тоог үндсэн шүүлт (хайлт + ангилал + үнэ)-ээр тооцно
    const baseWhere: Prisma.ProductWhereInput = {
      active: true,
      // Үндсэн ангиллаар шүүхэд дэд ангиллын бараа мөн орно
      ...(query.category
        ? {
            category: {
              OR: [
                { slug: query.category },
                { parent: { slug: query.category } },
              ],
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { manufacturer: { contains: query.q, mode: "insensitive" } },
              { summary: { contains: query.q, mode: "insensitive" } },
              {
                offers: {
                  some: {
                    supplier: {
                      name: { contains: query.q, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const priceFilter: Prisma.OfferWhereInput =
      query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {};

    const offerFilter: Prisma.OfferWhereInput = {
      active: true,
      ...priceFilter,
      ...(query.supplier?.length
        ? { supplier: { slug: { in: query.supplier } } }
        : {}),
      ...(query.city?.length ? { deliversTo: { hasSome: query.city } } : {}),
      ...(inStockOnly
        ? { inventory: { some: { quantity: { gt: 0 } } } }
        : {}),
    };

    const where: Prisma.ProductWhereInput = {
      ...baseWhere,
      ...(query.ids ? { id: { in: query.ids } } : {}),
      ...(query.manufacturer?.length
        ? { manufacturer: { in: query.manufacturer } }
        : {}),
      offers: { some: offerFilter },
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        ...productInclude,
        offers: { where: offerFilter, include: offerInclude },
      },
    });

    const mapped = products.map((product) => this.mapProduct(product));

    // Хамгийн боломжийн саналын үнээр эрэмбэлэх тул JS талд эрэмбэлнэ
    switch (query.sort) {
      case "popular":
        mapped.sort((a, b) => b.totalStock - a.totalStock);
        break;
      case "new":
        mapped.sort(
          (a, b) =>
            products.findIndex((p) => p.id === b.id) -
            products.findIndex((p) => p.id === a.id),
        );
        break;
      case "rating":
        mapped.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      default:
        mapped.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    }

    const start = (page - 1) * limit;
    const items = mapped.slice(start, start + limit);
    const facets = await this.facets(baseWhere, query.minPrice, query.maxPrice);

    return { ...paginate(items, mapped.length, page, limit), facets };
  }

  /** Шүүлтүүрийн сонголт бүрийн тоо */
  private async facets(
    baseWhere: Prisma.ProductWhereInput,
    minPrice?: number,
    maxPrice?: number,
  ) {
    // Үнийн шүүлтийг энд тавихгүй — гулсуурын хязгаар өөрийнхөө шүүлтээс
    // хамаарвал нарийсгасны дараа буцаан өргөсгөх боломжгүй болно.
    const products = await this.prisma.product.findMany({
      where: baseWhere,
      include: {
        offers: { where: { active: true }, include: offerInclude },
      },
    });

    /** Гулсуурын хязгаар: одоогийн ангилал/хайлтын бүх санал */
    const bounds = products
      .flatMap((product) => product.offers.map((offer) => offer.price))
      .sort((a, b) => a - b);

    const inPrice = (price: number) =>
      (minPrice === undefined || price >= minPrice) &&
      (maxPrice === undefined || price <= maxPrice);

    const cities = new Map<string, number>();
    const suppliers = new Map<string, { name: string; count: number }>();
    const manufacturers = new Map<string, number>();
    let inStock = 0;
    let preorder = 0;

    for (const product of products) {
      const offers = product.offers.filter((offer) => inPrice(offer.price));
      // Үнийн хүрээнд тохирох саналгүй бараа үр дүнд ордоггүй тул
      // шүүлтүүрийн тоонд ч орох ёсгүй
      if (offers.length === 0) continue;

      const productCities = new Set<string>();
      const productSuppliers = new Set<string>();
      let hasStock = false;

      for (const offer of offers) {
        for (const city of offer.deliversTo) productCities.add(city);
        for (const row of offer.inventory) {
          productCities.add(row.warehouse.city);
          if (row.quantity > 0) hasStock = true;
        }
        productSuppliers.add(offer.supplier.slug);
        suppliers.set(offer.supplier.slug, {
          name: offer.supplier.name,
          count: (suppliers.get(offer.supplier.slug)?.count ?? 0) + 0,
        });
      }

      for (const city of productCities) {
        cities.set(city, (cities.get(city) ?? 0) + 1);
      }
      for (const slug of productSuppliers) {
        const current = suppliers.get(slug);
        if (current) suppliers.set(slug, { ...current, count: current.count + 1 });
      }
      if (product.manufacturer) {
        manufacturers.set(
          product.manufacturer,
          (manufacturers.get(product.manufacturer) ?? 0) + 1,
        );
      }
      if (hasStock) inStock += 1;
      else preorder += 1;
    }

    return {
      city: [...cities.entries()]
        .map(([id, count]) => ({ id, label: id, count }))
        .sort((a, b) => b.count - a.count),
      supplier: [...suppliers.entries()]
        .map(([id, value]) => ({ id, label: value.name, count: value.count }))
        .sort((a, b) => b.count - a.count),
      manufacturer: [...manufacturers.entries()]
        .map(([id, count]) => ({ id, label: id, count }))
        .sort((a, b) => b.count - a.count),
      availability: [
        { id: "in-stock", label: "Бэлэн", count: inStock },
        { id: "preorder", label: "Захиалгаар", count: preorder },
      ],
      price: {
        min: bounds[0] ?? 0,
        // Ганц хэт өндөр үнэтэй бараа гулсуурыг бүхэлд нь сунгаж,
        // 99% нь зүүн зах руу шахагддаг. Тиймээс дээд хязгаарыг 99
        // хувийн цэгээр тогтооно — түүнээс дээш үнийг гараар бичиж,
        // эсвэл гулсуурыг баруун зах руу аваачиж (хязгааргүй) авна.
        max: percentileMax(bounds),
      },
    };
  }

  async bySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");
    return this.mapProduct(product);
  }

  async byId(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");
    return this.mapProduct(product);
  }

  /** Тухайн бүтээгдэхүүнтэй ижил ангиллын бусад бараа */
  async related(slug: string, take = 4) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");

    const products = await this.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, active: true },
      include: productInclude,
      take,
    });
    return products.map((item) => this.mapProduct(item));
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: { ...dto, art: dto.art ?? "cement" },
      include: productInclude,
    });
    await this.meili.enqueueIndex(product.id);
    return this.mapProduct(product);
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: productInclude,
    });
    await this.meili.enqueueIndex(product.id);
    return this.mapProduct(product);
  }

  async remove(id: string) {
    const product = await this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
    await this.meili.enqueueIndex(id);
    return product;
  }

  /** S3-д байршуулсан зургийг бүтээгдэхүүнд холбоно */
  async addImage(productId: string, key: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");

    const count = await this.prisma.productImage.count({ where: { productId } });
    const image = await this.prisma.productImage.create({
      data: { productId, key, position: count },
    });
    return { id: image.id, key: image.key, url: this.storage.publicUrl(image.key) };
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException("Зураг олдсонгүй");
    if (image.productId !== productId) {
      throw new ForbiddenException("Энэ зураг өөр бүтээгдэхүүнийх байна");
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.storage.remove(image.key).catch(() => undefined);
    return { removed: imageId };
  }
}
