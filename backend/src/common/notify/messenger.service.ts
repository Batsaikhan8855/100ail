import { Injectable, Logger } from "@nestjs/common";

export interface OutboundMessage {
  email?: string | null;
  phone?: string | null;
  subject: string;
  text: string;
  link?: string | null;
}

/**
 * Мэдэгдлийг апп-аас гадагш (имэйл, SMS) хүргэх давхарга.
 *
 * Бусад нэгтгэлийн адил зарчим: `MAIL_WEBHOOK_URL` / `SMS_GATEWAY_URL`
 * тохируулсан бол тухайн үйлчилгээ рүү POST хийнэ, тохируулаагүй бол
 * зөвхөн log-д бичээд мэдэгдэл нь DB-д хэвээр үлдэнэ. Ингэснээр
 * хөгжүүлэлтэд гуравдагч данс шаардахгүй (баримтын 12.4-р хэсэг).
 */
@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly mailUrl = process.env.MAIL_WEBHOOK_URL ?? "";
  private readonly mailToken = process.env.MAIL_WEBHOOK_TOKEN ?? "";
  private readonly mailFrom = process.env.MAIL_FROM ?? "barilgaHUB <no-reply@barilgahub.mn>";
  private readonly smsUrl = process.env.SMS_GATEWAY_URL ?? "";
  private readonly smsToken = process.env.SMS_GATEWAY_TOKEN ?? "";

  get mailEnabled(): boolean {
    return this.mailUrl.length > 0;
  }

  get smsEnabled(): boolean {
    return this.smsUrl.length > 0;
  }

  get enabled(): boolean {
    return this.mailEnabled || this.smsEnabled;
  }

  /**
   * Аль тохируулсан сувгаар нь илгээнэ. Нэг ч суваг амжилттай болбол
   * `true` буцаана; илгээгээгүй үед мэдэгдэл зөвхөн апп дотор харагдана.
   */
  async send(message: OutboundMessage): Promise<boolean> {
    const results = await Promise.all([
      message.email ? this.sendMail(message.email, message) : Promise.resolve(false),
      message.phone ? this.sendSms(message.phone, message) : Promise.resolve(false),
    ]);

    const delivered = results.some(Boolean);
    if (!delivered && !this.enabled) {
      this.logger.log(
        `Гадагш илгээх суваг тохируулаагүй — "${message.subject}" зөвхөн апп дотор`,
      );
    }
    return delivered;
  }

  private async sendMail(to: string, message: OutboundMessage): Promise<boolean> {
    if (!this.mailEnabled) return false;
    return this.post(this.mailUrl, this.mailToken, {
      from: this.mailFrom,
      to,
      subject: message.subject,
      text: message.link ? `${message.text}\n\n${message.link}` : message.text,
    });
  }

  private async sendSms(to: string, message: OutboundMessage): Promise<boolean> {
    if (!this.smsEnabled) return false;
    // SMS-д гарчиг, текстийг нийлүүлж 300 тэмдэгтэд багтаана
    const text = `${message.subject}: ${message.text}`.slice(0, 300);
    return this.post(this.smsUrl, this.smsToken, { to, text });
  }

  private async post(
    url: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        this.logger.warn(`Мэдэгдэл илгээх амжилтгүй (${response.status}): ${url}`);
        return false;
      }
      return true;
    } catch (error) {
      // Гадаад суваг унасан ч захиалгын урсгал зогсохгүй
      this.logger.warn(`Мэдэгдлийн суваг алдаа: ${(error as Error).message}`);
      return false;
    }
  }
}
