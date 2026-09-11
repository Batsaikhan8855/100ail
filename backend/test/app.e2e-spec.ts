import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma.service";

/**
 * Бүтэн урсгалын тест. PostgreSQL болон seed өгөгдөл шаардана:
 *   npm run db:push && npm run db:seed && npm run test:e2e
 * Тест өөрийн үүсгэсэн захиалга, сагс, нөөцлөлтөө буцаан цэвэрлэнэ.
 */
describe("BarilgaHUB API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const sessionId = `e2e-${Date.now()}`;
  let offerId = "";
  let orderCode = "";
  let supplierToken = "";
  let adminToken = "";
  const createdPayouts: string[] = [];
  const createdReviews: string[] = [];
  const qty = 4;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    // Захиалга, татан авалтын тест нэг нийлүүлэгч дээр төвлөрөх ёстой
    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { slug: "montsement" },
    });
    const offer = await prisma.offer.findFirstOrThrow({
      where: {
        active: true,
        supplierId: supplier.id,
        inventory: { some: { quantity: { gt: 20 } } },
      },
    });
    offerId = offer.id;

    const login = async (email: string) => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password: "password123" });
      return response.body.accessToken as string;
    };
    supplierToken = await login("montsement@barilgahub.mn");
    adminToken = await login("admin@barilgahub.mn");
  });

  afterAll(async () => {
    if (orderCode) {
      const order = await prisma.order.findUnique({ where: { code: orderCode } });
      if (order) await prisma.order.delete({ where: { id: order.id } });
      // Захиалга үүсэхэд нөөцлөгдсөн үлдэгдлийг буцаана
      const rows = await prisma.inventory.findMany({
        where: { offerId, reserved: { gt: 0 } },
      });
      let remaining = qty;
      for (const row of rows) {
        const take = Math.min(row.reserved, remaining);
        if (take <= 0) continue;
        await prisma.inventory.update({
          where: { id: row.id },
          data: { reserved: row.reserved - take },
        });
        remaining -= take;
      }
    }
    if (createdPayouts.length > 0) {
      await prisma.payout.deleteMany({ where: { id: { in: createdPayouts } } });
    }
    for (const id of createdReviews) {
      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) continue;
      await prisma.review.delete({ where: { id } });
      // Seed-ийн үнэлгээг сэргээнэ
      if (review.supplierId) {
        const rows = await prisma.review.findMany({
          where: { supplierId: review.supplierId },
        });
        const average = rows.length
          ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length
          : 0;
        await prisma.supplier.update({
          where: { id: review.supplierId },
          data: { rating: Number(average.toFixed(1)), reviewCount: rows.length },
        });
      }
    }
    await prisma.cart.deleteMany({ where: { sessionId } });
    await app.close();
  });

  describe("нээлттэй каталог", () => {
    it("ангиллын жагсаалтыг нэвтрэхгүйгээр өгнө", async () => {
      const response = await request(app.getHttpServer()).get("/api/categories").expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("бүтээгдэхүүнийг facet-ийн хамт хуудаслан өгнө", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/products?limit=3")
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      expect(response.body.facets).toHaveProperty("city");
      expect(response.body.facets).toHaveProperty("price");
      // Хамгийн хямд санал эхэнд байна
      const [first] = response.body.items;
      expect(first.bestOffer.price).toBe(first.minPrice);
    });

    it("хайлт нэр болон үйлдвэрлэгчээр ажиллана", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/search?q=${encodeURIComponent("цемент")}`)
        .expect(200);
      expect(response.body.items.length).toBeGreaterThan(0);
    });
  });

  describe("эрхийн хамгаалалт", () => {
    it("админы тайланг нэвтрэхгүйгээр авахыг хориглоно", async () => {
      await request(app.getHttpServer()).get("/api/reports/admin").expect(401);
    });

    it("худалдан авагч админы тайлан үзэхийг хориглоно", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "buyer@barilgahub.mn", password: "password123" })
        .expect(201);

      await request(app.getHttpServer())
        .get("/api/reports/admin")
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .expect(403);
    });

    it("нийлүүлэгч зөвхөн өөрийн саналаа хардаг", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "montsement@barilgahub.mn", password: "password123" })
        .expect(201);

      const supplierId = login.body.user.supplier.id;
      const offers = await request(app.getHttpServer())
        .get("/api/offers/mine")
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .expect(200);

      const ids = offers.body.map((offer: { id: string }) => offer.id);
      const foreign = await prisma.offer.findFirst({
        where: { supplierId: { not: supplierId } },
      });

      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain(foreign?.id);

      // Бусдын саналыг өөрчлөх оролдлого амжилтгүй байх ёстой
      await request(app.getHttpServer())
        .patch(`/api/offers/${foreign?.id}`)
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .send({ price: 1 })
        .expect(403);
    });
  });

  describe("зочны захиалгын урсгал", () => {
    it("сагсанд бараа нэмнэ", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/carts/items")
        .set("x-session-id", sessionId)
        .send({ offerId, qty })
        .expect(201);

      expect(response.body.count).toBe(1);
      expect(response.body.lines[0].qty).toBe(qty);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it("захиалгыг нийлүүлэгч тус бүрээр хувааж, шимтгэл бүртгэнэ", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("x-session-id", sessionId)
        .send({
          buyerName: "E2E худалдан авагч",
          phone: "99001122",
          city: "Улаанбаатар",
          address: "БЗД, 13-р хороо",
          paymentMethod: "QPAY",
        })
        .expect(201);

      orderCode = response.body.code;
      expect(response.body.status).toBe("PENDING");
      expect(response.body.supplierOrders.length).toBeGreaterThan(0);

      const [supplierOrder] = response.body.supplierOrders;
      expect(supplierOrder.commission.rate).toBeCloseTo(0.02);
      expect(supplierOrder.commission.amount).toBe(
        Math.round(supplierOrder.goodsTotal * 0.02),
      );
      // Хүргэлтийн бичилт дэд захиалга бүрд үүснэ
      expect(supplierOrder.delivery.trackingCode).toBeTruthy();
    });

    it("үлдэгдлийг нөөцөлнө", async () => {
      const reserved = await prisma.inventory.aggregate({
        where: { offerId },
        _sum: { reserved: true },
      });
      expect(reserved._sum.reserved ?? 0).toBeGreaterThanOrEqual(qty);
    });

    it("нэхэмжлэх үүсгэж, төлбөрийг баталгаажуулна", async () => {
      const invoice = await request(app.getHttpServer())
        .post("/api/payments/invoice")
        .send({ orderCode })
        .expect(201);

      // QPay тохируулаагүй орчинд mock нэхэмжлэх үүснэ
      expect(invoice.body.mode).toBe("mock");
      expect(invoice.body.amount).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .post("/api/payments/callback")
        .send({ invoiceId: invoice.body.invoiceId })
        .expect(201);

      const order = await request(app.getHttpServer())
        .get(`/api/orders/${orderCode}`)
        .expect(200);

      expect(order.body.status).toBe("PAID");
      expect(order.body.payment.status).toBe("PAID");
    });

    it("захиалга үүсэхэд сагс хоосорно", async () => {
      const cart = await request(app.getHttpServer())
        .get("/api/carts")
        .set("x-session-id", sessionId)
        .expect(200);
      expect(cart.body.count).toBe(0);
    });

    it("нийлүүлэгч захиалгын төлөвийг урагшлуулна", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "montsement@barilgahub.mn", password: "password123" });

      const orders = await request(app.getHttpServer())
        .get("/api/orders/supplier")
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .expect(200);

      const target = orders.body.find(
        (row: { orderCode: string }) => row.orderCode === orderCode,
      );
      if (!target) return; // Захиалга өөр нийлүүлэгчид оногдсон бол алгасна

      const updated = await request(app.getHttpServer())
        .patch(`/api/orders/supplier-orders/${target.id}/status`)
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .send({ status: "CONFIRMED" })
        .expect(200);

      expect(updated.body.status).toBe("CONFIRMED");
    });
  });

  describe("байршил ба сурталчилгаа", () => {
    it("байршлын үйлчилгээний тохиргоог нээлттэй өгнө", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/geo/config")
        .expect(200);
      expect(["mapbox", "osm"]).toContain(response.body.provider);
      expect(response.body.defaultCenter.lat).toBeGreaterThan(40);
    });

    it("агуулахуудыг зайгаар эрэмбэлж өгнө", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/geo/nearest-warehouses?lat=47.918&lng=106.917&limit=3")
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      const distances = response.body.map((row: { distanceKm: number }) => row.distanceKm);
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    });

    it("идэвхтэй баннерыг өгч, дарагдалтыг бүртгэнэ", async () => {
      const banners = await request(app.getHttpServer())
        .get("/api/banners?placement=HOME_HERO")
        .expect(200);
      expect(banners.body.length).toBeGreaterThan(0);

      const [banner] = banners.body;
      await request(app.getHttpServer())
        .post(`/api/banners/${banner.id}/click`)
        .expect(201);

      const after = await prisma.banner.findUniqueOrThrow({ where: { id: banner.id } });
      expect(after.clicks).toBe(banner.clicks + 1);
      expect(after.impressions).toBeGreaterThan(0);
    });

    it("баннер үүсгэхэд админ эрх шаардана", async () => {
      await request(app.getHttpServer())
        .post("/api/banners")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ title: "Тест", startsAt: new Date().toISOString(), endsAt: new Date().toISOString() })
        .expect(403);
    });
  });

  describe("Excel импорт", () => {
    it("файлыг эхлээд бичихгүйгээр урьдчилан харуулна", async () => {
      const offer = await prisma.offer.findFirstOrThrow({
        where: { id: offerId },
        include: { product: true },
      });

      const csv = ["бараа,үнэ", `${offer.product.slug},${offer.price}`].join("\n");
      const response = await request(app.getHttpServer())
        .post("/api/offers/import")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ content: Buffer.from(csv).toString("base64"), dryRun: true })
        .expect(201);

      expect(response.body.total).toBe(1);
      expect(response.body.dryRun).toBe(true);
      expect(response.body.rows[0].action).toMatch(/created|updated/);
    });

    it("буруу баганатай файлыг татгалзана", async () => {
      const csv = "нэр,тоо\nцемент,10";
      await request(app.getHttpServer())
        .post("/api/offers/import")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ content: Buffer.from(csv).toString("base64") })
        .expect(400);
    });

    it("загварыг нийлүүлэгчийн саналаар бөглөж өгнө", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/offers/import/template")
        .set("Authorization", `Bearer ${supplierToken}`)
        .expect(200);

      expect(response.body.fileName).toMatch(/\.csv$/);
      expect(response.body.content.split("\n")[0]).toContain("бараа");
    });
  });

  describe("татан авалт", () => {
    it("нийлүүлэгч боломжит үлдэгдлээ хараад хүсэлт гаргана", async () => {
      const overview = await request(app.getHttpServer())
        .get("/api/payouts/mine")
        .set("Authorization", `Bearer ${supplierToken}`)
        .expect(200);

      expect(overview.body.account).not.toBeNull();
      // Төлбөр баталгаажсан захиалгаас үлдэгдэл үүссэн байна
      expect(overview.body.balance.available).toBeGreaterThan(0);

      const created = await request(app.getHttpServer())
        .post("/api/payouts")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ amount: 1000, note: "e2e" })
        .expect(201);

      createdPayouts.push(created.body.id);
      expect(created.body.status).toBe("REQUESTED");
    });

    it("үлдэгдлээс их дүнг татгалзана", async () => {
      const overview = await request(app.getHttpServer())
        .get("/api/payouts/mine")
        .set("Authorization", `Bearer ${supplierToken}`);

      await request(app.getHttpServer())
        .post("/api/payouts")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ amount: overview.body.balance.available + 1_000_000 })
        .expect(400);
    });

    it("админ батлаад шилжүүлснийг тэмдэглэнэ", async () => {
      const [id] = createdPayouts;
      await request(app.getHttpServer())
        .patch(`/api/payouts/${id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APPROVED" })
        .expect(200);

      const paid = await request(app.getHttpServer())
        .patch(`/api/payouts/${id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "PAID", reference: "E2E-TRX" })
        .expect(200);

      expect(paid.body.status).toBe("PAID");
      expect(paid.body.reference).toBe("E2E-TRX");
      expect(paid.body.processedAt).toBeTruthy();
    });

    it("нийлүүлэгч бусдын хүсэлтийн жагсаалт үзэхгүй", async () => {
      await request(app.getHttpServer())
        .get("/api/payouts/all")
        .set("Authorization", `Bearer ${supplierToken}`)
        .expect(403);
    });
  });

  describe("сэтгэгдэл", () => {
    let productSlug = "";

    beforeAll(async () => {
      const offer = await prisma.offer.findUniqueOrThrow({
        where: { id: offerId },
        include: { product: true },
      });
      productSlug = offer.product.slug;
    });

    it("нэвтрээгүй хэрэглэгч сэтгэгдэл бичихгүй", async () => {
      await request(app.getHttpServer())
        .post("/api/reviews")
        .send({ productId: "x", authorName: "Зочин", rating: 5, text: "сайн" })
        .expect(401);
    });

    it("нэвтэрсэн хэрэглэгч сэтгэгдэл үлдээж, давхардуулахгүй", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "buyer@barilgahub.mn", password: "password123" });
      const token = login.body.accessToken;

      const eligibility = await request(app.getHttpServer())
        .get(`/api/reviews/eligibility/${productSlug}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(eligibility.body.canReview).toBe(true);

      const created = await request(app.getHttpServer())
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productId: eligibility.body.productId,
          authorName: "E2E худалдан авагч",
          rating: 4,
          text: "Хүргэлт хурдан, чанар сайн",
        })
        .expect(201);

      createdReviews.push(created.body.id);

      await request(app.getHttpServer())
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productId: eligibility.body.productId,
          authorName: "E2E худалдан авагч",
          rating: 5,
          text: "Дахин бичиж байна",
        })
        .expect(400);

      const list = await request(app.getHttpServer())
        .get(`/api/reviews/product/${productSlug}`)
        .expect(200);
      expect(list.body.some((row: { id: string }) => row.id === created.body.id)).toBe(true);
    });
  });
});
