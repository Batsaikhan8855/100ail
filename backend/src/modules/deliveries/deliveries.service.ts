import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryStatus, NotificationType } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { deliveryPosition } from "./route";

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Хүргэлт хянах — код мэдэж байвал нэвтрэхгүйгээр харна.
   *
   * Хэрэглэгч ихэвчлэн захиалгын хуудсан дээрх дугаараа хуулж тавьдаг тул
   * хянах кодоос гадна захиалгын (`100A-XXXXXX`) болон дэд захиалгын
   * (`100A-XXXXXX-1`) дугаарыг ч хүлээж авна. Нэг захиалгад хэд хэдэн
   * нийлүүлэгч байж болох тул жагсаалт буцаана.
   */
  async track(code: string) {
    const value = code.trim();
    if (!value) throw new NotFoundException("Хүргэлт олдсонгүй");

    // Кодыг том жижиг үсэг ялгалгүй харьцуулна
    const insensitive = { equals: value, mode: "insensitive" as const };
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        OR: [
          { trackingCode: insensitive },
          { supplierOrder: { code: insensitive } },
          { supplierOrder: { order: { code: insensitive } } },
        ],
      },
      include: {
        supplierOrder: {
          include: { supplier: true, items: true, order: true },
        },
      },
      orderBy: { supplierOrder: { code: "asc" } },
    });

    if (deliveries.length === 0) {
      // Захиалга нь байгаа ч хүргэлт үүсээгүй бол шалтгааныг нь хэлнэ
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [{ code: insensitive }, { supplierOrders: { some: { code: insensitive } } }],
        },
      });
      throw new NotFoundException(
        order
          ? "Захиалга олдлоо ч хүргэлт хараахан бүртгэгдээгүй байна"
          : "Хүргэлт олдсонгүй",
      );
    }

    return deliveries.map((delivery) => ({
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      city: delivery.city,
      address: delivery.address,
      driverName: delivery.driverName,
      driverPhone: delivery.driverPhone,
      dispatchedAt: delivery.dispatchedAt,
      deliveredAt: delivery.deliveredAt,
      updatedAt: delivery.updatedAt,
      // Ачаа хаана явааг зураг дээр харуулна (GPS хүртэлх тооцоолол)
      position: deliveryPosition(delivery),
      supplier: delivery.supplierOrder.supplier.name,
      orderCode: delivery.supplierOrder.order.code,
      supplierOrderCode: delivery.supplierOrder.code,
      items: delivery.supplierOrder.items.map((item) => ({
        productName: item.productName,
        qty: item.qty,
        unit: item.unit,
      })),
    }));
  }

  async forSupplier(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const deliveries = await this.prisma.delivery.findMany({
      where: { supplierOrder: { supplierId: user.supplierId } },
      include: { supplierOrder: { include: { order: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      city: delivery.city,
      address: delivery.address,
      driverName: delivery.driverName,
      driverPhone: delivery.driverPhone,
      orderCode: delivery.supplierOrder.order.code,
      buyerName: delivery.supplierOrder.order.buyerName,
      phone: delivery.supplierOrder.order.phone,
      total: delivery.supplierOrder.total,
    }));
  }

  async update(
    user: AuthUser,
    id: string,
    data: { status?: DeliveryStatus; driverName?: string; driverPhone?: string },
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { supplierOrder: { include: { order: true } } },
    });
    if (!delivery) throw new NotFoundException("Хүргэлт олдсонгүй");
    if (user.role !== "ADMIN" && delivery.supplierOrder.supplierId !== user.supplierId) {
      throw new ForbiddenException("Зөвхөн өөрийн хүргэлтийг өөрчилнө");
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === DeliveryStatus.IN_TRANSIT ? { dispatchedAt: new Date() } : {}),
        ...(data.status === DeliveryStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
      },
    });

    if (data.status && delivery.supplierOrder.order.userId) {
      await this.notifications.push({
        userId: delivery.supplierOrder.order.userId,
        type: NotificationType.DELIVERY,
        title: `Хүргэлт ${delivery.trackingCode}`,
        body: `Хүргэлтийн төлөв "${data.status}" боллоо.`,
        link: `/track?code=${delivery.trackingCode}`,
      });
    }

    return updated;
  }
}
