import { QueueService } from "./queue.service";

describe("QueueService (Redis-гүй горим)", () => {
  const previous = process.env.REDIS_URL;

  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    if (previous) process.env.REDIS_URL = previous;
  });

  it("REDIS_URL байхгүй үед идэвхгүй гэж мэдээлнэ", () => {
    expect(new QueueService().enabled).toBe(false);
  });

  it("бүртгэсэн ажлыг шууд гүйцэтгэнэ", async () => {
    const queue = new QueueService();
    const handler = jest.fn().mockResolvedValue(undefined);
    queue.register("test.job", handler);

    await queue.enqueue("test.job", { id: "1" });

    expect(handler).toHaveBeenCalledWith({ id: "1" });
  });

  it("бүртгэгдээгүй ажил алдаа шидэхгүй", async () => {
    const queue = new QueueService();
    await expect(queue.enqueue("unknown.job")).resolves.toBeUndefined();
  });
});
