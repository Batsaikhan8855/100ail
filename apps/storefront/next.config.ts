import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсэнд зөвхөн шаардлагатай файлуудыг багтаана
  output: "standalone",
};

export default nextConfig;
