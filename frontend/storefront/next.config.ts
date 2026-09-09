import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсэнд зөвхөн шаардлагатай файлуудыг багтаана.
  // Vercel дээр standalone горим дэмжигддэггүй (build амжилттай болсны
  // дараа гаралтыг хөрвүүлэх шатанд унана) тул тэнд идэвхгүй болгоно —
  // `VERCEL` хувьсагчийг Vercel build бүрдээ өөрөө тавьдаг.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
