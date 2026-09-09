"use client";

import Link from "next/link";
import { formatNumber, formatPrice } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { AlertIcon, BoxIcon, UsersIcon, WalletIcon } from "@/components/icons";
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

interface AdminReport {
  totals: {
    gmv: number;
    orders: number;
    pendingOrders: number;
    supplierOrders: number;
    commission: number;
    commissionBase: number;
    products: number;
    suppliers: number;
    users: number;
    openDisputes: number;
  };
  salesByDay: { date: string; total: number }[];
  topSuppliers: { supplierId: string; name: string; total: number; orders: number }[];
}

export default function AdminDashboardPage() {
  const report = useResource<AdminReport>("/reports/admin");

  if (report.loading) return <Loading />;
  if (report.error) return <ErrorNote text={report.error} />;
  if (!report.data) return null;

  const { totals, salesByDay, topSuppliers } = report.data;

  return (
    <>
      <PageHeader
        title="Хяналтын самбар"
        description="Платформын нийт эргэлт, шимтгэл, нийлүүлэгчийн байдал"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Нийт эргэлт (GMV)"
          value={formatPrice(totals.gmv)}
          hint={`${formatNumber(totals.orders)} захиалга`}
          icon={<WalletIcon className="h-[18px] w-[18px]" />}
        />
        <StatCard
          label="Платформын шимтгэл"
          value={formatPrice(totals.commission)}
          hint={`Суурь дүн: ${formatPrice(totals.commissionBase)}`}
        />
        <StatCard
          label="Төлбөр хүлээгдэж буй"
          value={formatNumber(totals.pendingOrders)}
          hint={`${formatNumber(totals.supplierOrders)} дэд захиалга`}
        />
        <StatCard
          label="Нээлттэй маргаан"
          value={formatNumber(totals.openDisputes)}
          hint="Шийдвэрлэх шаардлагатай"
          icon={<AlertIcon className="h-[18px] w-[18px]" />}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Идэвхтэй бүтээгдэхүүн"
          value={formatNumber(totals.products)}
          icon={<BoxIcon className="h-[18px] w-[18px]" />}
        />
        <StatCard label="Нийлүүлэгч" value={formatNumber(totals.suppliers)} />
        <StatCard
          label="Хэрэглэгч"
          value={formatNumber(totals.users)}
          icon={<UsersIcon className="h-[18px] w-[18px]" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Өдөр тутмын борлуулалт" meta="Сүүлийн 30 хоног" />
          <BarChart data={salesByDay} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Тэргүүлэх нийлүүлэгч"
            action={
              <Link
                href="/suppliers"
                className="text-[12px] text-brand hover:text-brand-hi"
              >
                Бүгд
              </Link>
            }
          />
          {topSuppliers.length === 0 ? (
            <EmptyState text="Борлуулалт бүртгэгдээгүй" />
          ) : (
            <Table head={["Нийлүүлэгч", "Захиалга", "Дүн"]}>
              {topSuppliers.map((supplier) => (
                <Row key={supplier.supplierId}>
                  <Cell>{supplier.name}</Cell>
                  <Cell align="right">{formatNumber(supplier.orders)}</Cell>
                  <Cell align="right">
                    <Money value={supplier.total} />
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
