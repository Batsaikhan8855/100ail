"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "./cart-context";
import { useFavorites } from "./favorites-context";
import { useSession } from "./session";
import { SiteHeader } from "./site-header";
import { Panel, PanelHeader } from "./ui";

export function AuthView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, user } = useSession();
  // Зочны сагс нэвтрэхэд серверт нэгддэг тул шинэчилж авна
  const { reload: reloadCart } = useCart();
  const { reload: reloadFavorites } = useFavorites();
  // URL-аас уншина. Толгойн "Нэвтрэх"/"Бүртгүүлэх" товч дарахад Next
  // энэ компонентыг дахин ачаалдаггүй тул зөвхөн эхлэх утга болгож
  // уншвал форм солигдохгүй үлддэг байв.
  const urlMode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(urlMode);
  useEffect(() => {
    setMode(urlMode);
  }, [urlMode]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password);
      } else {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || undefined,
        });
      }
      await reloadCart();
      await reloadFavorites();
      // Хаанаас нэвтэрсэн бол тийш нь буцаана (жишээ нь checkout дундаас)
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/account/orders");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader activeNav="" />

      <main className="mx-auto max-w-[440px] px-4 py-10">
        <Panel>
          <PanelHeader
            title={mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            meta={user ? user.email : undefined}
          />

          <form onSubmit={submit} className="flex flex-col gap-3 px-4 py-4">
            {mode === "register" ? (
              <>
                <Field
                  label="Нэр"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  required
                />
                <Field
                  label="Утас"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  type="tel"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  placeholder="9911-2233"
                />
              </>
            ) : null}

            <Field
              label={mode === "login" ? "И-мэйл эсвэл утас" : "И-мэйл"}
              // Нэвтрэхэд утасны дугаар ч болно тул `email` төрлийн
              // хөтчийн шалгалт саад болно
              type={mode === "login" ? "text" : "email"}
              name={mode === "login" ? "username" : "email"}
              autoComplete={mode === "login" ? "username" : "email"}
              inputMode={mode === "login" ? "text" : "email"}
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              placeholder={
                mode === "login" ? "нэр@жишээ.mn эсвэл 99112233" : undefined
              }
              required
            />
            <Field
              label="Нууц үг"
              type="password"
              name="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              required
            />

            {error ? (
              <p className="rounded-md border border-[#7a3030] bg-[#2c1717] px-3 py-2 text-[12.5px] text-[#f08585]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-md bg-brand px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi disabled:opacity-60"
            >
              {busy
                ? "Түр хүлээнэ үү…"
                : mode === "login"
                  ? "Нэвтрэх"
                  : "Бүртгүүлэх"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="text-[12.5px] text-mute transition-colors hover:text-white"
            >
              {mode === "login"
                ? "Шинэ хэрэглэгч? Бүртгүүлэх"
                : "Бүртгэлтэй юу? Нэвтрэх"}
            </button>
          </form>

          <p className="border-t border-ink-700 px-4 py-3.5 text-[12px] text-mute-dim">
            Нэвтрэхгүйгээр ч захиалга хийх боломжтой.{" "}
            <Link href="/" className="text-brand hover:underline">
              Каталог руу буцах
            </Link>
          </p>
        </Panel>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  name,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email";
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-mute">{label}</span>
      <input
        type={type}
        // name/autoComplete байхгүй бол хөтөч талбаруудыг таамаглаж
        // утасны дугаарыг и-мэйл нүдэнд бөглөчихдөг байв
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 rounded-md border border-ink-700 bg-ink-900 px-3 text-[13.5px] text-white outline-none placeholder:text-mute-dim focus:border-ink-600"
      />
    </label>
  );
}
