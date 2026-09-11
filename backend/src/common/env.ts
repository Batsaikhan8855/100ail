/**
 * Орчны хувьсагчдын шалгуур — сервер асах үед нэг удаа ажиллана.
 *
 * Хоёр зүйлийг шийднэ:
 *
 * 1. **Хоосон утга нь анхдагчийг идэвхгүй болгодог.** `ConfigService.get(key,
 *    default)` нь зөвхөн хувьсагч ОГТ байхгүй үед анхдагчийг хэрэглэдэг —
 *    хоосон мөр (`""`) нь "утга байна" гэж тооцогдоно. Байршуулалтын самбар
 *    дээр хувьсагчийг утгагүй үлдээхэд яг ийм болдог: `JWT_EXPIRES_IN=""` нь
 *    `expiresIn: ""` болж очоод зөвхөн хэн нэгэн нэвтрэх гэж оролдох үед
 *    500 болж мэдэгддэг байв. Тиймээс хоосон хувьсагчдыг эхлээд арилгана —
 *    ингэснээр «тохируулаагүй» гэдэг нь «байхгүй» гэсэн утгатай нэгдэнэ.
 *
 * 2. **Дутуу тохиргоо шууд мэдэгдэх ёстой.** Буруу `DATABASE_URL` эсвэл
 *    production дээрх dev түлхүүр нь хүсэлт ирэх хүртэл нуугддаггүй байх
 *    хэрэгтэй — сервер асахдаа тодорхой мессежтэй зогсоно.
 */

/** Нууц үг агуулсан утгыг логд бүтнээр нь хэвлэхгүй */
const preview = (value: string): string => {
  const scheme = value.split("://")[0];
  return scheme && scheme !== value ? `${scheme}://…` : `${value.slice(0, 8)}…`;
};

/**
 * Хоосон (эсвэл зөвхөн зайнаас бүрдсэн) хувьсагчдыг устгана.
 * Устгасан түлхүүрүүдийг буцаана — дуудагч нь логд бичиж болно.
 */
export function stripEmptyEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const removed: string[] = [];
  for (const key of Object.keys(env)) {
    const value = env[key];
    if (typeof value === "string" && value.trim() === "") {
      delete env[key];
      removed.push(key);
    }
  }
  return removed;
}

/**
 * Тохиргооны алдаануудыг жагсаана (хоосон бол бүх зүйл хэвийн).
 * Нэг нэгээр нь биш, бүгдийг нь нэг дор буцаадаг — нэг deploy дээр
 * бүх алдааг харах нь дараалан нэг нэгээр засахаас хурдан.
 */
export function envProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];

  const url = env.DATABASE_URL;
  if (!url) {
    problems.push("DATABASE_URL тохируулаагүй байна.");
  } else if (!/^postgres(ql)?:\/\//.test(url)) {
    problems.push(
      `DATABASE_URL нь "postgresql://" эсвэл "postgres://"-ээр эхлэх ёстой ` +
        `(одоо: "${preview(url)}"). Байршуулалтын самбар дээр лавлагаа ` +
        "ашиглаж байгаа бол хаалтууд нь бүтэн эсэхийг шалгана уу.",
    );
  }

  // Dev түлхүүр нь repo болон хөгжүүлэгчийн машин дээр байдаг тул түүгээр
  // гарын үсэг зурсан token-ыг хэн ч хуурамчаар үүсгэж чадна.
  if (env.NODE_ENV === "production") {
    const secret = env.JWT_SECRET;
    if (!secret) {
      problems.push("JWT_SECRET тохируулаагүй байна (production-д заавал).");
    } else if (/dev-secret|change-me|change-in-production/i.test(secret)) {
      problems.push(
        "JWT_SECRET нь хөгжүүлэлтийн жишээ утга хэвээр байна — " +
          "санамсаргүй урт мөрөөр солино уу.",
      );
    }
  }

  return problems;
}

/**
 * Хоосон хувьсагчдыг арилгаад шалгана. Алдаатай бол процессыг зогсооно:
 * буруу тохиргоотой ажиллахаас асахгүй байсан нь дээр.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const removed = stripEmptyEnv(env);
  if (removed.length > 0) {
    console.log(
      `[env] хоосон хувьсагчдыг үл тоов: ${removed.join(", ")} ` +
        "(анхдагч утга хэрэглэгдэнэ)",
    );
  }

  const problems = envProblems(env);
  if (problems.length > 0) {
    console.error("[env] Тохиргооны алдаа:");
    for (const problem of problems) console.error(`  • ${problem}`);
    process.exit(1);
  }
}
