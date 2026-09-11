import { QpayClient } from "./qpay.client";

describe("QpayClient", () => {
  const env = { ...process.env };

  const enable = () => {
    process.env.QPAY_BASE_URL = "https://qpay.test/v2";
    process.env.QPAY_USERNAME = "user";
    process.env.QPAY_PASSWORD = "pass";
    process.env.QPAY_INVOICE_CODE = "TEST_INVOICE";
  };

  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it("тохиргоогүй үед идэвхгүй бөгөөд хүсэлт илгээхгүй", async () => {
    delete process.env.QPAY_USERNAME;
    delete process.env.QPAY_PASSWORD;
    delete process.env.QPAY_INVOICE_CODE;

    const client = new QpayClient();
    expect(client.enabled).toBe(false);
    await expect(client.checkPayment("INV-1")).rejects.toThrow(/QPay тохируулаагүй/);
  });

  it("нэхэмжлэх үүсгэж QR болон deeplink-ийг буцаана", async () => {
    enable();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
        const url = String(input);
        if (url.endsWith("/auth/token")) {
          return jsonResponse({ access_token: "token-1", expires_in: 3600 });
        }
        return jsonResponse({
          invoice_id: "INV-9",
          qr_text: "0002010102",
          qr_image: "base64==",
          urls: [{ name: "Khan", link: "khanbank://" }],
        });
      });

    const client = new QpayClient();
    const invoice = await client.createInvoice({
      orderCode: "100A-1",
      amount: 1000,
      description: "тест",
      callbackUrl: "https://api.barilgahub.mn/api/payments/qpay/callback",
    });

    expect(invoice).toEqual({
      invoiceId: "INV-9",
      qrText: "0002010102",
      qrImage: "base64==",
      urls: [{ name: "Khan", link: "khanbank://" }],
    });

    // Эхний дуудалт token, хоёр дахь нь нэхэмжлэх
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(body.invoice_code).toBe("TEST_INVOICE");
    expect(body.sender_invoice_no).toBe("100A-1");
  });

  it("токеныг хугацаа дуустал дахин ашиглана", async () => {
    enable();
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
        if (String(input).endsWith("/auth/token")) {
          return jsonResponse({ access_token: "token-1", expires_in: 3600 });
        }
        return jsonResponse({ count: 0, paid_amount: 0, rows: [] });
      });

    const client = new QpayClient();
    await client.checkPayment("INV-1");
    await client.checkPayment("INV-1");

    const tokenCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).endsWith("/auth/token"),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it("төлөгдсөн гүйлгээг таньж, гүйлгээний дугаарыг буцаана", async () => {
    enable();
    jest.spyOn(global, "fetch").mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith("/auth/token")) {
        return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      }
      return jsonResponse({
        count: 1,
        paid_amount: 74_700,
        rows: [{ payment_id: "TX-1", payment_status: "PAID" }],
      });
    });

    const result = await new QpayClient().checkPayment("INV-1");
    expect(result).toEqual({ paid: true, paidAmount: 74_700, transactionId: "TX-1" });
  });

  it("QPay алдаа буцаавал ойлгомжтой мессеж шидэнэ", async () => {
    enable();
    jest.spyOn(global, "fetch").mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith("/auth/token")) {
        return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      }
      return new Response("invoice not found", { status: 404 });
    });

    await expect(new QpayClient().checkPayment("INV-404")).rejects.toThrow(/QPay алдаа \(404\)/);
  });
});

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
