/**
 * Storefront-ийн хуваалцсан төрлүүд ба UI-ийн тогтмолууд.
 *
 * Каталогийн бодит өгөгдөл NestJS API-аас ирнэ (`src/lib/catalog-api.ts`
 * дахь хөрвүүлэгчээр). Архитектурын баримтын 7-р хэсгийн дагуу `Product`
 * (материалын үндсэн тодорхойлолт) болон `Offer` (нийлүүлэгч бүрийн үнэ,
 * үлдэгдэл, нөхцөл) тусад нь загварчлагдсан хэвээр.
 */

export type ArtKey =
  | "cement"
  | "brick"
  | "aerated-block"
  | "rebar"
  | "insulation"
  | "plywood";

export type BrandKey = "montsement" | "khass" | "mak" | "senko";

export interface Category {
  id: string;
  name: string;
  icon:
    | "cement"
    | "brick"
    | "rebar"
    | "wood"
    | "roof"
    | "insulation"
    | "plumbing"
    | "electric"
    | "paint"
    | "tools";
}

export interface Supplier {
  id: string;
  name: string;
  verified: boolean;
}

export interface Product {
  id: string;
  /** URL-д ашиглагдах богино нэр */
  slug: string;
  name: string;
  /** Хэмжээ, марк зэрэг variant-ыг ялгах товч тэмдэглэгээ */
  variant?: string;
  /** Ангиллын slug */
  categoryId: string;
  art: ArtKey;
  /** Бодит гэрэл зураг байвал вектор дүрслэлийн оронд харагдана */
  image?: string;
}

export interface Offer {
  id: string;
  productId: string;
  supplier: Supplier;
  /** Нэгж үнэ, төгрөгөөр */
  price: number;
  /** Бөөний үнэ (заавал биш) */
  bulkPrice?: number;
  /** Үлдэгдлийн тоо хэмжээ */
  stock: number;
  /** Хэмжих нэгж: ш, м, м² гэх мэт */
  unit: string;
  /** Агуулахын байршил */
  location: string;
  /** Хүргэлт хийдэг бусад хот, аймаг */
  deliversTo: string[];
  /** Хүргэлтийн нөхцөлийн товч тэмдэглэгээ */
  deliveryNote: string;
  /** Хүргэлтийн үнэ, төгрөгөөр. 0 бол үнэгүй хүргэлт */
  deliveryPrice?: number;
  /** Хүргэх хугацаа, хоногоор */
  deliveryDays?: number;
  /** Бөөний үнэ хүчинтэй болох доод тоо хэмжээ */
  bulkMinQty?: number;
  /** Нийлүүлэгчийн үнэлгээ, 5-аас */
  rating?: number;
  /** Үнэлгээ өгсөн хэрэглэгчийн тоо */
  reviewCount?: number;
  /** Тухайн саналын үлдэгдэлтэй агуулахууд, газрын зурагт харуулна */
  warehouses?: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    quantity: number;
  }[];
}

export interface CartLine {
  offerId: string;
  productId: string;
  productSlug?: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  /** Нэгж үнэ, бөөний хямдрал тооцоогүй */
  unitPrice: number;
  qty: number;
  unit: string;
  art: ArtKey;
  /** Бодит гэрэл зураг байвал вектор дүрслэлийн оронд харагдана */
  image?: string;
  /** Бөөний үнэ ба түүнийг идэвхжүүлэх доод тоо хэмжээ */
  bulkPrice?: number;
  bulkMinQty?: number;
  /** Нийлүүлэгчийн хүргэлтийн үнэ. Захиалга нийлүүлэгч тус бүрээр хуваагдана */
  deliveryPrice?: number;
  deliveryDays?: number;
  location?: string;
  /** Агуулахад байгаа боломжит үлдэгдэл */
  stock?: number;
  /** Нэгжийн жин (кг) ба мөрийн нийт жин — серверт тооцогдоно */
  unitWeightKg?: number;
  lineWeightKg?: number;
  /** Жин нь ангиллаар таамагласан утга эсэх */
  weightEstimated?: boolean;
}

export interface FilterOption {
  id: string;
  label: string;
  count: number;
  checked?: boolean;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  /** Хоёр баганаар харуулах эсэх */
  twoColumn?: boolean;
  /** "Илүү харах" холбоос харуулах эсэх */
  expandable?: boolean;
}

/**
 * Барилгын материалын dynamic attribute (баримтын 8-р хэсэг).
 * Ангилал бүр өөр өөр техникийн үзүүлэлттэй тул `attributes` /
 * `attribute_values` бүтцээр key-value хэлбэрээр хадгална.
 */
export interface ProductAttribute {
  label: string;
  value: string;
}

export interface ProductDetail {
  /** Товч тайлбар */
  summary: string;
  /** Техникийн үзүүлэлт */
  attributes: ProductAttribute[];
  /** Хэрэглээний зөвлөмж */
  usage: string[];
  /** Стандарт, гэрчилгээ */
  standard: string;
}

/** Нийлүүлэгчийн үнэлгээ, сэтгэгдэл */
export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  supplierName: string;
  text: string;
  /** Тухайн барааг худалдаж авсан хэрэглэгчийн сэтгэгдэл эсэх */
  verified?: boolean;
}

export const NAV_LINKS = [
  { id: "home", label: "Нүүр", href: "/" },
  { id: "orders", label: "Захиалга", href: "/account/orders" },
  { id: "track", label: "Хүргэлт хянах", href: "/track" },
];

/** Үнийн шүүлтүүрийн анхны хязгаар; бодит хязгаар нь facet-аас ирнэ */
export const PRICE_RANGE = { min: 0, max: 1_000_000 };

export const SORT_OPTIONS = [
  { id: "recommended", label: "Санал болгох" },
  { id: "price", label: "Үнээр" },
  { id: "popular", label: "Эрэлттэй" },
  { id: "new", label: "Шинэ" },
  { id: "rating", label: "Үнэлгээгээр" },
];

export const TRUST_ITEMS = [
  {
    id: "delivery",
    icon: "truck" as const,
    title: "Хурдан хүргэлт",
    note: "УБ хот 24 цагт",
  },
  {
    id: "payment",
    icon: "shield" as const,
    title: "Аюулгүй төлбөр",
    note: "QPay, банкны карт",
  },
  {
    id: "support",
    icon: "headset" as const,
    title: "Найдвартай үйлчилгээ",
    note: "7/7 дэмжлэг",
  },
];
