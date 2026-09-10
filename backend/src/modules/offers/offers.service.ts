import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { ProductsService } from "../products/products.service";
import { MeiliService } from "../search/meili.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

export interface OfferInput {
  productId: string;
  price: number;
  bulkPrice?: number | null;
  bulkMinQty?: number | null;
  unit?: string;
  /** Нэгж тутмын жин, кг — хүргэлтийн машиныг үүгээр тодорхойлно */
  weightKg?: number | null;
  deliveryPrice?: number;
  deliveryDays?: number | null;
  deliversTo?: string[];
  active?: boolean;
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly meili: MeiliService,
  ) {}

  /** Нэг бүтээгдэхүүний бүх нийлүүлэгчийн санал, хямдаас нь эрэмбэлнэ */
  async byProduct(productSlug: string) {
    const product = await this.products.bySlug(productSlug);
    return product.offers;
  }

  /** Нийлүүлэгчийн өөрийн саналууд (dashboard) */
  async mine(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const offers = await this.prisma.offer.findMany({
      where: { supplierId: user.supplierId },
      include: {
        product: { include: { category: true } },
        inventory: { include: { warehouse: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return offers.map((offer) => ({
      id: offer.id,
      price: offer.price,
      bulkPrice: offer.bulkPrice,
      bulkMinQty: offer.bulkMinQty,
      unit: offer.unit,
      weightKg: offer.weightKg,
      deliveryPrice: offer.deliveryPrice,
      deliveryDays: offer.deliveryDays,
      deliversTo: offer.deliversTo,
      active: offer.active,
      updatedAt: offer.updatedAt,
      stock: offer.inventory.reduce((sum, row) => sum + row.quantity, 0),
      product: {
        id: offer.product.id,
        slug: offer.product.slug,
        name: offer.product.name,
        variantLabel: offer.product.variantLabel,
        art: offer.product.art,
        category: offer.product.category.name,
      },
      warehouses: offer.inventory.map((row) => ({
        inventoryId: row.id,
        warehouseId: row.warehouseId,
        name: row.warehouse.name,
        city: row.warehouse.city,
        quantity: row.quantity,
      })),
    }));
  }

  async create(user: AuthUser, input: OfferInput) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const offer = await this.prisma.offer.create({
      data: {
        productId: input.productId,
        supplierId: user.supplierId,
        price: input.price,
        bulkPrice: input.bulkPrice ?? null,
        bulkMinQty: input.bulkMinQty ?? null,
        unit: input.unit ?? "ш",
        weightKg: input.weightKg ?? null,
        deliveryPrice: input.deliveryPrice ?? 0,
        deliveryDays: input.deliveryDays ?? null,
        deliversTo: input.deliversTo ?? [],
      },
    });

    await this.meili.enqueueIndex(offer.productId);
    return offer;
  }

  async update(user: AuthUser, id: string, input: Partial<OfferInput>) {
    await this.assertOwnership(user, id);
    const offer = await this.prisma.offer.update({
      where: { id },
      data: {
        price: input.price,
        bulkPrice: input.bulkPrice,
        bulkMinQty: input.bulkMinQty,
        unit: input.unit,
        weightKg: input.weightKg,
        deliveryPrice: input.deliveryPrice,
        deliveryDays: input.deliveryDays,
        deliversTo: input.deliversTo,
        active: input.active,
      },
    });

    await this.meili.enqueueIndex(offer.productId);
    return offer;
  }

  async remove(user: AuthUser, id: string) {
    await this.assertOwnership(user, id);
    const offer = await this.prisma.offer.update({
      where: { id },
      data: { active: false },
    });
    await this.meili.enqueueIndex(offer.productId);
    return offer;
  }

  /** Excel-ээр бөөнөөр үнэ шинэчлэх (баримтын 4.2) */
  async bulkUpdatePrices(
    user: AuthUser,
    rows: { offerId: string; price?: number; bulkPrice?: number | null }[],
  ) {
    const updated = [];
    for (const row of rows) {
      await this.assertOwnership(user, row.offerId);
      updated.push(
        await this.prisma.offer.update({
          where: { id: row.offerId },
          data: { price: row.price, bulkPrice: row.bulkPrice },
        }),
      );
    }
    for (const productId of new Set(updated.map((offer) => offer.productId))) {
      await this.meili.enqueueIndex(productId);
    }
    return { updated: updated.length };
  }

  /** Нийлүүлэгч зөвхөн өөрийн саналыг өөрчилнө (баримтын 10-р хэсгийн эрхийн хамгаалалт) */
  private async assertOwnership(user: AuthUser, offerId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException("Санал олдсонгүй");
    if (user.role !== "ADMIN" && offer.supplierId !== user.supplierId) {
      throw new ForbiddenException("Зөвхөн өөрийн саналыг өөрчилнө");
    }
    return offer;
  }
}
