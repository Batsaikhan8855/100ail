/** Мянгатын таслалтай тоо: 1240 -> "1,240" */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US").format(value);

/** Төгрөгийн үнэ: 24900 -> "24,900₮" */
export const formatPrice = (value: number): string =>
  `${formatNumber(value)}₮`;

/** Огноо: 2026-09-09T... -> "09.09.2026" */
export const formatDate = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

/** Огноо ба цаг: "09.09.2026 14:20" */
export const formatDateTime = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${formatDate(date)} ${new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
};

/** Хувь: 0.02 -> "2%" */
export const formatPercent = (rate: number): string =>
  `${Math.round(rate * 1000) / 10}%`;
