/**
 * Схемийг мэдээллийн сантай тааруулах — зөвхөн шаардлагатай үед.
 *
 * `prisma db push` нь 10-20 секунд авдаг бөгөөд энэ нь сервер асахаас
 * өмнө явдаг тул контейнер дахин эхлэх бүрд тэр хугацаа deploy-д
 * нэмэгддэг байв. Гэтэл схем нь deploy хооронд өөрчлөгддөггүй —
 * эхлэх бүрд push хийх нь илүүц.
 *
 * Иймд `schema.prisma`-ийн хэшийг санд (`app_meta.schema_state`) хадгална:
 *   - хэш тааарвал юу ч хийхгүй (хагас секунд),
 *   - зөрвөл premigrate + `db push` ажиллаад шинэ хэшийг бичнэ.
 *
 * Хэшийг зөвхөн push амжилттай болсны ДАРАА бичнэ — эс бөгөөс
 * бүтэлгүйтсэн шилжилт «хийгдсэн» мэт тэмдэглэгдэх байсан.
 *
 * Төлөв нь `public` биш, тусдаа `app_meta` схемд сууна: `db push` нь
 * датамоделд байхгүй хүснэгтийг устгадаг тул `public` дотор байрлуулбал
 * тэр өөрөө хэшээ арчих байв (туршихад яг ийм болсон). Prisma нь зөвхөн
 * холболтын мөрөнд заасан схемийг удирддаг учир `app_meta` хөндөгдөхгүй.
 *
 * Түүхий SQL-ээс өөр юу ч ашиглахгүй: Prisma client нь ШИНЭ схемээр
 * үүссэн байхад сан нь хуучин хэвээр байж болзошгүй (premigrate-тэй
 * ижил шалтгаан).
 */
import { execFileSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { envProblems, stripEmptyEnv } from "../src/common/env";

const prisma = new PrismaClient();

/** `schema.prisma`-г dist доторх болон repo-гийн байрлалаас хайна */
function schemaPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "prisma/schema.prisma"),
    path.join(__dirname, "schema.prisma"),
    path.resolve(__dirname, "../../prisma/schema.prisma"),
  ];
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) {
    throw new Error(`schema.prisma олдсонгүй: ${candidates.join(", ")}`);
  }
  return found;
}

const run = (command: string, args: string[]): void => {
  execFileSync(command, args, { stdio: "inherit" });
};

const TABLE = `"app_meta"."schema_state"`;

async function ensureTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "app_meta"`);
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
       id integer PRIMARY KEY,
       hash text NOT NULL,
       "updatedAt" timestamptz NOT NULL DEFAULT now()
     )`,
  );
}

async function storedHash(): Promise<string | null> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ hash: string }[]>(
    `SELECT hash FROM ${TABLE} WHERE id = 1`,
  );
  return rows[0]?.hash ?? null;
}

async function rememberHash(hash: string): Promise<void> {
  // Төлөвийн хүснэгт нь `storedHash` дээр үүссэн байх ёстой ч, тэр алхам
  // алдаа өгөөд алгассан байж болзошгүй тул дахин баталгаажуулна.
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${TABLE} (id, hash) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET hash = $1, "updatedAt" = now()`,
    hash,
  );
}

async function main(): Promise<void> {
  // Prisma-гийн "the URL must start with the protocol" алдаа нь шалтгааныг
  // хэлдэггүй тул эндээс тодорхой мессеж өгнө.
  stripEmptyEnv();
  const problems = envProblems();
  if (problems.length > 0) {
    console.error("[env] Тохиргооны алдаа:");
    for (const problem of problems) console.error(`  • ${problem}`);
    process.exit(1);
  }

  const file = schemaPath();
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");

  let current: string | null = null;
  try {
    current = await storedHash();
  } catch (error) {
    // Анхны deploy — сан хоосон эсвэл хүрч чадсангүй. Push нь өөрөө
    // мэдээллийн сан руу хандах тул алдааг тэнд бодитоор мэдэгдэнэ.
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[schema] төлөвийг уншиж чадсангүй: ${message.split("\n")[0]}`);
  }

  if (current === hash) {
    console.log(`[schema] өөрчлөгдөөгүй (${hash.slice(0, 12)}) — алгаслаа`);
    await prisma.$disconnect();
    return;
  }

  console.log(
    current
      ? `[schema] өөрчлөгдсөн (${current.slice(0, 12)} → ${hash.slice(0, 12)}) — тааруулж байна`
      : `[schema] анхны тохируулга (${hash.slice(0, 12)})`,
  );

  // Шинэ хязгаарлалт нэмэхэд одоогийн өгөгдөл нийцэхгүй байвал push
  // унадаг тул эхлээд цэгцэлнэ (давхардсан утасны дугаар гэх мэт).
  run(process.execPath, [path.join(__dirname, "premigrate.js")]);

  // `--accept-data-loss` нь интерактив бус орчинд шаардлагатай: Prisma нь
  // хязгаарлалт нэмэх бүрд баталгаажуулалт асуудаг.
  run("npx", [
    "prisma",
    "db",
    "push",
    "--schema",
    file,
    "--skip-generate",
    "--accept-data-loss",
  ]);

  try {
    await rememberHash(hash);
  } catch (error) {
    // Хэш бичиж чадсангүй (жишээ нь схем үүсгэх эрхгүй) — энэ нь зөвхөн
    // дараагийн сэрэлт дээр push дахин ажиллана гэсэн үг, өөрөөр хэлбэл
    // хуучин зан төлөв. Үүний төлөө контейнерыг унагах шаардлагагүй.
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[schema] хэшийг хадгалж чадсангүй: ${message.split("\n")[0]}`);
  }
  await prisma.$disconnect();
  console.log("[schema] бэлэн");
}

main().catch(async (error) => {
  console.error("[schema] Алдаа:", error);
  await prisma.$disconnect().catch(() => undefined);
  // Хүснэгтгүй санг API хандах ёсгүй тул контейнерыг зогсооно
  process.exit(1);
});
