import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { MessengerService } from "../../common/notify/messenger.service";
import { PrismaService } from "../../common/prisma.service";
import { QueueService } from "../../common/queue/queue.service";

export const NOTIFICATION_JOB = "notification.push";
export const SUPPLIER_NOTIFICATION_JOB = "notification.supplier";

export interface NotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  /** Апп доторх холбоос, жишээ нь `/orders/AIL-2409` */
  link?: string | null;
}

/**
 * Мэдэгдэл. Redis байвал BullMQ дараалалаар, байхгүй бол шууд бичигдэнэ
 * (архитектурын баримтын 2, 5-р хэсэг). Бичсэний дараа имэйл/SMS суваг
 * тохируулсан бол тэр рүү давхар илгээнэ.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly messenger: MessengerService,
  ) {}

  onModuleInit(): void {
    this.queue.register(NOTIFICATION_JOB, async (payload) => {
      await this.write(payload as unknown as NotificationInput);
    });
    this.queue.register(SUPPLIER_NOTIFICATION_JOB, async (payload) => {
      const { supplierId, title, body, link } = payload as {
        supplierId: string;
        title: string;
        body: string;
        link?: string | null;
      };
      const users = await this.prisma.user.findMany({ where: { supplierId } });
      for (const user of users) {
        await this.write({
          userId: user.id,
          type: NotificationType.ORDER,
          title,
          body,
          link: link ?? null,
        });
      }
    });
  }

  /** Мэдэгдлийг дараалалд өгнө */
  async push(input: NotificationInput): Promise<void> {
    await this.queue.enqueue(NOTIFICATION_JOB, { ...input });
  }

  /** Нийлүүлэгчийн бүх ажилтанд мэдэгдэнэ */
  async pushToSupplier(
    supplierId: string,
    title: string,
    body: string,
    link?: string,
  ): Promise<void> {
    await this.queue.enqueue(SUPPLIER_NOTIFICATION_JOB, {
      supplierId,
      title,
      body,
      link: link ?? null,
    });
  }

  private async write(input: NotificationInput) {
    this.logger.log(`Мэдэгдэл: ${input.title} -> ${input.userId}`);

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type ?? NotificationType.SYSTEM,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });

    if (!this.messenger.enabled) return notification;

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, phone: true },
    });

    const delivered = await this.messenger.send({
      email: user?.email,
      phone: user?.phone,
      subject: input.title,
      text: input.body,
      link: input.link ? `${process.env.PUBLIC_WEB_URL ?? ""}${input.link}` : null,
    });

    if (!delivered) return notification;
    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** Хонхны тоолуур */
  async unreadCount(userId: string) {
    return { unread: await this.prisma.notification.count({ where: { userId, read: false } }) };
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
