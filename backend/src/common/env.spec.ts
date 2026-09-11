import { envProblems, stripEmptyEnv } from "./env";

describe("env шалгуур", () => {
  const good = {
    DATABASE_URL: "postgresql://u:p@host:5432/db",
    JWT_SECRET: "B5ePw-u8bXz8f6bbzxIy9mO9qE0LpdfE5Qis",
    NODE_ENV: "production",
  } satisfies NodeJS.ProcessEnv;

  it("зөв тохиргоонд алдаа заахгүй", () => {
    expect(envProblems({ ...good })).toEqual([]);
  });

  it("хоосон хувьсагчийг устгаж, анхдагчийг сэргээнэ", () => {
    // Яг ийм зүйл production дээр тохиолдсон: JWT_EXPIRES_IN хоосон байснаас
    // `expiresIn: ""` болж очоод нэвтрэх бүрд 500 гардаг байв.
    const env: NodeJS.ProcessEnv = { JWT_EXPIRES_IN: "", KEEP: "7d" };
    expect(stripEmptyEnv(env)).toEqual(["JWT_EXPIRES_IN"]);
    expect("JWT_EXPIRES_IN" in env).toBe(false);
    expect(env.KEEP).toBe("7d");
  });

  it("зөвхөн зайнаас бүрдсэн утгыг ч хоосонд тооцно", () => {
    const env: NodeJS.ProcessEnv = { A: "   " };
    expect(stripEmptyEnv(env)).toEqual(["A"]);
  });

  it("задраагүй лавлагааг илрүүлнэ", () => {
    // Хаалт дутуу бичсэн `${Postgres.DATABASE_URL}` ийм хэлбэрээр ирдэг
    const [problem] = envProblems({ ...good, DATABASE_URL: "Postgres.DATABASE_URL" });
    expect(problem).toContain("postgresql://");
  });

  it("DATABASE_URL дутуу бол мэдэгдэнэ", () => {
    const { DATABASE_URL: _omit, ...rest } = good;
    expect(envProblems(rest)[0]).toContain("DATABASE_URL");
  });

  it("алдааны мессежид нууц үг задруулахгүй", () => {
    const [problem] = envProblems({ ...good, DATABASE_URL: "mysql://user:hunduulen@host/db" });
    expect(problem).not.toContain("hunduulen");
  });

  it("production дээрх dev түлхүүрийг зөвшөөрөхгүй", () => {
    for (const secret of ["dev-secret", "100ail-dev-secret-change-in-production", "change-me"]) {
      expect(envProblems({ ...good, JWT_SECRET: secret })).toHaveLength(1);
    }
  });

  it("хөгжүүлэлтийн орчинд dev түлхүүр зөвшөөрөгдөнө", () => {
    expect(
      envProblems({ ...good, NODE_ENV: "development", JWT_SECRET: "dev-secret" }),
    ).toEqual([]);
  });

  it("бүх алдааг нэг дор буцаана", () => {
    const { DATABASE_URL: _omit, ...rest } = good;
    expect(envProblems({ ...rest, JWT_SECRET: "dev-secret" })).toHaveLength(2);
  });
});
