"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { CheckIcon, StarIcon } from "./icons";
import { useSession } from "./session";

interface Eligibility {
  productId: string;
  canReview: boolean;
  alreadyReviewed: boolean;
  verifiedPurchase: boolean;
  supplierId: string | null;
  supplierName: string | null;
}

/**
 * Бараанд сэтгэгдэл, үнэлгээ үлдээх (баримтын 4.1 "үнэлгээ").
 *
 * Худалдан авалт хийсэн хэрэглэгчийн сэтгэгдлийг баталгаажсан гэж
 * тэмдэглэж, тухайн нийлүүлэгчийн дундаж үнэлгээнд тооцно.
 */
export function ReviewForm({ slug }: { slug: string }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const [state, setState] = useState<Eligibility | null>(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setState(null);
      return;
    }
    let cancelled = false;
    apiGet<Eligibility>(`/reviews/eligibility/${slug}`)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, slug, done]);

  if (!ready) return null;

  if (!user) {
    return (
      <p className="mt-4 rounded-md border border-ink-700 bg-ink-900 px-3.5 py-3 text-[12.5px] text-mute">
        Сэтгэгдэл үлдээхийн тулд{" "}
        <Link href="/login" className="text-brand hover:text-brand-hi">
          нэвтэрнэ үү
        </Link>
        .
      </p>
    );
  }

  if (done || state?.alreadyReviewed) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-md border border-[#2b6b45] bg-[#14291d] px-3.5 py-3 text-[12.5px] text-ok">
        <CheckIcon className="h-4 w-4" />
        Таны сэтгэгдэл бүртгэгдсэн. Баярлалаа.
      </p>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (text.trim().length < 3) {
      setError("Сэтгэгдлээ бичнэ үү");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiPost("/reviews", {
        productId: state?.productId,
        supplierId: state?.supplierId ?? undefined,
        authorName: user.name,
        rating,
        text: text.trim(),
      });
      setDone(true);
      setText("");
      // Сэтгэгдлийн жагсаалт server component-оос ирдэг тул дахин татна
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-md border border-ink-700 bg-ink-900 p-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-white">
          Сэтгэгдэл үлдээх
        </span>
        {state?.verifiedPurchase ? (
          <span className="rounded-full border border-[#2b6b45] bg-[#14291d] px-2.5 py-[3px] text-[11.5px] text-ok">
            Худалдан авалт баталгаажсан
            {state.supplierName ? ` · ${state.supplierName}` : ""}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`${index + 1} од`}
            onClick={() => setRating(index + 1)}
            onMouseEnter={() => setHover(index + 1)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <StarIcon
              className={`h-5 w-5 ${
                index < (hover || rating) ? "text-brand" : "text-ink-600"
              }`}
              fill="currentColor"
            />
          </button>
        ))}
        <span className="ml-1.5 text-[12px] text-mute">{rating}/5</span>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={800}
        placeholder="Чанар, хүргэлт, савлагааны талаар бичнэ үү"
        className="mt-2.5 w-full rounded-md border border-ink-600 bg-ink-950 px-3 py-2 text-[13px] text-white placeholder:text-mute-dim outline-none transition-colors focus:border-brand"
      />

      {error ? (
        <p className="mt-2 text-[12px] text-[#f08585]">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-2.5 rounded-md bg-brand px-4 py-2 text-[12.5px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-brand-hi disabled:opacity-50"
      >
        {busy ? "Илгээж байна…" : "Илгээх"}
      </button>
    </form>
  );
}
