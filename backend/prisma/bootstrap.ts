/**
 * Мэдээллийн санг нэг удаа бэлтгэнэ: суурь өгөгдөл + каталогийн импорт.
 *
 * Render-ийн үнэгүй тариф `preDeployCommand` дэмждэггүй тул энэ ажил
 * контейнер эхлэх үед `docker-entrypoint.sh`-аас арын дэвсгэрт
 * ажилладаг. Үнэгүй тариф идэвхгүй үед унтардаг бөгөөд сэрэх бүрд
 * контейнер дахин эхэлдэг тул каталог бүрэн байвал юу ч хийхгүй — эс
 * бөгөөс seed нь өгөгдлийг арчих байсан. Харин импорт дундаа таслагдаж
 * дутуу үлдсэн бол дараагийн эхлэлд түүнийг дуусгана.
 *
 * Схемийг тааруулах (`prisma db push`) нь энэ скриптээс өмнө,
 * entrypoint дотор синхроноор хийгддэг.
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { PrismaClient } from "@prisma/client";

const run = (args: string[]): void => {
  execFileSync(process.execPath, args, { stdio: "inherit" });
};

/** Импортын эх файл дахь барааны тоо — дуусгасан эсэхийн хэмжүүр */
function expectedProducts(): number {
  const dirs = [
    path.join(__dirname, "data/barilga"),
    path.resolve(process.cwd(), "prisma/data/barilga"),
  ];
  for (const dir of dirs) {
    const file = path.join(dir, "products.json.gz");
    if (!fs.existsSync(file)) continue;
    const rows = JSON.parse(
      zlib.gunzipSync(fs.readFileSync(file)).toString("utf-8"),
    ) as unknown[];
    return rows.length;
  }
  return 0;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let products = 0;
  try {
    products = await prisma.product.count();
  } finally {
    await prisma.$disconnect();
  }

  const expected = expectedProducts();

  // Бүрэн орсон бол дахин ажиллуулах шаардлагагүй
  if (expected > 0 && products >= expected) {
    console.log(`[bootstrap] ${products} бараа бүрэн байна — алгаслаа`);
    return;
  }

  // Хоосон бол суурь өгөгдлөөс эхэлнэ; дутуу бол зөвхөн импортыг
  // үргэлжлүүлнэ (seed нь өгөгдлийг арчих тул дахин ажиллуулж болохгүй).
  // Үнэгүй тарифын instance унтахад импорт таслагдаж дутуу үлдэж болзошгүй
  // тул энэ шалгалт нь дараагийн эхлэлд ажлыг дуусгана.
  if (products === 0) {
    console.log("[bootstrap] Мэдээллийн сан хоосон — суурь өгөгдөл бэлтгэж байна");
    run([path.join(__dirname, "seed.js")]);
  } else {
    console.log(
      `[bootstrap] Каталог дутуу (${products}/${expected}) — импортыг үргэлжлүүлж байна`,
    );
  }
  run([path.join(__dirname, "import-barilga.js"), "--stock=50"]);
  console.log("[bootstrap] Бэлэн");
}

main().catch((error) => {
  // Бэлтгэл бүтэлгүйтсэн ч API-г унтраахгүй — лог дээр харагдана
  console.error("[bootstrap] Алдаа:", error);
  process.exit(1);
});
