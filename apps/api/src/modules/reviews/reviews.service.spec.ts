import { PrismaService } from "../../common/prisma.service";
import { ReviewsService } from "./reviews.service";

function build() {
  const prisma = {
    review: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "r1", ...data })),
      findMany: jest.fn().mockResolvedValue([{ rating: 4 }, { rating: 5 }]),
      delete: jest.fn(),
    },
    orderItem: { findFirst: jest.fn().mockResolvedValue(null) },
    product: { findUnique: jest.fn().mockResolvedValue({ id: "p1" }) },
    supplier: { update: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  return { prisma, service: new ReviewsService(prisma) };
}

const input = {
  productId: "p1",
  authorName: "Болд",
  rating: 5,
  text: "Чанартай цемент",
  userId: "u1",
};

describe("ReviewsService", () => {
  it("үнэлгээ 1-5-аас гадуур бол татгалзана", async () => {
    const { service } = build();
    await expect(service.create({ ...input, rating: 6 })).rejects.toThrow(/1-5/);
    await expect(service.create({ ...input, rating: 0 })).rejects.toThrow(/1-5/);
  });

  it("хэт богино сэтгэгдлийг хүлээж авахгүй", async () => {
    const { service } = build();
    await expect(service.create({ ...input, text: "ok" })).rejects.toThrow(/богино/);
  });

  it("нэг хэрэглэгч нэг бараанд давхар сэтгэгдэл бичихгүй", async () => {
    const { prisma, service } = build();
    (prisma.review.findFirst as jest.Mock).mockResolvedValue({ id: "r0" });
    await expect(service.create(input)).rejects.toThrow(/үлдээсэн байна/);
  });

  it("худалдаж авсан хэрэглэгчийн сэтгэгдлийг баталгаажуулж нийлүүлэгчид холбоно", async () => {
    const { prisma, service } = build();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({
      supplierOrder: { supplierId: "sup-1", supplier: { name: "Монцемент" } },
    });

    const review = await service.create(input);
    expect(review).toMatchObject({ verifiedPurchase: true, supplierId: "sup-1" });
    expect(prisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sup-1" },
        data: { rating: 4.5, reviewCount: 2 },
      }),
    );
  });

  it("худалдан авалтгүй үед verifiedPurchase тэмдэглэхгүй", async () => {
    const { service } = build();
    const review = await service.create(input);
    expect(review.verifiedPurchase).toBe(false);
  });

  it("eligibility нь давхар сэтгэгдэл, худалдан авалтыг мэдээлнэ", async () => {
    const { prisma, service } = build();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({
      supplierOrder: { supplierId: "sup-1", supplier: { name: "Монцемент" } },
    });

    await expect(service.eligibility("u1", "portland-m400")).resolves.toMatchObject({
      canReview: true,
      verifiedPurchase: true,
      supplierName: "Монцемент",
    });

    (prisma.review.findFirst as jest.Mock).mockResolvedValue({ id: "r0" });
    await expect(service.eligibility("u1", "portland-m400")).resolves.toMatchObject({
      canReview: false,
      alreadyReviewed: true,
    });
  });
});
