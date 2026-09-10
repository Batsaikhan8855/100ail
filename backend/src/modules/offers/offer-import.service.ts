import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { readSpreadsheet } from "../../common/xlsx/xlsx.reader";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { MeiliService } from "../search/meili.service";

/** Excel-ийн баганын гарчгийг талбар руу хөрвүүлэх нэрс */
const COLUMN_ALIASES: Record<string, string[]> = {
  product: ["бараа", "барааны нэр", "бүтээгдэхүүн", "код", "slug", "product", "name"],
  price: ["үнэ", "нэгж үнэ", "price"],
  bulkPrice: ["бөөний үнэ", "бөөн үнэ", "bulk price", "bulkprice"],
  bulkMinQty: ["бөөний доод тоо", "бөөний тоо", "bulk min", "bulkminqty"],
  unit: ["нэгж", "хэмжих нэгж", "unit"],
  weightKg: ["жин", "жин кг", "нэгжийн жин", "weight", "weightkg"],
  volumeM3: ["овор", "эзэлхүүн", "овор м3", "нэгжийн овор", "volume", "volumem3"],
  deliveryPrice: ["хүргэлтийн үнэ", "хүргэлт", "delivery price"],
  deliveryDays: ["хүргэх хоног", "хугацаа", "delivery days"],
  warehouse: ["агуулах", "салбар", "warehouse"],
  stock: ["үлдэгдэл", "тоо", "тоо ширхэг", "stock", "quantity"],
};

export interface ImportRowResult {
  row: number;
  product: string;
  action: "created" | "updated" | "skipped";
  reason?: string;
  price?: number;
  stock?: number;
  warehouse?: string;
}

export interface ImportReport {
  total: number;
  created: number;
  updated: number;
  stockUpdated: number;
  skipped: number;
  dryRun: boolean;
  rows: ImportRowResult[];
}

const normalize = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

/** Гарчгийн мөрөөс баганын байрлалыг олно */
export function mapColumns(header: string[]): Record<string, number> {
  const columns: Record<string, number> = {};

  header.forEach((cell, index) => {
    const name = normalize(cell);
    if (!name) return;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (columns[field] !== undefined) continue;
      if (aliases.some((alias) => name === alias || name.startsWith(`${alias} `))) {
        columns[field] = index;
        return;
      }
    }
  });

  return columns;
}

/** "24 900₮", "24,900.00" зэргийг тоо болгоно */
export function parseAmount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/[₮\s,']/g, "").replace(/(\d),(\d)/g, "$1$2");
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned));
}

/**
 * Нийлүүлэгчийн Excel/CSV файлаас бараа, үнэ, үлдэгдлийг бөөнөөр оруулах
 * (баримтын 4.2 "Excel-ээр бөөнөөр оруулах").
 *
 * Файлыг гуравдагч сангүйгээр уншиж, мөр бүрийг тухайн нийлүүлэгчийн
 * саналтай тулгана: байвал шинэчилнэ, байхгүй бол шинээр үүсгэнэ.
 * `dryRun` горимд өгөгдөл бичихгүйгээр урьдчилан харуулна.
 */
@Injectable()
export class OfferImportService {
  private readonly logger = new Logger(OfferImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  /** Нийлүүлэгчийн одоогийн саналаар бөглөсөн CSV загвар */
  async template(user: AuthUser): Promise<string> {
    const supplierId = this.supplierIdOf(user);
    const offers = await this.prisma.offer.findMany({
      where: { supplierId, active: true },
      include: {
        product: { select: { slug: true } },
        inventory: { include: { warehouse: { select: { name: true } } } },
      },
      take: 200,
    });

    const header = [
      "бараа",
      "үнэ",
      "бөөний үнэ",
      "бөөний доод тоо",
      "нэгж",
      "жин",
      "овор",
      "хүргэлтийн үнэ",
      "хүргэх хоног",
      "агуулах",
      "үлдэгдэл",
    ];

    const lines = offers.map((offer) => {
      const inventory = offer.inventory[0];
      return [
        offer.product.slug,
        offer.price,
        offer.bulkPrice ?? "",
        offer.bulkMinQty ?? "",
        offer.unit,
        offer.weightKg ?? "",
        offer.volumeM3 ?? "",
        offer.deliveryPrice,
        offer.deliveryDays ?? "",
        inventory?.warehouse.name ?? "",
        inventory?.quantity ?? "",
      ].join(",");
    });

    return [header.join(","), ...lines].join("\n");
  }

  /** base64 агуулгыг задалж импортлоно */
  async import(
    user: AuthUser,
    input: { content: string; fileName?: string; dryRun?: boolean },
  ): Promise<ImportReport> {
    const supplierId = this.supplierIdOf(user);

    const buffer = Buffer.from(input.content, "base64");
    if (buffer.length === 0) throw new BadRequestException("Файл хоосон байна");
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException("Файлын хэмжээ 10MB-аас хэтэрч болохгүй");
    }

    let table: string[][];
    try {
      table = readSpreadsheet(buffer);
    } catch (error) {
      throw new BadRequestException(
        `Файлыг унших боломжгүй: ${(error as Error).message}`,
      );
    }

    if (table.length < 2) {
      throw new BadRequestException("Гарчиг болон дор хаяж нэг мөр байх шаардлагатай");
    }

    const columns = mapColumns(table[0]);
    if (columns.product === undefined || columns.price === undefined) {
      throw new BadRequestException(
        'Гарчигт "бараа" болон "үнэ" багана байх ёстой (загварыг татаж авна уу)',
      );
    }

    const dryRun = Boolean(input.dryRun);
    const [products, warehouses, offers] = await Promise.all([
      this.prisma.product.findMany({ select: { id: true, slug: true, name: true } }),
      this.prisma.warehouse.findMany({ where: { supplierId } }),
      this.prisma.offer.findMany({ where: { supplierId }, select: { id: true, productId: true } }),
    ]);

    const bySlug = new Map(products.map((product) => [normalize(product.slug), product]));
    const byName = new Map(products.map((product) => [normalize(product.name), product]));
    const warehouseByName = new Map(
      warehouses.map((warehouse) => [normalize(warehouse.name), warehouse]),
    );
    const offerByProduct = new Map(offers.map((offer) => [offer.productId, offer.id]));

    const report: ImportReport = {
      total: table.length - 1,
      created: 0,
      updated: 0,
      stockUpdated: 0,
      skipped: 0,
      dryRun,
      rows: [],
    };
    const touched = new Set<string>();

    for (let index = 1; index < table.length; index += 1) {
      const line = table[index];
      const cell = (field: string): string | undefined =>
        columns[field] === undefined ? undefined : line[columns[field]];

      const key = (cell("product") ?? "").trim();
      const result: ImportRowResult = { row: index + 1, product: key, action: "skipped" };

      if (!key) {
        result.reason = "Барааны багана хоосон";
        report.skipped += 1;
        report.rows.push(result);
        continue;
      }

      const product = bySlug.get(normalize(key)) ?? byName.get(normalize(key));
      if (!product) {
        result.reason = "Бүтээгдэхүүн олдсонгүй";
        report.skipped += 1;
        report.rows.push(result);
        continue;
      }

      const price = parseAmount(cell("price"));
      if (price === null || price <= 0) {
        result.reason = "Үнэ буруу байна";
        report.skipped += 1;
        report.rows.push(result);
        continue;
      }

      const data = {
        price,
        bulkPrice: parseAmount(cell("bulkPrice")),
        bulkMinQty: parseAmount(cell("bulkMinQty")),
        unit: cell("unit")?.trim() || undefined,
        // Нэгж тутмын жин — хүргэлтийн машиныг үүгээр тодорхойлно.
        // Хоосон бол ангилал, нэгжээр таамаглана (common/logistics).
        weightKg: parseAmount(cell("weightKg")) ?? undefined,
        // Овор нь жингээс тусдаа хязгаар: 40 м³ дулаалга хөнгөн ч
        // 3 тонны тэвшинд (17 м³) нэг ачилтаар багтахгүй
        volumeM3: parseAmount(cell("volumeM3")) ?? undefined,
        deliveryPrice: parseAmount(cell("deliveryPrice")) ?? undefined,
        deliveryDays: parseAmount(cell("deliveryDays")),
      };

      const existingId = offerByProduct.get(product.id);
      let offerId = existingId ?? null;

      if (!dryRun) {
        if (existingId) {
          await this.prisma.offer.update({
            where: { id: existingId },
            data: { ...data, active: true },
          });
        } else {
          const created = await this.prisma.offer.create({
            data: {
              productId: product.id,
              supplierId,
              price: data.price,
              bulkPrice: data.bulkPrice,
              bulkMinQty: data.bulkMinQty,
              unit: data.unit ?? "ш",
              weightKg: data.weightKg,
              volumeM3: data.volumeM3,
              deliveryPrice: data.deliveryPrice ?? 0,
              deliveryDays: data.deliveryDays,
            },
          });
          offerId = created.id;
          offerByProduct.set(product.id, created.id);
        }
      }

      result.action = existingId ? "updated" : "created";
      result.price = price;
      if (existingId) report.updated += 1;
      else report.created += 1;
      touched.add(product.id);

      // Агуулах ба үлдэгдэл заасан бол тухайн салбарын үлдэгдлийг тавина
      const warehouseName = cell("warehouse")?.trim();
      const stock = parseAmount(cell("stock"));
      if (warehouseName && stock !== null) {
        const warehouse = warehouseByName.get(normalize(warehouseName));
        if (!warehouse) {
          result.reason = `"${warehouseName}" агуулах олдсонгүй — үлдэгдэл алгаслаа`;
        } else {
          result.warehouse = warehouse.name;
          result.stock = stock;
          report.stockUpdated += 1;
          if (!dryRun && offerId) {
            await this.prisma.inventory.upsert({
              where: { offerId_warehouseId: { offerId, warehouseId: warehouse.id } },
              create: { offerId, warehouseId: warehouse.id, quantity: stock },
              update: { quantity: stock },
            });
          }
        }
      }

      report.rows.push(result);
    }

    if (!dryRun) {
      for (const productId of touched) await this.meili.enqueueIndex(productId);
      this.logger.log(
        `Импорт: ${report.created} шинэ, ${report.updated} шинэчлэгдсэн, ${report.skipped} алгассан`,
      );
    }

    return report;
  }

  private supplierIdOf(user: AuthUser): string {
    if (!user.supplierId) throw new ForbiddenException("Нийлүүлэгч биш байна");
    return user.supplierId;
  }
}
