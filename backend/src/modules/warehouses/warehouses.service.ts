import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const warehouses = await this.prisma.warehouse.findMany({
      where: { supplierId: user.supplierId },
      include: { inventory: true },
    });

    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      city: warehouse.city,
      address: warehouse.address,
      lat: warehouse.lat,
      lng: warehouse.lng,
      skuCount: warehouse.inventory.length,
      totalQuantity: warehouse.inventory.reduce((s, r) => s + r.quantity, 0),
    }));
  }

  async create(
    user: AuthUser,
    data: { name: string; city: string; address?: string; lat?: number; lng?: number },
  ) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    return this.prisma.warehouse.create({
      data: { ...data, supplierId: user.supplierId },
    });
  }

  async update(
    user: AuthUser,
    id: string,
    data: {
      name?: string;
      city?: string;
      address?: string;
      lat?: number | null;
      lng?: number | null;
    },
  ) {
    await this.assertOwnership(user, id);
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  async remove(user: AuthUser, id: string) {
    await this.assertOwnership(user, id);
    return this.prisma.warehouse.delete({ where: { id } });
  }

  private async assertOwnership(user: AuthUser, id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException("Агуулах олдсонгүй");
    if (user.role !== "ADMIN" && warehouse.supplierId !== user.supplierId) {
      throw new ForbiddenException("Зөвхөн өөрийн агуулахыг өөрчилнө");
    }
  }
}
