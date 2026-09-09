import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  OrderStatus,
  PayoutStatus,
  SupplierOrderStatus,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { NotificationsService } from "../notifications/notifications.service";

/** Төлбөр нь баталгаажсан захиалгууд л татан авалтад тооцогдоно */
const PAYABLE_ORDER_STATUS: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
];

/** Хүсэлт гаргасан болон олгосон дүн хоёулаа үлдэгдлээс хасагдана */
const RESERVED_STATUS: PayoutStatus[] = [
  PayoutStatus.REQUESTED,
  PayoutStatus.APPROVED,
  PayoutStatus.PAID,
];

export interface BankAccountInput {
  bankName: string;
  accountNo: string;
  accountName: string;
}

/**
 * Нийлүүлэгчийн мөнгө татан авах урсгал (баримтын 4.2 "төлбөр татан авах").
 *
 * Татан авах боломжтой үлдэгдэл = төлбөр нь баталгаажсан захиалгын дүн
 * − платформын 2%-ийн шимтгэл − өмнө нь хүсэлт гаргасан/олгосон дүн.
 */
@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private supplierIdOf(user: AuthUser): string {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    return user.supplierId;
  }

  /** Нийлүүлэгчийн тооцооны үлдэгдэл */
  async balance(supplierId: string) {
    const [supplierOrders, payouts] = await Promise.all([
      this.prisma.supplierOrder.findMany({
        where: {
          supplierId,
          status: { not: SupplierOrderStatus.CANCELLED },
          order: { status: { in: PAYABLE_ORDER_STATUS } },
        },
        include: { commission: true },
      }),
      this.prisma.payout.findMany({ where: { supplierId } }),
    ]);

    const earned = supplierOrders.reduce((sum, row) => sum + row.total, 0);
    const commission = supplierOrders.reduce(
      (sum, row) => sum + (row.commission?.amount ?? 0),
      0,
    );
    const requested = payouts
      .filter((row) => row.status === PayoutStatus.REQUESTED)
      .reduce((sum, row) => sum + row.amount, 0);
    const approved = payouts
      .filter((row) => row.status === PayoutStatus.APPROVED)
      .reduce((sum, row) => sum + row.amount, 0);
    const paid = payouts
      .filter((row) => row.status === PayoutStatus.PAID)
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      earned,
      commission,
      /** Шимтгэл хассан цэвэр орлого */
      net: earned - commission,
      requested,
      approved,
      paid,
      available: earned - commission - requested - approved - paid,
      orderCount: supplierOrders.length,
    };
  }

  async overview(user: AuthUser) {
    const supplierId = this.supplierIdOf(user);
    const [balance, account, rows] = await Promise.all([
      this.balance(supplierId),
      this.prisma.supplierBankAccount.findUnique({ where: { supplierId } }),
      this.prisma.payout.findMany({
        where: { supplierId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return { balance, account, rows };
  }

  async saveBankAccount(user: AuthUser, input: BankAccountInput) {
    const supplierId = this.supplierIdOf(user);
    const data = {
      bankName: input.bankName.trim(),
      accountNo: input.accountNo.trim(),
      accountName: input.accountName.trim(),
    };
    if (!data.bankName || !data.accountNo || !data.accountName) {
      throw new BadRequestException("Банк, данс, эзэмшигчийн нэрийг бүрэн бөглөнө");
    }

    return this.prisma.supplierBankAccount.upsert({
      where: { supplierId },
      create: { supplierId, ...data },
      update: data,
    });
  }

  /** Татан авах хүсэлт гаргах */
  async request(user: AuthUser, input: { amount: number; note?: string }) {
    const supplierId = this.supplierIdOf(user);
    const account = await this.prisma.supplierBankAccount.findUnique({
      where: { supplierId },
    });
    if (!account) {
      throw new BadRequestException("Эхлээд дансны мэдээллээ хадгална уу");
    }

    const amount = Math.round(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Дүн буруу байна");
    }

    const balance = await this.balance(supplierId);
    if (amount > balance.available) {
      throw new BadRequestException(
        `Татан авах боломжит үлдэгдэл ${balance.available.toLocaleString("en-US")}₮ байна`,
      );
    }

    const payout = await this.prisma.payout.create({
      data: {
        supplierId,
        amount,
        bankName: account.bankName,
        accountNo: account.accountNo,
        accountName: account.accountName,
        note: input.note?.trim() || null,
        requestedBy: user.id,
      },
    });

    await this.notifications.push({
      userId: user.id,
      type: NotificationType.PAYOUT,
      title: "Татан авах хүсэлт бүртгэгдлээ",
      body: `${amount.toLocaleString("en-US")}₮ татан авах хүсэлт админ руу илгээгдлээ.`,
      link: "/commissions",
    });

    return payout;
  }

  /** Нийлүүлэгч зөвхөн хүлээгдэж буй хүсэлтээ цуцална */
  async cancel(user: AuthUser, id: string) {
    const supplierId = this.supplierIdOf(user);
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout || payout.supplierId !== supplierId) {
      throw new NotFoundException("Хүсэлт олдсонгүй");
    }
    if (payout.status !== PayoutStatus.REQUESTED) {
      throw new BadRequestException("Зөвхөн хүлээгдэж буй хүсэлтийг цуцална");
    }

    return this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.REJECTED, note: "Нийлүүлэгч цуцаллаа" },
    });
  }

  /** Админ: бүх хүсэлт */
  async listAll(status?: PayoutStatus) {
    const rows = await this.prisma.payout.findMany({
      where: status ? { status } : {},
      include: { supplier: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    const pending = rows
      .filter((row) => row.status === PayoutStatus.REQUESTED)
      .reduce((sum, row) => sum + row.amount, 0);
    const paid = rows
      .filter((row) => row.status === PayoutStatus.PAID)
      .reduce((sum, row) => sum + row.amount, 0);

    return { summary: { pending, paid, total: rows.length }, rows };
  }

  /** Админ: төлөв шинэчлэх (батлах, шилжүүлсэн, татгалзах) */
  async updateStatus(
    id: string,
    input: { status: PayoutStatus; reference?: string; note?: string },
  ) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException("Хүсэлт олдсонгүй");
    if (payout.status === PayoutStatus.PAID) {
      throw new BadRequestException("Олгосон хүсэлтийг өөрчлөх боломжгүй");
    }

    const updated = await this.prisma.payout.update({
      where: { id },
      data: {
        status: input.status,
        reference: input.reference?.trim() || payout.reference,
        note: input.note?.trim() || payout.note,
        processedAt:
          input.status === PayoutStatus.PAID || input.status === PayoutStatus.REJECTED
            ? new Date()
            : payout.processedAt,
      },
    });

    const label: Record<PayoutStatus, string> = {
      REQUESTED: "хүлээгдэж байна",
      APPROVED: "батлагдлаа",
      PAID: "шилжүүлэг хийгдлээ",
      REJECTED: "татгалзлаа",
    };

    await this.notifications.pushToSupplier(
      payout.supplierId,
      `Татан авалт ${label[input.status]}`,
      `${payout.amount.toLocaleString("en-US")}₮ хүсэлтийн төлөв: ${label[input.status]}.`,
      "/commissions",
    );

    return updated;
  }
}
