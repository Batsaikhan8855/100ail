import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсэнд зөвхөн шаардлагатай файлуудыг багтаана.
  // Vercel дээр standalone горим дэмжигддэггүй (build амжилттай болсны
  // дараа гаралтыг хөрвүүлэх шатанд унана) тул тэнд идэвхгүй болгоно —
  // `VERCEL` хувьсагчийг Vercel build бүрдээ өөрөө тавьдаг.
  output: process.env.VERCEL ? undefined : "standalone",

  /**
   * Барааны зураг (`public/media/barilga/<хэш>.webp`) нь агуулгын хэшээр
   * нэрлэгдсэн тул хэзээ ч өөрчлөгддөггүй — агуулга солигдвол нэр нь
   * өөрчлөгдөнө. Анхдагчаар Next нь `public/`-ийн файлыг хүсэлт бүрд
   * дахин шалгуулдаг (`must-revalidate`) бөгөөд каталогийн нэг хуудсанд
   * 50 гаруй зураг байдаг тул тэр нь илүүц.
   */
  headers: async () => [
    {
      source: "/media/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;
