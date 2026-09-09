/** API-гийн enum-уудын монгол нэршил, өнгөний тохиргоо */

export type Tone = "neutral" | "info" | "warn" | "ok" | "bad";

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Төлбөр хүлээгдэж буй", tone: "warn" },
  PAID: { label: "Төлөгдсөн", tone: "info" },
  PROCESSING: { label: "Боловсруулж буй", tone: "info" },
  COMPLETED: { label: "Дууссан", tone: "ok" },
  CANCELLED: { label: "Цуцлагдсан", tone: "bad" },
};

export const SUPPLIER_ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  NEW: { label: "Шинэ", tone: "warn" },
  CONFIRMED: { label: "Баталгаажсан", tone: "info" },
  PACKING: { label: "Бэлтгэж буй", tone: "info" },
  SHIPPED: { label: "Замд гарсан", tone: "info" },
  DELIVERED: { label: "Хүргэгдсэн", tone: "ok" },
  CANCELLED: { label: "Цуцлагдсан", tone: "bad" },
};

/** Дэд захиалгын төлөвийн урагшлах дараалал */
export const SUPPLIER_ORDER_FLOW = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
] as const;

export const DELIVERY_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Хүлээгдэж буй", tone: "warn" },
  ASSIGNED: { label: "Жолооч хуваарилсан", tone: "info" },
  IN_TRANSIT: { label: "Замд яваа", tone: "info" },
  DELIVERED: { label: "Хүргэгдсэн", tone: "ok" },
  FAILED: { label: "Амжилтгүй", tone: "bad" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Хүлээгдэж буй", tone: "warn" },
  PAID: { label: "Төлөгдсөн", tone: "ok" },
  FAILED: { label: "Амжилтгүй", tone: "bad" },
  REFUNDED: { label: "Буцаагдсан", tone: "neutral" },
};

export const PAYMENT_METHOD: Record<string, string> = {
  QPAY: "QPay",
  CARD: "Карт",
  TRANSFER: "Данс хооронд",
};

export const DELIVERY_METHOD: Record<string, string> = {
  DELIVERY: "Хүргэлт",
  PICKUP: "Очиж авах",
};

export const COMMISSION_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACCRUED: { label: "Хуримтлагдсан", tone: "warn" },
  INVOICED: { label: "Нэхэмжилсэн", tone: "info" },
  SETTLED: { label: "Тооцоо хийгдсэн", tone: "ok" },
};

export const DISPUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Нээлттэй", tone: "warn" },
  IN_REVIEW: { label: "Хянаж буй", tone: "info" },
  RESOLVED: { label: "Шийдвэрлэсэн", tone: "ok" },
  REJECTED: { label: "Татгалзсан", tone: "bad" },
};

export const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Хүсэлт гаргасан", tone: "warn" },
  APPROVED: { label: "Батлагдсан", tone: "info" },
  PAID: { label: "Шилжүүлсэн", tone: "ok" },
  REJECTED: { label: "Татгалзсан", tone: "bad" },
};

export const USER_ROLE: Record<string, string> = {
  BUYER: "Худалдан авагч",
  SUPPLIER: "Нийлүүлэгч",
  ADMIN: "Админ",
};

export const ATTRIBUTE_TYPE: Record<string, string> = {
  TEXT: "Текст",
  NUMBER: "Тоо",
  BOOLEAN: "Тийм/Үгүй",
  SELECT: "Сонголт",
};
