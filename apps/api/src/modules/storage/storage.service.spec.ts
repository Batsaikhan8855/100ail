import { StorageService } from "./storage.service";

describe("StorageService", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("тохиргоогүй үед идэвхгүй бөгөөд presign 503 алдаа буцаана", async () => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const storage = new StorageService();
    expect(storage.enabled).toBe(false);
    await expect(storage.presignUpload({ contentType: "image/png" })).rejects.toThrow(
      /S3 тохируулаагүй/,
    );
  });

  it("нийтийн хаягийг S3_PUBLIC_URL-ээр үүсгэнэ", () => {
    process.env.S3_PUBLIC_URL = "https://cdn.100ail.mn/";
    const storage = new StorageService();
    expect(storage.publicUrl("products/a.png")).toBe("https://cdn.100ail.mn/products/a.png");
  });

  it("бүрэн хаягийг дахин угтваргүйгээр буцаана", () => {
    process.env.S3_PUBLIC_URL = "https://cdn.100ail.mn";
    const storage = new StorageService();
    const url = "https://example.com/a.png";
    expect(storage.publicUrl(url)).toBe(url);
  });

  it("тохиргоотой үед presigned PUT URL үүсгэнэ", async () => {
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";

    const storage = new StorageService();
    const result = await storage.presignUpload({
      contentType: "image/png",
      folder: "products",
    });

    expect(storage.enabled).toBe(true);
    expect(result.key).toMatch(/^products\/[0-9a-f-]+\.png$/);
    expect(result.uploadUrl).toContain("http://localhost:9000/test-bucket/products/");
    expect(result.uploadUrl).toContain("X-Amz-Signature");
  });
});
