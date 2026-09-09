import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { MeiliService } from "../search/meili.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  /** Нийлүүлэгчийн бүх салбарын үлдэгдэл */
  async mine(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const rows = await this.prisma.inventory.findMany({
      where: { offer: { supplierId: user.supplierId } },
      include: {
        warehouse: true,
        offer: { include: { product: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      quantity: row.quantity,
      reserved: row.reserved,
      available: row.quantity - row.reserved,
      updatedAt: row.updatedAt,
      warehouse: { id: row.warehouseId, name: row.warehouse.name, city: row.warehouse.city },
      offer: {
        id: row.offerId,
        price: row.offer.price,
        unit: row.offer.unit,
        productName: row.offer.product.name,
        productSlug: row.offer.product.slug,
      },
    }));
  }

  /** Тухайн offer + агуулахын үлдэгдлийг шинэчлэх (байхгүй бол үүсгэнэ) */
  async setQuantity(
    user: AuthUser,
    input: { offerId: string; warehouseId: string; quantity: number },
  ) {
    if (input.quantity < 0) throw new BadRequestException("Үлдэгдэл сөрөг байж болохгүй");

    const offer = await this.prisma.offer.findUnique({ where: { id: input.offerId } });
    if (!offer) throw new BadRequestException("Санал олдсонгүй");
    if (user.role !== "ADMIN" && offer.supplierId !== user.supplierId) {
      throw new ForbiddenException("Зөвхөн өөрийн барааны үлдэгдлийг өөрчилнө");
    }

    const row = await this.prisma.inventory.upsert({
      where: {
        offerId_warehouseId: {
          offerId: input.offerId,
          warehouseId: input.warehouseId,
        },
      },
      update: { quantity: input.quantity },
      create: {
        offerId: input.offerId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
      },
    });

    await this.meili.enqueueIndex(offer.productId);
    return row;
  }

  /** Дуусч буй бараа: тодорхой хэмжээнээс доош үлдэгдэлтэй мөрүүд */
  async lowStock(user: AuthUser, threshold = 100) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const rows = await this.prisma.inventory.findMany({
      where: {
        offer: { supplierId: user.supplierId },
        quantity: { lte: threshold },
      },
      include: { warehouse: true, offer: { include: { product: true } } },
    });
    return rows.map((row) => ({
      productName: row.offer.product.name,
      warehouse: row.warehouse.name,
      quantity: row.quantity,
      unit: row.offer.unit,
    }));
  }
}
