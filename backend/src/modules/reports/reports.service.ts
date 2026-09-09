import { ForbiddenException, Injectable } from "@nestjs/common";
import { OrderStatus, SupplierOrderStatus } from "@prisma/client";
import { RedisService } from "../../common/cache/redis.service";
import { PrismaService } from "../../common/prisma.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

/** Тайлан, аналитик (баримтын 4.2, 4.3) */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisService,
  ) {}

  /** Админы самбар — Redis идэвхтэй үед 60 секунд cache-лэнэ */
  async adminDashboard() {
    const key = "reports:admin";
    const cached = await this.cache.get<AdminDashboard>(key);
    if (cached) return cached;

    const result = await this.computeAdminDashboard();
    await this.cache.set(key, result, 60);
    return result;
  }

  /** Нийлүүлэгчийн самбар — нийлүүлэгч тус бүрээр 30 секунд cache-лэнэ */
  async supplierDashboard(user: AuthUser) {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");

    const key = `reports:supplier:${user.supplierId}`;
    const cached = await this.cache.get<SupplierDashboard>(key);
    if (cached) return cached;

    const result = await this.computeSupplierDashboard(user.supplierId);
    await this.cache.set(key, result, 30);
    return result;
  }

  async computeAdminDashboard() {
    const [orders, supplierOrders, commissions, products, suppliers, users, disputes] =
      await Promise.all([
        this.prisma.order.findMany({ select: { total: true, status: true, createdAt: true } }),
        this.prisma.supplierOrder.findMany({
          select: { status: true, total: true, supplierId: true },
        }),
        this.prisma.commissionLedger.aggregate({ _sum: { amount: true, base: true } }),
        this.prisma.product.count({ where: { active: true } }),
        this.prisma.supplier.count(),
        this.prisma.user.count(),
        this.prisma.dispute.count({ where: { status: "OPEN" } }),
      ]);

    const gmv = orders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter((order) => order.status === OrderStatus.PENDING).length;

    // Сүүлийн 30 хоногийн өдөр тутмын борлуулалт
    const byDay = new Map<string, number>();
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    for (const order of orders) {
      if (order.createdAt < since) continue;
      const key = order.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + order.total);
    }

    const topSuppliers = await this.prisma.supplierOrder.groupBy({
      by: ["supplierId"],
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });
    const supplierNames = await this.prisma.supplier.findMany({
      where: { id: { in: topSuppliers.map((row) => row.supplierId) } },
      select: { id: true, name: true },
    });

    return {
      totals: {
        gmv,
        orders: orders.length,
        pendingOrders: pending,
        supplierOrders: supplierOrders.length,
        commission: commissions._sum.amount ?? 0,
        commissionBase: commissions._sum.base ?? 0,
        products,
        suppliers,
        users,
        openDisputes: disputes,
      },
      salesByDay: [...byDay.entries()]
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topSuppliers: topSuppliers.map((row) => ({
        supplierId: row.supplierId,
        name: supplierNames.find((s) => s.id === row.supplierId)?.name ?? "",
        total: row._sum.total ?? 0,
        orders: row._count._all,
      })),
    };
  }

  async computeSupplierDashboard(supplierId: string) {
    const [supplierOrders, commission, offers, inventory] = await Promise.all([
      this.prisma.supplierOrder.findMany({
        where: { supplierId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.commissionLedger.aggregate({
        where: { supplierId },
        _sum: { amount: true, base: true },
      }),
      this.prisma.offer.count({ where: { supplierId, active: true } }),
      this.prisma.inventory.aggregate({
        where: { offer: { supplierId } },
        _sum: { quantity: true },
      }),
    ]);

    const sales = supplierOrders.reduce((sum, row) => sum + row.total, 0);
    const byStatus = Object.values(SupplierOrderStatus).map((status) => ({
      status,
      count: supplierOrders.filter((row) => row.status === status).length,
    }));

    // Хамгийн их борлуулалттай бараа
    const productTotals = new Map<string, { qty: number; total: number }>();
    for (const supplierOrder of supplierOrders) {
      for (const item of supplierOrder.items) {
        const current = productTotals.get(item.productName) ?? { qty: 0, total: 0 };
        current.qty += item.qty;
        current.total += item.lineTotal;
        productTotals.set(item.productName, current);
      }
    }

    const byDay = new Map<string, number>();
    for (const supplierOrder of supplierOrders) {
      const key = supplierOrder.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + supplierOrder.total);
    }

    return {
      totals: {
        sales,
        orders: supplierOrders.length,
        newOrders: supplierOrders.filter((row) => row.status === SupplierOrderStatus.NEW).length,
        commission: commission._sum.amount ?? 0,
        payout: sales - (commission._sum.amount ?? 0),
        activeOffers: offers,
        stock: inventory._sum.quantity ?? 0,
      },
      byStatus,
      salesByDay: [...byDay.entries()]
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: [...productTotals.entries()]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    };
  }
}

export type AdminDashboard = Awaited<
  ReturnType<ReportsService["computeAdminDashboard"]>
>;
export type SupplierDashboard = Awaited<
  ReturnType<ReportsService["computeSupplierDashboard"]>
>;
