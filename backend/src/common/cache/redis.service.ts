import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Redis cache. `REDIS_URL` тохируулаагүй үед бүх үйлдэл чимээгүй алгасаж,
 * системийг Redis-гүйгээр ажиллуулах боломжтой (баримтын 2-р хэсэг).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.client = null;
      this.logger.log("REDIS_URL алга — cache идэвхгүй");
      return;
    }

    this.client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
    this.client.on("error", (error: Error) => {
      this.logger.warn(`Redis алдаа: ${error.message}`);
    });
    this.logger.log("Redis cache идэвхтэй");
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache уншилт амжилтгүй (${key}): ${(error as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache бичилт амжилтгүй (${key}): ${(error as Error).message}`);
    }
  }

  /** Тодорхой угтвартай түлхүүрүүдийг цэвэрлэнэ (өгөгдөл өөрчлөгдөх үед) */
  async invalidate(prefix: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) await this.client.del(...keys);
    } catch (error) {
      this.logger.warn(`Cache цэвэрлэлт амжилтгүй (${prefix}): ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }
}
