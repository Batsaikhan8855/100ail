import { PrismaService } from "../../common/prisma.service";
import { MeiliService } from "../search/meili.service";
import { mapColumns, OfferImportService, parseAmount } from "./offer-import.service";

const user = {
  id: "u1",
  email: "s@barilgahub.mn",
  role: "SUPPLIER" as const,
  supplierId: "sup-1",
  organizationId: null,
};

const csv = (text: string) => Buffer.from(text, "utf8").toString("base64");

function build() {
  const prisma = {
    product: {
      findMany: jest.fn().mockResolvedValue([
        { id: "p-cement", slug: "portland-m400", name: "Портланд цемент M400" },
        { id: "p-rebar", slug: "rebar-d12", name: "Арматур D12" },
      ]),
    },
    warehouse: {
      findMany: jest.fn().mockResolvedValue([
        { id: "w1", name: "Төв агуулах", supplierId: "sup-1" },
      ]),
    },
    offer: {
      findMany: jest.fn().mockResolvedValue([{ id: "o-cement", productId: "p-cement" }]),
      create: jest.fn().mockResolvedValue({ id: "o-new" }),
      update: jest.fn().mockResolvedValue({ id: "o-cement" }),
    },
    inventory: { upsert: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  const meili = { enqueueIndex: jest.fn().mockResolvedValue(undefined) } as unknown as MeiliService;
  return { prisma, meili, service: new OfferImportService(prisma, meili) };
}

describe("mapColumns", () => {
  it("монгол болон англи гарчгийг таньна", () => {
    expect(mapColumns(["Бараа", "Үнэ", "Бөөний үнэ", "Агуулах", "Үлдэгдэл"])).toEqual({
      product: 0,
      price: 1,
      bulkPrice: 2,
      warehouse: 3,
      stock: 4,
    });
    expect(mapColumns(["product", "price", "unit"])).toEqual({
      product: 0,
      price: 1,
      unit: 2,
    });
  });

  it("жин, овор хоёрыг хооронд нь андуурахгүй", () => {
    expect(mapColumns(["Бараа", "Үнэ", "Нэгжийн жин", "Нэгжийн овор"])).toEqual({
      product: 0,
      price: 1,
      weightKg: 2,
      volumeM3: 3,
    });
    expect(mapColumns(["product", "price", "volume", "weight"])).toEqual({
      product: 0,
      price: 1,
      volumeM3: 2,
      weightKg: 3,
    });
  });
});

describe("parseAmount", () => {
  it("төгрөгийн тэмдэг, таслал, зайг цэвэрлэнэ", () => {
    expect(parseAmount("24,900₮")).toBe(24900);
    expect(parseAmount("24 900")).toBe(24900);
    expect(parseAmount("1000.6")).toBe(1001);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("тодорхойгүй")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
});

describe("OfferImportService", () => {
  it("байгаа саналыг шинэчилж, шинийг үүсгэж, үлдэгдлийг тавина", async () => {
    const { prisma, meili, service } = build();
    const report = await service.import(user, {
      content: csv(
        [
          "бараа,үнэ,бөөний үнэ,нэгж,агуулах,үлдэгдэл",
          "portland-m400,24900,23500,ш,Төв агуулах,3200",
          "Арматур D12,1850,,м,Төв агуулах,900",
        ].join("\n"),
      ),
    });

    expect(report).toMatchObject({ total: 2, created: 1, updated: 1, stockUpdated: 2, skipped: 0 });
    expect(prisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "o-cement" } }),
    );
    expect(prisma.offer.create).toHaveBeenCalled();
    expect(prisma.inventory.upsert).toHaveBeenCalledTimes(2);
    expect(meili.enqueueIndex).toHaveBeenCalledTimes(2);
  });

  it("олдоогүй бараа, буруу үнийг шалтгаантайгаар алгасна", async () => {
    const { prisma, service } = build();
    const report = await service.import(user, {
      content: csv(
        [
          "бараа,үнэ",
          "байхгүй-бараа,1000",
          "portland-m400,үнэгүй",
          "portland-m400,24900",
        ].join("\n"),
      ),
    });

    expect(report.skipped).toBe(2);
    expect(report.rows[0].reason).toMatch(/олдсонгүй/);
    expect(report.rows[1].reason).toMatch(/Үнэ/);
    expect(prisma.offer.update).toHaveBeenCalledTimes(1);
  });

  it("dryRun горимд өгөгдөл бичихгүй", async () => {
    const { prisma, meili, service } = build();
    const report = await service.import(user, {
      content: csv("бараа,үнэ\nportland-m400,25500"),
      dryRun: true,
    });

    expect(report).toMatchObject({ dryRun: true, updated: 1 });
    expect(prisma.offer.update).not.toHaveBeenCalled();
    expect(prisma.offer.create).not.toHaveBeenCalled();
    expect(meili.enqueueIndex).not.toHaveBeenCalled();
  });

  it("бусдын агуулахын нэр таарахгүй бол үлдэгдлийг алгасна", async () => {
    const { prisma, service } = build();
    const report = await service.import(user, {
      content: csv("бараа,үнэ,агуулах,үлдэгдэл\nportland-m400,24900,Бусдын агуулах,10"),
    });

    expect(report.stockUpdated).toBe(0);
    expect(report.rows[0].reason).toMatch(/агуулах олдсонгүй/);
    expect(prisma.inventory.upsert).not.toHaveBeenCalled();
  });

  it("шаардлагатай багана дутуу бол ойлгомжтой алдаа өгнө", async () => {
    const { service } = build();
    await expect(
      service.import(user, { content: csv("нэр,тоо\nцемент,10") }),
    ).rejects.toThrow(/багана байх ёстой/);
  });

  it("нийлүүлэгч биш хэрэглэгч импорт хийхгүй", async () => {
    const { service } = build();
    await expect(
      service.import(
        { ...user, supplierId: null },
        { content: csv("бараа,үнэ\nportland-m400,1") },
      ),
    ).rejects.toThrow(/Нийлүүлэгч биш/);
  });
});
