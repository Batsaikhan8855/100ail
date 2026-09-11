"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertIcon,
  BoxIcon,
  ChartIcon,
  FileIcon,
  LayersIcon,
  LogoMark,
  LogoutIcon,
  ShieldIcon,
  TagIcon,
  ImageIcon,
  UsersIcon,
  WalletIcon,
} from "./icons";
import { NotificationBell } from "./notifications";
import { useSession } from "./session";
import { Button, ErrorNote, Field, Input, Panel } from "./ui";

const NAV = [
  { href: "/", label: "Хяналтын самбар", Icon: ChartIcon },
  { href: "/orders", label: "Захиалга, төлбөр", Icon: FileIcon },
  { href: "/suppliers", label: "Нийлүүлэгч", Icon: ShieldIcon },
  { href: "/products", label: "Бүтээгдэхүүн", Icon: BoxIcon },
  { href: "/categories", label: "Ангилал, үзүүлэлт", Icon: LayersIcon },
  { href: "/users", label: "Хэрэглэгч", Icon: UsersIcon },
  { href: "/commissions", label: "Шимтгэл", Icon: WalletIcon },
  { href: "/payouts", label: "Татан авалт", Icon: WalletIcon },
  { href: "/disputes", label: "Буцаалт, маргаан", Icon: AlertIcon },
  { href: "/promotions", label: "Хөнгөлөлтийн код", Icon: TagIcon },
  { href: "/banners", label: "Сурталчилгаа", Icon: ImageIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useSession();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-mute">
        Ачаалж байна…
      </div>
    );
  }

  if (!user) return <LoginView />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900 md:flex">
        <div className="flex items-center gap-2.5 border-b border-ink-700 px-4 py-4">
          <LogoMark className="h-7 w-7" />
          <div>
            <div className="text-[14px] font-semibold text-white">BarilgaHUB</div>
            <div className="text-[11.5px] text-mute-dim">Админ панел</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ href, label, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-brand/12 text-brand"
                    : "text-[#c2c7cf] hover:bg-ink-800 hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-700 p-3">
          <div className="truncate text-[13px] text-white">{user.name}</div>
          <div className="truncate text-[11.5px] text-mute-dim">
            {user.email}
          </div>
          <Button size="sm" className="mt-2 w-full" onClick={logout}>
            <LogoutIcon className="h-4 w-4" />
            Гарах
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="text-[14px] font-semibold text-white">
              Админ панел
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button size="sm" onClick={logout}>
              Гарах
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-ink-700 bg-ink-900 px-2 py-2 md:hidden">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] ${
                  active ? "bg-brand/12 text-brand" : "text-[#c2c7cf]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden justify-end border-b border-ink-700 bg-ink-900 px-6 py-2 md:flex">
          <NotificationBell />
        </div>

        <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

/** Нэвтрэх хуудас: зөвхөн админы эрхээр орно */
function LoginView() {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Panel className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div>
            <div className="text-[15px] font-semibold text-white">BarilgaHUB</div>
            <div className="text-[12px] text-mute-dim">Админ панел</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="И-мэйл">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@barilgahub.mn"
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Нууц үг">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          {error ? <ErrorNote text={error} /> : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={busy}
          >
            {busy ? "Шалгаж байна…" : "Нэвтрэх"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
