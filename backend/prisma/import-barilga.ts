/**
 * barilga.mn-ээс цуглуулсан каталогийг импортлох скрипт.
 *
 * Эх өгөгдөл: `prisma/data/barilga/products.json` (scraper-ийн гаралт).
 * Ажиллуулах: npm run db:import:barilga [-- --stock=50]
 *
 * Импорт нь давтан ажиллуулахад аюулгүй (idempotent): бүтээгдэхүүнийг
 * `barilga-<id>` slug-аар нь таньж шинэчилнэ. Захиалгад орсон санал устгагдахгүй.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const prisma = new PrismaClient();

/**
 * Эх өгөгдлийн сан. `ts-node`-оор ажиллахад `__dirname` нь `prisma/`,
 * бүтээсэн дүрсэнд `dist/prisma/` болдог (tsc нь `.gz` файл хуулдаггүй)
 * тул ажлын хавтснаас ч хайна.
 */
const DATA_DIRS = [
  path.join(__dirname, "data/barilga"),
  path.resolve(process.cwd(), "prisma/data/barilga"),
];
/** Шахсан хувилбарыг эхэлж хайна (репод багтахаар gzip-лэсэн) */
const DATA_FILES = DATA_DIRS.flatMap((dir) => [
  path.join(dir, "products.json.gz"),
  path.join(dir, "products.json"),
]);
/**
 * `Offer.price` нь PostgreSQL-ийн `integer` (INT4) тул 2,147,483,647-оос
 * хэтэрч болохгүй. Эх сайт дээр материал биш зарууд (газар, объект)
 * тэрбумаар зарлагдсан байдаг тул тэднийг үнэгүйтэй адил үзэж нуухаас
 * өөр аргагүй.
 */
const MAX_PRICE = 2_000_000_000;

/**
 * Эх сайт дээр «утсаар лавлана» гэсэн зарыг 1₮ (эсвэл 0.01₮) гэж
 * тавьдаг бөгөөд нэрэндээ утасны дугаараа бичсэн байдаг. Барилгын
 * материалын бодит үнэ 100₮-аас доош байхгүй тул тэднийг үнэгүйтэй
 * адил үзэж каталогоос нууна — эс бөгөөс үнээр эрэмбэлэхэд нүүрэнд
 * гарч ирнэ.
 */
const MIN_PRICE = 100;

/**
 * Импортын дүрмийн хувилбар.
 *
 * Үнийн хязгаар, ангиллын буулгалт, зургийн шүүлт зэрэг дүрэм
 * өөрчлөгдөх бүрд энэ тоог нэмнэ. `bootstrap` үүнийг мэдээллийн сан дахь
 * утгатай харьцуулж, зөрвөл каталогийг дахин боловсруулна — эс бөгөөс
 * дүрэм зассан ч хуучин өгөгдөл амьд дээр үлдэнэ.
 *
 * 1 — анхны импорт
 * 2 — үнийн доод (100₮) ба дээд (2 тэрбум₮) хязгаар, ангиллын
 *     хоёр шатлал, тайлбарын зургийн шүүлт
 */
export const IMPORT_VERSION = 2;

/** Импортын эх сурвалжийг төлөөлөх нийлүүлэгч */
const SOURCE_SUPPLIER_SLUG = "barilga-mn";
const SOURCE_CITY = "Улаанбаатар";
/** Татаж авсан зургийн сан: `media/barilga/<файл>` (StorageService-ийн түлхүүр) */
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? "media");
const IMAGE_PREFIX = "barilga";

interface ScrapedProduct {
  id: number;
  url: string;
  name?: string;
  categoryId?: number;
  categoryName?: string;
  date?: string;
  price?: number | null;
  oldPrice?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  images?: string[];
  thumb?: string | null;
}

// ---------- Slug ----------

const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const slugify = (input: string): string => {
  const latin = [...input.toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join("");
  return (
    latin
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "cat"
  );
};

// ---------- Ангиллын дүрс, вектор дүрслэл ----------

/** Ангиллын нэрээс storefront-ийн дүрсний түлхүүрийг таамаглана */
const ICON_RULES: [RegExp, string][] = [
  [/цемент|шохой|бетон|зуурмаг|хуурай хольц|элс|хайрга|дайрга/i, "cement"],
  [/тоосго|блок|хавтан|плита|чулуу|замын хавтан/i, "brick"],
  [/арматур|металл|ган|хийц/i, "rebar"],
  [/мод|паркет|ламинат|хэв хашмал|шал/i, "wood"],
  [/дээвэр|фасад/i, "roof"],
  [/дулаал|дуу тусгаарлах/i, "insulation"],
  [
    /сантехник|хоолой|усны|ус цэвэр|усан|ванн|угаалтуур|суултуур|халаа|насос|бассейн|агааржуулалт/i,
    "plumbing",
  ],
  [
    /цахилгаан|кабель|утас|гэрэл|дохиолол|унтраалга|залгуур|интернет|домофон/i,
    "electric",
  ],
  [/будаг|эмульс|обой|хуулга|замаск|засал чимэглэл|гоёл/i, "paint"],
];

const iconFor = (name: string): string =>
  ICON_RULES.find(([re]) => re.test(name))?.[1] ?? "tools";

/** Зураггүй үед харагдах вектор дүрслэл (storefront дэмждэг түлхүүрүүд) */
const ART_BY_ICON: Record<string, string> = {
  cement: "cement",
  brick: "brick",
  rebar: "rebar",
  wood: "plywood",
  insulation: "insulation",
};

const artFor = (icon: string): string => ART_BY_ICON[icon] ?? "cement";

// ---------- Туслах ----------

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

/** Тайлбарыг картан дээр багтах хэмжээнд товчилно */
const toSummary = (product: ScrapedProduct): string | null => {
  const text = (product.shortDescription || product.description || "").trim();
  if (!text) return null;
  return text.length > 900 ? `${text.slice(0, 897)}...` : text;
};

/**
 * Зургийн түлхүүр.
 *
 * `images.py`-аар татаж авсан локал файл байвал түүнийг (`barilga/<файл>`),
 * үгүй бол эх хаягаар нь буцаана — CDN нь `?d=0`-гүй хүсэлтийг 403-аар
 * хаадаг тул query-г нөхнө.
 *
 * Онцгой тохиолдол: галерейн зураг эх сайтын CDN (`img.barilga.mn`) дээр
 * байдаг бол тайлбар доторх нэмэлт зураг нь ихэвчлэн тусгаарлагч, дүрс
 * зэрэг 1-2KB файл байдаг. `images.py` нь тэднийг хэмжээгээр нь шүүж
 * хадгалдаггүй тул **тайлбарын зургийг зөвхөн локалд буусан үед** авна.
 */
const isGalleryImage = (url: string): boolean => url.includes("img.barilga.mn");

const imageKeys = (item: ScrapedProduct): string[] => {
  const keys: string[] = [];
  for (const url of (item.images ?? []).filter(Boolean).slice(0, 8)) {
    const file = url.split("/files/").pop()?.split("?")[0];
    if (file && fs.existsSync(path.join(MEDIA_DIR, IMAGE_PREFIX, file))) {
      keys.push(`${IMAGE_PREFIX}/${file}`);
    } else if (isGalleryImage(url)) {
      keys.push(url.includes("?") ? url : `${url}?d=0`);
    }
  }
  return keys;
};

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

async function main() {
  const dataFile = DATA_FILES.find((file) => fs.existsSync(file));
  if (!dataFile) {
    throw new Error(
      `Өгөгдлийн файл олдсонгүй: ${DATA_FILES.join(" эсвэл ")}\n` +
        "Эхлээд scraper-ыг ажиллуулна уу: python3 prisma/data/barilga/scrape.py",
    );
  }
  /** Үлдэгдэл нь эх сайтад байхгүй тул анхдагчаар 0 (--stock=N-ээр өөрчилнө) */
  const stock = Number(arg("stock") ?? 0);
  const buffer = fs.readFileSync(dataFile);
  const raw: ScrapedProduct[] = JSON.parse(
    (dataFile.endsWith(".gz") ? zlib.gunzipSync(buffer) : buffer).toString(
      "utf-8",
    ),
  );
  console.log(`Файл: ${path.basename(dataFile)}`);
  const items = raw.filter((p) => p.id && (p.name ?? "").trim());
  console.log(`Эх өгөгдөл: ${raw.length} мөр, боловсруулах: ${items.length}`);

  // ---------- 1. Ангилал ----------
  const catNames = new Map<number, string>();
  for (const p of items) {
    if (p.categoryId && p.categoryName)
      catNames.set(p.categoryId, p.categoryName);
  }
  const categoryIdBySourceId = new Map<number, string>();
  const iconBySourceId = new Map<number, string>();
  let position = 100; // seed-ийн ангиллуудын ард байрлуулна

  /**
   * `iconFor` нь эх сайтын ангиллын нэрийг seed-ийн 10 үндсэн ангиллын
   * slug (cement, brick, rebar…) руу буулгадаг. Тэр ангилал байвал эх
   * сайтын ангиллыг түүний **дэд ангилал** болгоно — ингэснээр нүүр дээр
   * үндсэн 10 ангилал л харагдаж, эх сайтын нарийвчлал хадгалагдана.
   */
  const parentIdByIcon = new Map<string, string>();
  for (const icon of new Set([...catNames.values()].map(iconFor))) {
    const parent = await prisma.category.findUnique({ where: { slug: icon } });
    if (parent) parentIdByIcon.set(icon, parent.id);
  }

  for (const [sourceId, name] of [...catNames].sort((a, b) => a[0] - b[0])) {
    let slug = slugify(name);
    const icon = iconFor(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    // Ижил slug өөр ангилалд оногдвол cid-ээр ялгана
    if (existing && existing.name !== name) slug = `${slug}-${sourceId}`;
    const parentId = parentIdByIcon.get(icon) ?? null;
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, icon, parentId },
      create: { slug, name, icon, parentId, position: position++ },
    });
    categoryIdBySourceId.set(sourceId, category.id);
    iconBySourceId.set(sourceId, icon);
  }
  console.log(
    `Ангилал: ${categoryIdBySourceId.size} (${parentIdByIcon.size} үндсэн ангилал доор)`,
  );

  // Ангилалгүй бүтээгдэхүүнд зориулсан нөөц ангилал
  const fallbackParentId = parentIdByIcon.get("tools") ?? null;
  const fallbackCategory = await prisma.category.upsert({
    where: { slug: "busad" },
    update: { parentId: fallbackParentId },
    create: {
      slug: "busad",
      name: "Бусад",
      icon: "tools",
      parentId: fallbackParentId,
      position: position++,
    },
  });

  // ---------- 2. Эх сурвалжийн нийлүүлэгч ----------
  const supplier = await prisma.supplier.upsert({
    where: { slug: SOURCE_SUPPLIER_SLUG },
    update: {},
    create: {
      slug: SOURCE_SUPPLIER_SLUG,
      name: "Barilga.mn",
      description:
        "barilga.mn нийтийн каталогоос импортлосон бүтээгдэхүүн. Үнэ, мэдээлэл нь эх сайтын нийтлэлээр.",
      verified: false,
    },
  });

  let warehouse = await prisma.warehouse.findFirst({
    where: { supplierId: supplier.id, city: SOURCE_CITY },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        supplierId: supplier.id,
        name: `${SOURCE_CITY} төв`,
        city: SOURCE_CITY,
        address: SOURCE_CITY,
        lat: 47.9186,
        lng: 106.9176,
      },
    });
  }

  // ---------- 3. Бүтээгдэхүүн ----------
  let created = 0;
  let updated = 0;
  let withoutPrice = 0;
  let outOfRange = 0;

  for (const batch of chunk(items, 25)) {
    await Promise.all(
      batch.map(async (item) => {
        const slug = `barilga-${item.id}`;
        const sourceCategoryId = item.categoryId ?? -1;
        const categoryId =
          categoryIdBySourceId.get(sourceCategoryId) ?? fallbackCategory.id;
        const icon = iconBySourceId.get(sourceCategoryId) ?? "tools";
        const raw =
          item.price && item.price > 0 ? Math.round(item.price) : null;
        const price =
          raw !== null && raw >= MIN_PRICE && raw <= MAX_PRICE ? raw : null;
        if (price === null) withoutPrice += 1;
        if (raw !== null && price === null) outOfRange += 1;

        const data = {
          name: (item.name ?? "").trim(),
          categoryId,
          art: artFor(icon),
          summary: toSummary(item),
          // Үнэгүй бүтээгдэхүүн каталогт санал үүсгэхгүй тул нуугдана
          active: price !== null,
        };

        const existing = await prisma.product.findUnique({
          where: { slug },
          select: { id: true },
        });

        const product = existing
          ? await prisma.product.update({ where: { id: existing.id }, data })
          : await prisma.product.create({
              data: {
                slug,
                ...data,
                ...(item.date ? { createdAt: new Date(item.date) } : {}),
              },
            });
        if (existing) updated += 1;
        else created += 1;

        const images = imageKeys(item);
        const currentImages = await prisma.productImage.findMany({
          where: { productId: product.id },
          select: { key: true },
        });
        const sameImages =
          currentImages.length === images.length &&
          currentImages.every((row, index) => row.key === images[index]);
        if (!sameImages) {
          await prisma.productImage.deleteMany({
            where: { productId: product.id },
          });
          if (images.length) {
            await prisma.productImage.createMany({
              data: images.map((key, index) => ({
                productId: product.id,
                key,
                position: index,
              })),
            });
          }
        }

        if (price === null) {
          await prisma.offer.updateMany({
            where: { productId: product.id, supplierId: supplier.id },
            data: { active: false },
          });
          return;
        }

        const offerExisting = await prisma.offer.findFirst({
          where: { productId: product.id, supplierId: supplier.id },
          select: { id: true },
        });
        const offer = offerExisting
          ? await prisma.offer.update({
              where: { id: offerExisting.id },
              data: { price, active: true, deliversTo: [SOURCE_CITY] },
            })
          : await prisma.offer.create({
              data: {
                productId: product.id,
                supplierId: supplier.id,
                price,
                unit: "ш",
                deliveryPrice: 0,
                deliversTo: [SOURCE_CITY],
              },
            });

        await prisma.inventory.upsert({
          where: {
            offerId_warehouseId: {
              offerId: offer.id,
              warehouseId: warehouse!.id,
            },
          },
          update: { quantity: stock },
          create: {
            offerId: offer.id,
            warehouseId: warehouse!.id,
            quantity: stock,
          },
        });
      }),
    );
    const done = created + updated;
    if (done % 500 < 25) console.log(`  ${done}/${items.length}`);
  }

  await prisma.appSetting.upsert({
    where: { key: "catalogImportVersion" },
    update: { value: String(IMPORT_VERSION) },
    create: { key: "catalogImportVersion", value: String(IMPORT_VERSION) },
  });

  console.log(
    `Дуусав: шинэ ${created}, шинэчилсэн ${updated}, үнэгүй (нуусан) ${withoutPrice}` +
      (outOfRange ? `, үүнээс үнэ нь хүрээнээс гадуур ${outOfRange}` : ""),
  );
  console.log(`Үлдэгдэл: ${stock} (--stock=N-ээр өөрчилнө)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
