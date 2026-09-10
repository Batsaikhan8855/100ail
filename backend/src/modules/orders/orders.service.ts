import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeliveryMethod,
  DeliveryStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  SupplierOrderStatus,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CITY_POINTS } from "../deliveries/route";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { CartsService, type CartOwner } from "../carts/carts.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateOrderDto } from "./dto";

const orderInclude = {
  supplierOrders: {
    include: {
      supplier: true,
      items: true,
      delivery: true,
      commission: true,
    },
  },
  payments: true,
  organization: true,
} satisfies Prisma.OrderInclude;

/** Захиалгын дугаар: 100A-XXXXXX */
const orderCode = (): string =>
  `100A-${Date.now().toString(36).toUpperCase().slice(-6)}`;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Сагснаас захиалга үүсгэнэ.
   *
   * Нэг захиалга нийлүүлэгч тус бүрээр дэд захиалгад хуваагдаж,
   * тус бүрд нь хүргэлт, 2%-ийн шимтгэлийн бүртгэл үүснэ
   * (архитектурын баримтын 6, 10-р хэсэг).
   */
  async createFromCart(owner: CartOwner, dto: CreateOrderDto) {
    const cart = await this.carts.get(owner);
    if (cart.lines.length === 0) throw new BadRequestException("Сагс хоосон байна");

    const pickup = dto.deliveryMethod === DeliveryMethod.PICKUP;
    const rate = Number(this.config.get("PLATFORM_COMMISSION_RATE", 0.02));
    const code = orderCode();

    const goodsTotal = cart.goodsTotal;
    const deliveryTotal = pickup ? 0 : cart.deliveryTotal;

    // Байгууллагын нэхэмжлэх хүсвэл байгууллагыг бүртгэнэ
    let organizationId = dto.organizationId ?? null;
    if (!organizationId && dto.companyName && dto.companyRegNo) {
      const organization = await this.prisma.organization.upsert({
        where: { regNo: dto.companyRegNo },
        update: { name: dto.companyName },
        create: { name: dto.companyName, regNo: dto.companyRegNo, phone: dto.phone },
      });
      organizationId = organization.id;
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          code,
          userId: owner.userId ?? null,
          organizationId,
          buyerName: dto.buyerName,
          phone: dto.phone,
          city: dto.city,
          district: dto.district,
          address: dto.address,
          note: dto.note,
          deliveryMethod: dto.deliveryMethod ?? DeliveryMethod.DELIVERY,
          paymentMethod: dto.paymentMethod ?? "QPAY",
          goodsTotal,
          deliveryTotal,
          total: goodsTotal + deliveryTotal,
        },
      });

      for (const [index, group] of cart.groups.entries()) {
        const deliveryPrice = pickup ? 0 : group.deliveryPrice;
        const supplierOrder = await tx.supplierOrder.create({
          data: {
            code: `${code}-${index + 1}`,
            orderId: created.id,
            supplierId: group.supplierId,
            goodsTotal: group.goodsTotal,
            deliveryPrice,
            total: group.goodsTotal + deliveryPrice,
            items: {
              create: group.lines.map((line) => ({
                offerId: line.offerId,
                productName: line.productName,
                supplierName: line.supplierName,
                unitPrice: line.unitPrice,
                qty: line.qty,
                unit: line.unit,
                lineTotal: line.lineTotal,
              })),
            },
          },
        });

        // Үлдэгдлийг агуулах тус бүрээс нөөцөлнө
        for (const line of group.lines) {
          await this.reserveStock(tx, line.offerId, line.qty);
        }

        if (!pickup) {
          // Замын эхлэл нь ачаа гарах агуулах, төгсгөл нь хүргэх хаяг.
          // Хаягийн координат байхгүй бол хотын төвөөр орлуулна —
          // хянах зураг дээр чиглэл харагдахад хангалттай.
          const warehouse = await tx.warehouse.findFirst({
            where: {
              supplierId: group.supplierId,
              lat: { not: null },
              lng: { not: null },
            },
          });
          const city = CITY_POINTS[dto.city] ?? CITY_POINTS["Улаанбаатар"];

          await tx.delivery.create({
            data: {
              supplierOrderId: supplierOrder.id,
              trackingCode: `${supplierOrder.code}-D`,
              address: dto.address,
              city: dto.city,
              status: DeliveryStatus.PENDING,
              originLat: warehouse?.lat ?? city.lat,
              originLng: warehouse?.lng ?? city.lng,
              destLat: dto.lat ?? city.lat + 0.045,
              destLng: dto.lng ?? city.lng + 0.055,
            },
          });
        }

        // Платформын шимтгэл: барааны дүнгээс, хүргэлтийн хураамжийг оруулахгүй
        const commissionAmount = Math.round(group.goodsTotal * rate);
        await tx.commissionLedger.create({
          data: {
            supplierOrderId: supplierOrder.id,
            supplierId: group.supplierId,
            rate,
            base: group.goodsTotal,
            amount: commissionAmount,
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: created.id,
          method: dto.paymentMethod ?? "QPAY",
          amount: goodsTotal + deliveryTotal,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUniqueOrThrow({
        where: { id: created.id },
        include: orderInclude,
      });
    });

    await this.notifyParticipants(order.id, owner.userId ?? null);
    return this.map(order);
  }

  /** Агуулахуудаас дарааллаар нөөцөлнө; хүрэлцэхгүй бол алдаа буцаана */
  private async reserveStock(
    tx: Prisma.TransactionClient,
    offerId: string,
    qty: number,
  ) {
    const rows = await tx.inventory.findMany({
      where: { offerId },
      orderBy: { quantity: "desc" },
    });

    let remaining = qty;
    for (const row of rows) {
      if (remaining <= 0) break;
      const available = row.quantity - row.reserved;
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      await tx.inventory.update({
        where: { id: row.id },
        data: { reserved: row.reserved + take },
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException("Үлдэгдэл хүрэлцэхгүй байна");
    }
  }

  private async notifyParticipants(orderId: string, userId: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { supplierOrders: { include: { supplier: true } } },
    });
    if (!order) return;

    if (userId) {
      await this.notifications.push({
        userId,
        type: NotificationType.ORDER,
        title: `Захиалга ${order.code} үүслээ`,
        body: `${order.supplierOrders.length} нийлүүлэгчид захиалга илгээгдлээ.`,
        link: `/orders/${order.code}`,
      });
    }

    for (const supplierOrder of order.supplierOrders) {
      await this.notifications.pushToSupplier(
        supplierOrder.supplierId,
        `Шинэ захиалга ${supplierOrder.code}`,
        `${supplierOrder.total.toLocaleString("en-US")}₮ дүнтэй захиалга ирлээ.`,
        "/orders",
      );
    }
  }

  map(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      buyerName: order.buyerName,
      phone: order.phone,
      city: order.city,
      district: order.district,
      address: order.address,
      note: order.note,
      deliveryMethod: order.deliveryMethod,
      paymentMethod: order.paymentMethod,
      goodsTotal: order.goodsTotal,
      deliveryTotal: order.deliveryTotal,
      total: order.total,
      createdAt: order.createdAt,
      organization: order.organization
        ? { id: order.organization.id, name: order.organization.name, regNo: order.organization.regNo }
        : null,
      payment: order.payments[0]
        ? {
            id: order.payments[0].id,
            method: order.payments[0].method,
            status: order.payments[0].status,
            amount: order.payments[0].amount,
            paidAt: order.payments[0].paidAt,
          }
        : null,
      supplierOrders: order.supplierOrders.map((supplierOrder) => ({
        id: supplierOrder.id,
        code: supplierOrder.code,
        status: supplierOrder.status,
        supplier: {
          id: supplierOrder.supplier.id,
          slug: supplierOrder.supplier.slug,
          name: supplierOrder.supplier.name,
        },
        goodsTotal: supplierOrder.goodsTotal,
        deliveryPrice: supplierOrder.deliveryPrice,
        total: supplierOrder.total,
        items: supplierOrder.items,
        delivery: supplierOrder.delivery,
        commission: supplierOrder.commission,
      })),
    };
  }

  /** Худалдан авагчийн захиалгын түүх */
  async mine(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => this.map(order));
  }

  async byCode(code: string) {
    const order = await this.prisma.order.findUnique({
      where: { code },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("Захиалга олдсонгүй");
    return this.map(order);
  }

  /** Нийлүүлэгчид харагдах дэд захиалгууд */
  async forSupplier(user: AuthUser, status?: SupplierOrderStatus) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const supplierOrders = await this.prisma.supplierOrder.findMany({
      where: { supplierId: user.supplierId, ...(status ? { status } : {}) },
      include: { order: true, items: true, delivery: true, commission: true },
      orderBy: { createdAt: "desc" },
    });

    return supplierOrders.map((supplierOrder) => ({
      id: supplierOrder.id,
      code: supplierOrder.code,
      status: supplierOrder.status,
      goodsTotal: supplierOrder.goodsTotal,
      deliveryPrice: supplierOrder.deliveryPrice,
      total: supplierOrder.total,
      createdAt: supplierOrder.createdAt,
      commission: supplierOrder.commission,
      delivery: supplierOrder.delivery,
      items: supplierOrder.items,
      buyer: {
        name: supplierOrder.order.buyerName,
        phone: supplierOrder.order.phone,
        city: supplierOrder.order.city,
        address: supplierOrder.order.address,
        note: supplierOrder.order.note,
      },
      orderCode: supplierOrder.order.code,
    }));
  }

  /** Дэд захиалгын төлөв солих (нийлүүлэгч, админ) */
  async updateSupplierOrderStatus(
    user: AuthUser,
    supplierOrderId: string,
    status: SupplierOrderStatus,
  ) {
    const supplierOrder = await this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
      include: { order: true },
    });
    if (!supplierOrder) throw new NotFoundException("Дэд захиалга олдсонгүй");
    if (user.role !== UserRole.ADMIN && supplierOrder.supplierId !== user.supplierId) {
      throw new ForbiddenException("Зөвхөн өөрийн захиалгыг өөрчилнө");
    }

    const updated = await this.prisma.supplierOrder.update({
      where: { id: supplierOrderId },
      data: { status },
    });

    // Хүргэлтийн төлөвийг дэд захиалгын төлөвтэй уялдуулна
    const deliveryStatus: Partial<Record<SupplierOrderStatus, DeliveryStatus>> = {
      SHIPPED: DeliveryStatus.IN_TRANSIT,
      DELIVERED: DeliveryStatus.DELIVERED,
      CANCELLED: DeliveryStatus.FAILED,
    };
    const nextDelivery = deliveryStatus[status];
    if (nextDelivery) {
      await this.prisma.delivery.updateMany({
        where: { supplierOrderId },
        data: {
          status: nextDelivery,
          ...(status === "SHIPPED" ? { dispatchedAt: new Date() } : {}),
          ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        },
      });
    }

    // Бүх дэд захиалга хүргэгдсэн бол үндсэн захиалгыг хаана
    const siblings = await this.prisma.supplierOrder.findMany({
      where: { orderId: supplierOrder.orderId },
    });
    if (siblings.every((item) => item.status === SupplierOrderStatus.DELIVERED)) {
      await this.prisma.order.update({
        where: { id: supplierOrder.orderId },
        data: { status: OrderStatus.COMPLETED },
      });
    }

    if (supplierOrder.order.userId) {
      await this.notifications.push({
        userId: supplierOrder.order.userId,
        type: NotificationType.ORDER,
        title: `Захиалга ${supplierOrder.code}`,
        body: `Төлөв "${status}" болж өөрчлөгдлөө.`,
        link: `/orders/${supplierOrder.order.code}`,
      });
    }

    return updated;
  }

  /** Админ: бүх захиалга */
  async listAll(take = 50) {
    const orders = await this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
    return orders.map((order) => this.map(order));
  }
}
