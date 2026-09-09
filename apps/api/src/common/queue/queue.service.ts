import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const QUEUE_NAME = "100ail";

/**
 * Background job. `REDIS_URL` байвал BullMQ дараалалд, байхгүй бол
 * тухайн үйлдлийг шууд гүйцэтгэнэ. Модулиуд `register` -ээр өөрсдийн
 * ажлын нэрийг бүртгэнэ (баримтын 2, 5-р хэсэг).
 */
@Injectable()
export class QueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly url = process.env.REDIS_URL;
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  get enabled(): boolean {
    return Boolean(this.url);
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  /** Ажлыг дараалалд нэмнэ; Redis байхгүй бол шууд ажиллуулна */
  async enqueue(name: string, payload: Record<string, unknown> = {}): Promise<void> {
    if (this.queue) {
      await this.queue.add(name, payload, {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      });
      return;
    }
    await this.run(name, payload);
  }

  private async run(name: string, payload: Record<string, unknown>): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`"${name}" ажлын хариуцагч бүртгэгдээгүй байна`);
      return;
    }
    await handler(payload);
  }

  onApplicationBootstrap(): void {
    if (!this.url) {
      this.logger.log("REDIS_URL алга — ажлууд шууд горимоор гүйцэтгэгдэнэ");
      return;
    }

    const connection = { url: this.url, maxRetriesPerRequest: null };
    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => this.run(job.name, job.data as Record<string, unknown>),
      { connection, concurrency: 5 },
    );

    this.worker.on("failed", (job, error) => {
      this.logger.error(`Ажил амжилтгүй (${job?.name}): ${error.message}`);
    });
    this.logger.log(`BullMQ дараалал идэвхтэй: ${QUEUE_NAME}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
