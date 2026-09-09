import { Injectable, NotFoundException } from "@nestjs/common";
import { DisputeStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

/** Буцаалт, маргаан (баримтын 4.3, 5-р хэсэг) */
@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orderCode: string;
    supplierOrderId?: string;
    userId?: string;
    reason: string;
    detail?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { code: data.orderCode },
    });
    if (!order) throw new NotFoundException("Захиалга олдсонгүй");

    return this.prisma.dispute.create({
      data: {
        orderId: order.id,
        supplierOrderId: data.supplierOrderId,
        userId: data.userId,
        reason: data.reason,
        detail: data.detail,
      },
    });
  }

  mine(userId: string) {
    return this.prisma.dispute.findMany({
      where: { userId },
      include: { order: { select: { code: true, total: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listAll() {
    return this.prisma.dispute.findMany({
      include: {
        order: { select: { code: true, total: true, buyerName: true } },
        supplierOrder: { select: { code: true, supplierId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  resolve(id: string, status: DisputeStatus, resolution?: string) {
    return this.prisma.dispute.update({
      where: { id },
      data: { status, resolution },
    });
  }
}
