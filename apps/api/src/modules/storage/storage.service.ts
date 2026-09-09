import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/**
 * S3-той нийцтэй файл хадгалалт: барааны зураг, нэхэмжлэх, баримт
 * (архитектурын баримтын 2-р хэсэг). Тохиргоо байхгүй үед presign
 * хүсэлт 503 буцаана, харин `publicUrl` нь одоо байгаа түлхүүрүүдийг
 * задлан уншиж чадна.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.S3_BUCKET ?? "";
  private readonly endpoint = process.env.S3_ENDPOINT ?? "";
  private readonly publicBase = process.env.S3_PUBLIC_URL ?? "";
  private readonly client: S3Client | null;

  constructor() {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!this.bucket || !accessKeyId || !secretAccessKey) {
      this.client = null;
      this.logger.log("S3 тохируулаагүй — файл байршуулалт идэвхгүй");
      return;
    }

    this.client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(`S3 идэвхтэй: ${this.bucket}`);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** Клиент талаас шууд байршуулах түр хугацааны URL */
  async presignUpload(input: {
    contentType: string;
    folder?: string;
    fileName?: string;
  }): Promise<{ key: string; uploadUrl: string; publicUrl: string; expiresIn: number }> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "S3 тохируулаагүй байна (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)",
      );
    }

    const extension =
      EXTENSIONS[input.contentType] ??
      input.fileName?.split(".").pop()?.toLowerCase() ??
      "bin";
    const folder = (input.folder ?? "products").replace(/[^a-z0-9/-]/gi, "");
    const key = `${folder}/${randomUUID()}.${extension}`;
    const expiresIn = 900;

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: input.contentType,
      }),
      { expiresIn },
    );

    return { key, uploadUrl, publicUrl: this.publicUrl(key), expiresIn };
  }

  /** Түлхүүрээс нийтэд харагдах хаяг */
  publicUrl(key: string): string {
    if (/^https?:\/\//.test(key)) return key;
    if (this.publicBase) return `${this.publicBase.replace(/\/$/, "")}/${key}`;
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async remove(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
