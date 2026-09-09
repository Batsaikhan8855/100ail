/**
 * API-гийн хариуг storefront-ийн бүрэлдэхүүн хэсгүүдийн ашигладаг
 * `Product` / `Offer` хэлбэр рүү хөрвүүлэх давхарга.
 *
 * Ингэснээр UI-г өөрчлөхгүйгээр өгөгдлийн эх сурвалжийг mock-оос
 * NestJS API руу шилжүүлэв (архитектурын баримтын 7-р хэсэг).
 */

import type {
  ArtKey,
  Category,
  FilterGroup,
  Offer,
  Product,
  ProductAttribute,
  Review,
} from "@/data/catalog";

export interface ApiSupplier {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
}

export interface ApiOffer {
  id: string;
  productId: string;
  price: number;
  bulkPrice: number | null;
  bulkMinQty: number | null;
  unit: string;
  deliveryPrice: number;
  deliveryDays: number | null;
  deliversTo: string[];
  stock: number;
  location: string | null;
  warehouses: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    quantity: number;
  }[];
  supplier: ApiSupplier;
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  manufacturer: string | null;
  art: string;
  summary: string | null;
  standard: string | null;
  usage: string[];
  category: { id: string; slug: string; name: string; icon: string | null };
  attributes: { key: string; label: string; unit: string | null; value: string }[];
  images: { id: string; key: string; url: string }[];
  offers: ApiOffer[];
  bestOffer: ApiOffer | null;
  offerCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  rating: number | null;
  reviewCount: number;
}

export interface ApiFacetOption {
  id: string;
  label: string;
  count: number;
}

export interface ApiFacets {
  city: ApiFacetOption[];
  supplier: ApiFacetOption[];
  manufacturer: ApiFacetOption[];
  availability: ApiFacetOption[];
  price: { min: number; max: number };
}

export interface ApiProductList {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  facets: ApiFacets;
}

export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  productCount: number;
  children: {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    productCount: number;
  }[];
}

export interface ApiReview {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  createdAt: string;
  supplier: { name: string } | null;
}

const ART_KEYS: ArtKey[] = [
  "cement",
  "brick",
  "aerated-block",
  "rebar",
  "insulation",
  "plywood",
];

const CATEGORY_ICONS: Category["icon"][] = [
  "cement",
  "brick",
  "rebar",
  "wood",
  "roof",
  "insulation",
  "plumbing",
  "electric",
  "paint",
  "tools",
];

const toArt = (art: string): ArtKey =>
  ART_KEYS.includes(art as ArtKey) ? (art as ArtKey) : "cement";

const toIcon = (icon: string | null): Category["icon"] =>
  CATEGORY_ICONS.includes(icon as Category["icon"])
    ? (icon as Category["icon"])
    : "tools";

export const toProduct = (product: ApiProduct): Product => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  variant: product.variantLabel ?? undefined,
  categoryId: product.category.slug,
  art: toArt(product.art),
  image: product.images[0]?.url,
});

const deliveryNote = (offer: ApiOffer): string => {
  if (offer.deliveryPrice === 0) return "Үнэгүй хүргэлт";
  if (offer.deliveryDays) return `${offer.deliveryDays} хоногт хүргэнэ`;
  return "Хүргэлт тохиролцоно";
};

export const toOffer = (offer: ApiOffer): Offer => ({
  id: offer.id,
  productId: offer.productId,
  supplier: {
    id: offer.supplier.id,
    name: offer.supplier.name,
    verified: offer.supplier.verified,
  },
  price: offer.price,
  bulkPrice: offer.bulkPrice ?? undefined,
  bulkMinQty: offer.bulkMinQty ?? undefined,
  stock: offer.stock,
  unit: offer.unit,
  location: offer.location ?? "—",
  deliversTo: offer.deliversTo,
  deliveryNote: deliveryNote(offer),
  deliveryPrice: offer.deliveryPrice,
  deliveryDays: offer.deliveryDays ?? undefined,
  rating: offer.supplier.rating || undefined,
  reviewCount: offer.supplier.reviewCount || undefined,
  warehouses: offer.warehouses,
});

export const toCategory = (category: ApiCategory): Category => ({
  id: category.slug,
  name: category.name,
  icon: toIcon(category.icon),
});

export const toAttributes = (product: ApiProduct): ProductAttribute[] =>
  product.attributes.map((attribute) => ({
    label: attribute.label,
    value: attribute.unit
      ? `${attribute.value} ${attribute.unit}`
      : attribute.value,
  }));

export const toReview = (review: ApiReview, productId: string): Review => ({
  id: review.id,
  productId,
  author: review.authorName,
  rating: review.rating,
  date: new Date(review.createdAt).toLocaleDateString("mn-MN"),
  text: review.text,
  supplierName: review.supplier?.name ?? "",
  verified: review.verifiedPurchase,
});

/** Facet-ийн тоог шүүлтүүрийн бүлэг болгон хөрвүүлнэ */
export const toFilterGroups = (facets: ApiFacets): FilterGroup[] => [
  {
    id: "location",
    title: "Байршил",
    options: facets.city.map((option) => ({
      id: option.id,
      label: option.label,
      count: option.count,
    })),
  },
  {
    id: "availability",
    title: "Бэлэн байдал",
    options: facets.availability,
  },
  {
    id: "supplier",
    title: "Нийлүүлэгч",
    options: facets.supplier,
    expandable: facets.supplier.length > 6,
  },
  {
    id: "manufacturer",
    title: "Үйлдвэрлэгч",
    options: facets.manufacturer,
    expandable: facets.manufacturer.length > 6,
  },
];

/** Сонгосон шүүлтүүрээс API-гийн query string угсарна */
export const buildProductQuery = (input: {
  category?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  price?: { min: number; max: number };
  priceRange?: { min: number; max: number };
  selected: Record<string, Set<string>>;
}): string => {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.sort) params.set("sort", input.sort);
  params.set("page", String(input.page ?? 1));
  params.set("limit", String(input.limit ?? 12));

  if (input.price && input.priceRange) {
    if (input.price.min > input.priceRange.min) {
      params.set("minPrice", String(input.price.min));
    }
    if (input.price.max < input.priceRange.max) {
      params.set("maxPrice", String(input.price.max));
    }
  }

  const cities = [...(input.selected.location ?? [])];
  if (cities.length > 0) params.set("city", cities.join(","));

  const suppliers = [...(input.selected.supplier ?? [])];
  if (suppliers.length > 0) params.set("supplier", suppliers.join(","));

  const manufacturers = [...(input.selected.manufacturer ?? [])];
  if (manufacturers.length > 0) params.set("manufacturer", manufacturers.join(","));

  const availability = input.selected.availability ?? new Set<string>();
  if (availability.has("in-stock") && !availability.has("preorder")) {
    params.set("inStock", "true");
  }

  return params.toString();
};
