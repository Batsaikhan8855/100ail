import { MeiliService } from "./meili.service";
import type { PrismaService } from "../../common/prisma.service";
import type { QueueService } from "../../common/queue/queue.service";

describe("MeiliService", () => {
  const env = { ...process.env };
  const prisma = {} as PrismaService;
  const queue = { register: jest.fn(), enqueue: jest.fn() } as unknown as QueueService;

  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it("MEILISEARCH_HOST байхгүй үед идэвхгүй", () => {
    delete process.env.MEILISEARCH_HOST;
    expect(new MeiliService(prisma, queue).enabled).toBe(false);
  });

  it("индекс бэлэн болоогүй үед хайлт null буцааж PostgreSQL руу шилжүүлнэ", async () => {
    process.env.MEILISEARCH_HOST = "http://localhost:7700";
    const service = new MeiliService(prisma, queue);
    await expect(service.searchIds("цемент", {})).resolves.toBeNull();
  });

  it("шүүлтүүрийг Meilisearch-ийн filter хэлбэрт хөрвүүлнэ", async () => {
    process.env.MEILISEARCH_HOST = "http://localhost:7700";
    const service = new MeiliService(prisma, queue);

    // Дуудалт бүрд шинэ Response — нэг Response-ийн body дахин уншигдахгүй
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async () =>
        new Response(JSON.stringify({ hits: [{ id: "p1" }] }), { status: 200 }),
      );

    await service.onApplicationBootstrap();
    const ids = await service.searchIds("цемент", {
      category: "cement",
      cities: ["Улаанбаатар", "Дархан"],
      suppliers: ["montsement"],
    });

    expect(ids).toEqual(["p1"]);
    const searchCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith("/search"),
    );
    const body = JSON.parse(String(searchCall?.[1]?.body));
    expect(body.q).toBe("цемент");
    expect(body.filter).toEqual([
      'categorySlug = "cement"',
      '(cities = "Улаанбаатар" OR cities = "Дархан")',
      '(supplierSlugs = "montsement")',
    ]);
  });

  it("индексжүүлэх ажлуудыг дараалалд бүртгэнэ", async () => {
    delete process.env.MEILISEARCH_HOST;
    const service = new MeiliService(prisma, queue);
    await service.onApplicationBootstrap();

    expect(queue.register).toHaveBeenCalledWith("search.index", expect.any(Function));
    expect(queue.register).toHaveBeenCalledWith("search.reindex", expect.any(Function));
  });
});
