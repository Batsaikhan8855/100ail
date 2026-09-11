import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import {
  toAttributes,
  toOffer,
  toProduct,
  toReview,
  type ApiProduct,
  type ApiReview,
} from "@/lib/catalog-api";
import { serverGet } from "@/lib/server-api";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await serverGet<ApiProduct>(`/products/${slug}`);
  if (!product) return { title: "Бүтээгдэхүүн олдсонгүй — BarilgaHUB" };

  const title = [product.name, product.variantLabel].filter(Boolean).join(" ");
  return {
    title: `${title} — BarilgaHUB`,
    description:
      product.summary ??
      `${title} — олон нийлүүлэгчийн үнэ, үлдэгдэл, хүргэлтийн харьцуулалт.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await serverGet<ApiProduct>(`/products/${slug}`);
  if (!product) notFound();

  const reviews = (await serverGet<ApiReview[]>(`/reviews/product/${slug}`)) ?? [];

  return (
    <ProductDetail
      product={toProduct(product)}
      offers={product.offers.map(toOffer)}
      reviews={reviews.map((review) => toReview(review, product.id))}
      detail={{
        summary: product.summary ?? "",
        attributes: toAttributes(product),
        usage: product.usage,
        standard: product.standard ?? "",
      }}
      categoryName={product.category.name}
      images={product.images}
    />
  );
}
