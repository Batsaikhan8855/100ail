"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { USER_ROLE } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";
import {
  Badge,
  Cell,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  PageHeader,
  Panel,
  PanelHeader,
  Row,
  Select,
  Table,
} from "@/components/ui";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
  _count: { orders: number };
}

interface SupplierOption {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [role, setRole] = useState("");
  const users = useResource<AdminUser[]>(`/users${role ? `?role=${role}` : ""}`);
  const suppliers = useResource<SupplierOption[]>("/suppliers");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = (users.data ?? []).filter((user) => {
    if (query.trim() === "") return true;
    const needle = query.trim().toLowerCase();
    return (
      user.name.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle)
    );
  });

  const assign = async (userId: string, supplierId: string) => {
    setBusy(userId);
    setError(null);
    try {
      await apiPatch(`/users/${userId}/supplier`, {
        supplierId: supplierId === "" ? null : supplierId,
      });
      users.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Хэрэглэгч"
        description="Хэрэглэгчийг нийлүүлэгчид харьяалуулснаар нийлүүлэгчийн эрх нээгдэнэ."
      />

      {error ? (
        <div className="mb-4">
          <ErrorNote text={error} />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Хэрэглэгчид"
          meta={`${formatNumber(rows.length)} хэрэглэгч`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Нэр, и-мэйл"
                className="w-44"
              />
              <Select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-40"
              >
                <option value="">Бүх эрх</option>
                {Object.entries(USER_ROLE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {users.loading ? (
          <Loading />
        ) : users.error ? (
          <div className="p-4">
            <ErrorNote text={users.error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text="Хэрэглэгч олдсонгүй" />
        ) : (
          <Table
            head={["Нэр", "Холбоо барих", "Эрх", "Захиалга", "Бүртгүүлсэн", "Нийлүүлэгч"]}
          >
            {rows.map((user) => (
              <Row key={user.id}>
                <Cell>
                  <div className="text-white">{user.name}</div>
                  <div className="text-[12px] text-mute-dim">{user.email}</div>
                </Cell>
                <Cell>
                  <div>{user.phone ?? "—"}</div>
                  {user.organization ? (
                    <div className="text-[12px] text-mute-dim">
                      {user.organization.name}
                    </div>
                  ) : null}
                </Cell>
                <Cell>
                  <Badge tone={user.role === "ADMIN" ? "info" : "neutral"}>
                    {USER_ROLE[user.role] ?? user.role}
                  </Badge>
                </Cell>
                <Cell align="right">{formatNumber(user._count.orders)}</Cell>
                <Cell>
                  <span className="text-[12px] text-mute">
                    {formatDate(user.createdAt)}
                  </span>
                </Cell>
                <Cell>
                  <Select
                    value={user.supplier?.id ?? ""}
                    disabled={busy === user.id || user.role === "ADMIN"}
                    onChange={(event) => assign(user.id, event.target.value)}
                    className="w-48"
                  >
                    <option value="">— харьяалалгүй —</option>
                    {(suppliers.data ?? []).map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Select>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
