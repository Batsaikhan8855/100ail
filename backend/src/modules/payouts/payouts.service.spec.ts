import { PayoutStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PayoutsService } from "./payouts.service";

const supplierUser = {
  id: "u1",
  email: "s@100ail.mn",
  role: "SUPPLIER" as const,
  supplierId: "sup-1",
  organizationId: null,
};

function build() {
  const prisma = {
    supplierOrder: { findMany: jest.fn().mockResolvedValue([]) },
    payout: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "p1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "p1", ...data })),
    },
    supplierBankAccount: { findUnique: jest.fn(), upsert: jest.fn() },
  } as unknown as PrismaService;

  const notifications = {
    push: jest.fn().mockResolvedValue(undefined),
    pushToSupplier: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  return { prisma, notifications, service: new PayoutsService(prisma, notifications) };
}

describe("PayoutsService", () => {
  it("шимтгэл болон өмнөх хүсэлтийг хассан үлдэгдлийг тооцно", async () => {
    const { prisma, service } = build();
    (prisma.supplierOrder.findMany as jest.Mock).mockResolvedValue([
      { total: 1_000_000, commission: { amount: 19_000 } },
      { total: 500_000, commission: { amount: 9_000 } },
    ]);
    (prisma.payout.findMany as jest.Mock).mockResolvedValue([
      { amount: 200_000, status: PayoutStatus.PAID },
      { amount: 100_000, status: PayoutStatus.REQUESTED },
    ]);

    const balance = await service.balance("sup-1");
    expect(balance.earned).toBe(1_500_000);
    expect(balance.commission).toBe(28_000);
    expect(balance.net).toBe(1_472_000);
    expect(balance.available).toBe(1_172_000);
  });

  it("зөвхөн төлбөр нь баталгаажсан захиалгыг тооцно", async () => {
    const { prisma, service } = build();
    await service.balance("sup-1");

    const where = (prisma.supplierOrder.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.order.status.in).toEqual(["PAID", "PROCESSING", "COMPLETED"]);
    expect(where.status.not).toBe("CANCELLED");
  });

  it("данс бүртгээгүй үед хүсэлт гаргуулахгүй", async () => {
    const { prisma, service } = build();
    (prisma.supplierBankAccount.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.request(supplierUser, { amount: 1000 })).rejects.toThrow(
      /дансны мэдээлл/i,
    );
  });

  it("үлдэгдлээс их дүн хүсэхэд алдаа өгнө", async () => {
    const { prisma, service } = build();
    (prisma.supplierBankAccount.findUnique as jest.Mock).mockResolvedValue({
      bankName: "Хаан банк",
      accountNo: "5001",
      accountName: "Монцемент ХХК",
    });
    (prisma.supplierOrder.findMany as jest.Mock).mockResolvedValue([
      { total: 100_000, commission: { amount: 2_000 } },
    ]);

    await expect(service.request(supplierUser, { amount: 99_000 })).rejects.toThrow(
      /боломжит үлдэгдэл/,
    );
  });

  it("хүсэлт үүсгээд дансны мэдээллийг хуулбарлан хадгална", async () => {
    const { prisma, notifications, service } = build();
    (prisma.supplierBankAccount.findUnique as jest.Mock).mockResolvedValue({
      bankName: "Хаан банк",
      accountNo: "5001",
      accountName: "Монцемент ХХК",
    });
    (prisma.supplierOrder.findMany as jest.Mock).mockResolvedValue([
      { total: 1_000_000, commission: { amount: 20_000 } },
    ]);

    const payout = await service.request(supplierUser, { amount: 500_000, note: "9 сар" });
    expect(payout).toMatchObject({
      supplierId: "sup-1",
      amount: 500_000,
      bankName: "Хаан банк",
      accountNo: "5001",
      note: "9 сар",
      requestedBy: "u1",
    });
    expect(notifications.push).toHaveBeenCalled();
  });

  it("нийлүүлэгч бусдын хүсэлтийг цуцалж чадахгүй", async () => {
    const { prisma, service } = build();
    (prisma.payout.findUnique as jest.Mock).mockResolvedValue({
      id: "p2",
      supplierId: "sup-2",
      status: PayoutStatus.REQUESTED,
    });

    await expect(service.cancel(supplierUser, "p2")).rejects.toThrow(/олдсонгүй/);
  });

  it("олгосон хүсэлтийн төлөв дахин өөрчлөгдөхгүй", async () => {
    const { prisma, service } = build();
    (prisma.payout.findUnique as jest.Mock).mockResolvedValue({
      id: "p1",
      supplierId: "sup-1",
      amount: 1000,
      status: PayoutStatus.PAID,
    });

    await expect(
      service.updateStatus("p1", { status: PayoutStatus.REJECTED }),
    ).rejects.toThrow(/Олгосон/);
  });

  it("шилжүүлсэн төлөвт огноо тэмдэглэж, нийлүүлэгчид мэдэгдэнэ", async () => {
    const { prisma, notifications, service } = build();
    (prisma.payout.findUnique as jest.Mock).mockResolvedValue({
      id: "p1",
      supplierId: "sup-1",
      amount: 500_000,
      status: PayoutStatus.APPROVED,
      reference: null,
      note: null,
      processedAt: null,
    });

    const updated = await service.updateStatus("p1", {
      status: PayoutStatus.PAID,
      reference: "TRX-99",
    });

    expect(updated).toMatchObject({ status: PayoutStatus.PAID, reference: "TRX-99" });
    expect(updated.processedAt).toBeInstanceOf(Date);
    expect(notifications.pushToSupplier).toHaveBeenCalledWith(
      "sup-1",
      expect.stringContaining("шилжүүлэг"),
      expect.any(String),
      "/commissions",
    );
  });
});
