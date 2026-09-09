import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

interface QpayToken {
  value: string;
  expiresAt: number;
}

export interface QpayInvoice {
  invoiceId: string;
  qrText: string;
  qrImage: string | null;
  urls: { name: string; link: string }[];
}

export interface QpayPaymentCheck {
  paid: boolean;
  paidAmount: number;
  transactionId: string | null;
}

/**
 * QPay merchant API (v2) клиент. Хэрэглэгчийн нэр, нууц үг, нэхэмжлэхийн код
 * тохируулаагүй үед `enabled = false` болж, PaymentsService нь mock горимд
 * ажиллана (архитектурын баримтын 2-р хэсэг).
 */
@Injectable()
export class QpayClient {
  private readonly logger = new Logger(QpayClient.name);
  private readonly baseUrl = (
    process.env.QPAY_BASE_URL ?? "https://merchant.qpay.mn/v2"
  ).replace(/\/$/, "");
  private readonly username = process.env.QPAY_USERNAME ?? "";
  private readonly password = process.env.QPAY_PASSWORD ?? "";
  private readonly invoiceCode = process.env.QPAY_INVOICE_CODE ?? "";
  private token: QpayToken | null = null;

  get enabled(): boolean {
    return Boolean(this.username && this.password && this.invoiceCode);
  }

  /** Нэхэмжлэх үүсгэж QR болон банкны deeplink-ийг буцаана */
  async createInvoice(input: {
    orderCode: string;
    amount: number;
    description: string;
    callbackUrl: string;
    receiverCode?: string;
  }): Promise<QpayInvoice> {
    const data = await this.request<{
      invoice_id: string;
      qr_text: string;
      qr_image?: string;
      urls?: { name: string; link: string }[];
    }>("/invoice", {
      invoice_code: this.invoiceCode,
      sender_invoice_no: input.orderCode,
      invoice_receiver_code: input.receiverCode ?? "terminal",
      invoice_description: input.description,
      amount: input.amount,
      callback_url: input.callbackUrl,
    });

    return {
      invoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage: data.qr_image ?? null,
      urls: data.urls ?? [],
    };
  }

  /** Нэхэмжлэхийн төлбөр төлөгдсөн эсэхийг шалгана */
  async checkPayment(invoiceId: string): Promise<QpayPaymentCheck> {
    const data = await this.request<{
      count: number;
      paid_amount: number;
      rows?: { payment_id: string; payment_status: string }[];
    }>("/payment/check", {
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    });

    const row = data.rows?.find((item) => item.payment_status === "PAID");
    return {
      paid: (data.paid_amount ?? 0) > 0 || Boolean(row),
      paidAmount: data.paid_amount ?? 0,
      transactionId: row?.payment_id ?? null,
    };
  }

  /** Захиалга цуцлагдсан үед нэхэмжлэхийг устгана */
  async cancelInvoice(invoiceId: string): Promise<void> {
    await this.request(`/invoice/${invoiceId}`, undefined, "DELETE").catch((error) => {
      this.logger.warn(`Нэхэмжлэх цуцлахад алдаа: ${(error as Error).message}`);
    });
  }

  private async request<T>(
    path: string,
    body?: unknown,
    method: "POST" | "GET" | "DELETE" = body ? "POST" : "GET",
  ): Promise<T> {
    if (!this.enabled) {
      throw new ServiceUnavailableException("QPay тохируулаагүй байна");
    }

    const token = await this.accessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ServiceUnavailableException(
        `QPay алдаа (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }

  /** Токеныг хугацаа дуустал нь дахин ашиглана */
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.value;
    }

    const basic = Buffer.from(`${this.username}:${this.password}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ServiceUnavailableException(
        `QPay token авахад алдаа (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3000) * 1000,
    };
    return this.token.value;
  }
}
