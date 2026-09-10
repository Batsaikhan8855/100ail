/** Мянгатын таслалтай тоо: 1240 -> "1,240" */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US").format(value);

/** Төгрөгийн үнэ: 24900 -> "24,900₮" */
export const formatPrice = (value: number): string =>
  `${formatNumber(value)}₮`;

/** Огноо ба цаг: "09.09.2026 14:20" */
export const formatDateTime = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)} ${new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
};

/**
 * Ачааны жин: 36 -> "36 кг", 2400 -> "2.4 т".
 * Серверийн `common/logistics/formatWeight`-тай ижил дүрэм.
 */
export const formatWeight = (kg: number): string => {
  if (kg >= 1000) {
    const tonnes = kg / 1000;
    return `${tonnes >= 10 ? Math.round(tonnes) : Number(tonnes.toFixed(1))} т`;
  }
  return `${Math.round(kg * 10) / 10} кг`;
};
