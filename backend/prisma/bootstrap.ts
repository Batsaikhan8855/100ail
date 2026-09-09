/**
 * Мэдээллийн санг нэг удаа бэлтгэнэ: суурь өгөгдөл + каталогийн импорт.
 *
 * Render-ийн үнэгүй тариф `preDeployCommand` дэмждэггүй тул энэ ажил
 * контейнер эхлэх үед `docker-entrypoint.sh`-аас арын дэвсгэрт
 * ажилладаг. Үнэгүй тариф идэвхгүй үед унтардаг бөгөөд сэрэх бүрд
 * контейнер дахин эхэлдэг тул **бараа аль хэдийн байвал юу ч хийхгүй** —
 * эс бөгөөс seed нь өгөгдлийг арчих байсан.
 *
 * Схемийг тааруулах (`prisma db push`) нь энэ скриптээс өмнө,
 * entrypoint дотор синхроноор хийгддэг.
 */
import { execFileSync } from "child_process";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const run = (args: string[]): void => {
  execFileSync(process.execPath, args, { stdio: "inherit" });
};

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let products = 0;
  try {
    products = await prisma.product.count();
  } finally {
    await prisma.$disconnect();
  }

  if (products > 0) {
    console.log(`[bootstrap] ${products} бараа байна — бэлтгэлийг алгаслаа`);
    return;
  }

  console.log("[bootstrap] Мэдээллийн сан хоосон — суурь өгөгдөл бэлтгэж байна");
  run([path.join(__dirname, "seed.js")]);
  run([path.join(__dirname, "import-barilga.js"), "--stock=50"]);
  console.log("[bootstrap] Бэлэн");
}

main().catch((error) => {
  // Бэлтгэл бүтэлгүйтсэн ч API-г унтраахгүй — лог дээр харагдана
  console.error("[bootstrap] Алдаа:", error);
  process.exit(1);
});
