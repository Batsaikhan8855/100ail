import { MessengerService } from "./messenger.service";

describe("MessengerService", () => {
  const env = { ...process.env };
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  const message = { subject: "Захиалга", text: "Төлбөр баталгаажлаа" };

  it("тохиргоогүй үед идэвхгүй бөгөөд гадагш хандахгүй", async () => {
    delete process.env.MAIL_WEBHOOK_URL;
    delete process.env.SMS_GATEWAY_URL;

    const messenger = new MessengerService();
    await expect(
      messenger.send({ ...message, email: "a@barilgahub.mn", phone: "99001122" }),
    ).resolves.toBe(false);
    expect(messenger.enabled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("имэйл ба SMS хоёуланг тохируулсан сувгаар илгээнэ", async () => {
    process.env.MAIL_WEBHOOK_URL = "https://mail.test/send";
    process.env.MAIL_WEBHOOK_TOKEN = "token";
    process.env.SMS_GATEWAY_URL = "https://sms.test/send";
    fetchMock.mockResolvedValue({ ok: true });

    const messenger = new MessengerService();
    await expect(
      messenger.send({ ...message, email: "a@barilgahub.mn", phone: "99001122" }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [mailUrl, mailInit] = fetchMock.mock.calls[0];
    expect(mailUrl).toBe("https://mail.test/send");
    expect((mailInit.headers as Record<string, string>).Authorization).toBe("Bearer token");
    expect(JSON.parse(mailInit.body as string).to).toBe("a@barilgahub.mn");
  });

  it("суваг унасан үед алдаа шидэлгүй false буцаана", async () => {
    process.env.MAIL_WEBHOOK_URL = "https://mail.test/send";
    delete process.env.SMS_GATEWAY_URL;
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const messenger = new MessengerService();
    await expect(messenger.send({ ...message, email: "a@barilgahub.mn" })).resolves.toBe(false);
  });

  it("хэрэглэгчийн хаяг байхгүй бол тухайн сувгийг алгасна", async () => {
    process.env.SMS_GATEWAY_URL = "https://sms.test/send";
    delete process.env.MAIL_WEBHOOK_URL;
    fetchMock.mockResolvedValue({ ok: true });

    const messenger = new MessengerService();
    await messenger.send({ ...message, email: "a@barilgahub.mn", phone: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
