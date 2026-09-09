import { ForbiddenException, Injectable } from "@nestjs/common";
import { CommissionStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

/** Платформын 2%-ийн шимтгэлийн бүртгэл (баримтын 6, 10-р хэсэг) */
@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async forSupplier(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    const rows = await this.prisma.commissionLedger.findMany({
      where: { supplierId: user.supplierId },
      include: { supplierOrder: true },
      orderBy: { createdAt: "desc" },
    });

    const accrued = rows
      .filter((row) => row.status === CommissionStatus.ACCRUED)
      .reduce((sum, row) => sum + row.amount, 0);
    const settled = rows
      .filter((row) => row.status === CommissionStatus.SETTLED)
      .reduce((sum, row) => sum + row.amount, 0);
    const sales = rows.reduce((sum, row) => sum + row.base, 0);

    return {
      summary: {
        sales,
        commission: accrued + settled,
        unpaid: accrued,
        settled,
        payout: sales - (accrued + settled),
      },
      rows: rows.map((row) => ({
        id: row.id,
        orderCode: row.supplierOrder.code,
        base: row.base,
        rate: row.rate,
        amount: row.amount,
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  }

  /** Админ: бүх нийлүүлэгчийн шимтгэлийн нэгдсэн тайлан */
  async overview() {
    const rows = await this.prisma.commissionLedger.findMany({
      include: { supplier: true },
    });

    const bySupplier = new Map<string, { name: string; sales: number; commission: number }>();
    for (const row of rows) {
      const current = bySupplier.get(row.supplierId) ?? {
        name: row.supplier.name,
        sales: 0,
        commission: 0,
      };
      current.sales += row.base;
      current.commission += row.amount;
      bySupplier.set(row.supplierId, current);
    }

    return {
      totalSales: rows.reduce((sum, row) => sum + row.base, 0),
      totalCommission: rows.reduce((sum, row) => sum + row.amount, 0),
      unpaid: rows
        .filter((row) => row.status === CommissionStatus.ACCRUED)
        .reduce((sum, row) => sum + row.amount, 0),
      suppliers: [...bySupplier.entries()]
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.commission - a.commission),
    };
  }

  /** Админ: шимтгэлийн бүх мөр, төлөвөөр шүүх боломжтой */
  async listAll(status?: CommissionStatus) {
    const rows = await this.prisma.commissionLedger.findMany({
      where: status ? { status } : {},
      include: {
        supplier: { select: { id: true, name: true } },
        supplierOrder: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return rows.map((row) => ({
      id: row.id,
      supplier: row.supplier,
      orderCode: row.supplierOrder.code,
      base: row.base,
      rate: row.rate,
      amount: row.amount,
      status: row.status,
      settledAt: row.settledAt,
      createdAt: row.createdAt,
    }));
  }

  settle(id: string) {
    return this.prisma.commissionLedger.update({
      where: { id },
      data: { status: CommissionStatus.SETTLED, settledAt: new Date() },
    });
  }
}
