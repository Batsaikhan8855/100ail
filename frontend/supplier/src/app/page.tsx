"use client";

import { formatNumber, formatPrice } from "@/lib/format";
import { SUPPLIER_ORDER_STATUS } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import { BoxIcon, LayersIcon, WalletIcon } from "@/components/icons";
import {
  BarChart,
  Cell,
  EmptyState,
  ErrorNote,
  Loading,
  Money,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  StatCard,
  Table,
} from "@/components/ui";

interface SupplierReport {
  totals: {
    sales: number;
    orders: number;
    newOrders: number;
    commission: number;
    payout: number;
    activeOffers: number;
    stock: number;
  };
  byStatus: { status: string; count: number }[];
  salesByDay: { date: string; total: number }[];
  topProducts: { name: string; qty: number; total: number }[];
}

interface LowStockRow {
  productName: string;
  warehouse: string;
  quantity: number;
  unit: string;
}

export default function DashboardPage() {
  const report = useResource<SupplierReport>("/reports/supplier");
  const lowStock = useResource<LowStockRow[]>("/inventory/low-stock?threshold=100");

  if (report.loading) return <Loading />;
  if (report.error) return <ErrorNote text={report.error} />;
  if (!report.data) return null;

  const { totals, byStatus, salesByDay, topProducts } = report.data;

  return (
    <>
      <PageHeader
        title="Хяналтын самбар"
        description="Борлуулалт, захиалга, шимтгэлийн товч байдал"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Нийт борлуулалт"
          value={formatPrice(totals.sales)}
          hint={`${formatNumber(totals.orders)} захиалга`}
          icon={<WalletIcon className="h-[18px] w-[18px]" />}
        />
        <StatCard
          label="Шинэ захиалга"
          value={formatNumber(totals.newOrders)}
          hint="Баталгаажуулах шаардлагатай"
        />
        <StatCard
          label="Платформын шимтгэл"
          value={formatPrice(totals.commission)}
          hint={`Гарт үлдэх: ${formatPrice(totals.payout)}`}
        />
        <StatCard
          label="Идэвхтэй санал"
          value={formatNumber(totals.activeOffers)}
          hint={`Нийт үлдэгдэл: ${formatNumber(totals.stock)}`}
          icon={<BoxIcon className="h-[18px] w-[18px]" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Өдөр тутмын борлуулалт" meta="Сүүлийн захиалгууд" />
          <BarChart data={salesByDay} />
        </Panel>

        <Panel>
          <PanelHeader title="Захиалгын төлөв" />
          <div className="space-y-2 px-4 py-3.5">
            {byStatus.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-[#c2c7cf]">
                  {SUPPLIER_ORDER_STATUS[row.status]?.label ?? row.status}
                </span>
                <span className="tabular-nums text-white">{row.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Хамгийн их борлуулалттай бараа" />
          {topProducts.length === 0 ? (
            <EmptyState text="Борлуулалт бүртгэгдээгүй байна" />
          ) : (
            <Table head={["Бараа", "Тоо", "Дүн"]}>
              {topProducts.map((row) => (
                <Row key={row.name}>
                  <Cell>{row.name}</Cell>
                  <Cell align="right">{formatNumber(row.qty)}</Cell>
                  <Cell align="right">
                    <Money value={row.total} />
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Дуусч буй үлдэгдэл"
            meta="100-аас доош"
            action={<LayersIcon className="h-[18px] w-[18px] text-mute-dim" />}
          />
          {lowStock.loading ? (
            <Loading />
          ) : (lowStock.data ?? []).length === 0 ? (
            <EmptyState text="Бүх барааны үлдэгдэл хангалттай" />
          ) : (
            <Table head={["Бараа", "Агуулах", "Үлдэгдэл"]}>
              {(lowStock.data ?? []).map((row, index) => (
                <Row key={`${row.productName}-${row.warehouse}-${index}`}>
                  <Cell>{row.productName}</Cell>
                  <Cell>{row.warehouse}</Cell>
                  <Cell align="right">
                    <span className="tabular-nums text-brand-hi">
                      {formatNumber(row.quantity)} {row.unit}
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
