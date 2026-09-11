import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { QpayClient } from "./qpay.client";

/**
 * Төлбөр. QPay-ийн хэрэглэгчийн мэдээлэл тохируулсан үед бодит нэхэмжлэх
 * үүсгэж, төлөлтийг QPay-ээс шалгаж баталгаажуулна. Тохиргоо байхгүй үед
 * хөгжүүлэлтэд зориулсан mock нэхэмжлэхээр ажиллана (баримтын 2-р хэсэг).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly callbackBase = (
    process.env.PUBLIC_API_URL ?? "http://localhost:4000/api"
  ).replace(/\/$/, "");

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly qpay: QpayClient,
  ) {}

  /** Захиалгад нэхэмжлэх үүсгэнэ. QPay идэвхтэй үед QR болон deeplink буцаана. */
  async createInvoice(orderCode: string, method?: PaymentMethod) {
    const order = await this.prisma.order.findUnique({
      where: { code: orderCode },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException("Захиалга олдсонгүй");

    const payment =
      order.payments.find((item) => item.status === PaymentStatus.PENDING) ??
      (await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: method ?? order.paymentMethod,
          amount: order.total,
          status: PaymentStatus.PENDING,
        },
      }));

    const chosenMethod = method ?? payment.method;

    if (this.qpay.enabled && chosenMethod === PaymentMethod.QPAY) {
      try {
        const invoice = await this.qpay.createInvoice({
          orderCode: order.code,
          amount: order.total,
          description: `BarilgaHUB захиалга ${order.code}`,
          callbackUrl: `${this.callbackBase}/payments/qpay/callback?payment=${payment.id}`,
        });

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { invoiceId: invoice.invoiceId, method: chosenMethod },
        });

        return {
          paymentId: payment.id,
          invoiceId: invoice.invoiceId,
          orderCode: order.code,
          amount: order.total,
          method: chosenMethod,
          qrText: invoice.qrText,
          qrImage: invoice.qrImage,
          urls: invoice.urls,
          status: payment.status,
          mode: "qpay" as const,
        };
      } catch (error) {
        // QPay унтарсан үед захиалга зогсохгүй байх ёстой тул mock руу шилжинэ
        this.logger.warn(`QPay нэхэмжлэх амжилтгүй: ${(error as Error).message}`);
      }
    }

    const invoiceId = payment.invoiceId ?? `INV-${payment.id.slice(-8).toUpperCase()}`;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { invoiceId, method: chosenMethod },
    });

    return {
      paymentId: payment.id,
      invoiceId,
      orderCode: order.code,
      amount: order.total,
      method: chosenMethod,
      qrText: `100AIL|${order.code}|${order.total}`,
      qrImage: null,
      urls: [],
      status: payment.status,
      mode: "mock" as const,
    };
  }

  /** Банк/QPay-ээс ирэх баталгаажуулалт */
  async confirm(invoiceId: string, transactionId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { invoiceId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException("Нэхэмжлэх олдсонгүй");
    if (payment.status === PaymentStatus.PAID) return payment;

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        transactionId: transactionId ?? `TX-${Date.now().toString(36).toUpperCase()}`,
        paidAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    if (payment.order.userId) {
      await this.notifications.push({
        userId: payment.order.userId,
        type: NotificationType.PAYMENT,
        title: `Төлбөр баталгаажлаа`,
        body: `${payment.order.code} захиалгын ${payment.amount.toLocaleString("en-US")}₮ төлөгдлөө.`,
        link: `/orders/${payment.order.code}`,
      });
    }

    return updated;
  }

  /**
   * QPay-ээс ирэх callback. Ирсэн мэдэгдэлд итгэлгүйгээр төлбөрийг
   * QPay-ийн `payment/check`-ээр шалгаад л баталгаажуулна.
   */
  async handleQpayCallback(paymentId?: string, invoiceId?: string) {
    const payment = paymentId
      ? await this.prisma.payment.findUnique({ where: { id: paymentId } })
      : invoiceId
        ? await this.prisma.payment.findFirst({ where: { invoiceId } })
        : null;
    if (!payment?.invoiceId) throw new NotFoundException("Төлбөр олдсонгүй");

    return this.verify(payment.id);
  }

  /** Төлбөрийн төлөвийг QPay-ээс шалгаж, төлөгдсөн бол баталгаажуулна */
  async verify(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Төлбөр олдсонгүй");
    if (payment.status === PaymentStatus.PAID) {
      return { status: payment.status, paid: true, amount: payment.amount };
    }

    if (!this.qpay.enabled || !payment.invoiceId) {
      return { status: payment.status, paid: false, amount: payment.amount };
    }

    const check = await this.qpay.checkPayment(payment.invoiceId);
    if (!check.paid) {
      return { status: payment.status, paid: false, amount: payment.amount };
    }

    await this.confirm(payment.invoiceId, check.transactionId ?? undefined);
    return { status: PaymentStatus.PAID, paid: true, amount: payment.amount };
  }

  async byOrder(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { code: orderCode },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
    if (!order) throw new NotFoundException("Захиалга олдсонгүй");
    return order.payments;
  }

  async refund(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Төлбөр олдсонгүй");
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Зөвхөн төлөгдсөн гүйлгээг буцаана");
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  get provider(): "qpay" | "mock" {
    return this.qpay.enabled ? "qpay" : "mock";
  }
}
