/**
 * Схем шинэчлэхийн өмнөх өгөгдлийн цэгцлэл.
 *
 * `prisma db push` нь шинэ хязгаарлалт нэмэхдээ одоогийн өгөгдөл түүнд
 * нийцэхийг шаарддаг. Жишээ нь `users.phone` дээр unique нэмэхэд
 * давхардсан дугаар байвал бүтэлгүйтэж, контейнер асахгүй болно.
 *
 * Энд зөвхөн түүхий SQL ашиглана — Prisma client нь хуучин схемээр
 * үүссэн байж болзошгүй. Хүснэгт хараахан үүсээгүй (анхны deploy) бол
 * алдаа өгөхгүйгээр алгасна.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function dedupePhones(): Promise<void> {
  // Утасны дугаарыг зөвхөн цифр болгоно: "9911-2233" → "99112233"
  await prisma.$executeRawUnsafe(
    `UPDATE users SET phone = regexp_replace(phone, '\\D', '', 'g')
     WHERE phone IS NOT NULL AND phone <> regexp_replace(phone, '\\D', '', 'g')`,
  );

  // Давхардсаныг ялгана — эхэлж бүртгүүлсэн нь дугаараа хадгална
  const changed = await prisma.$executeRawUnsafe(
    `WITH dupes AS (
       SELECT id, row_number() OVER (PARTITION BY phone ORDER BY "createdAt") AS rn
       FROM users WHERE phone IS NOT NULL
     )
     UPDATE users u SET phone = u.phone || d.rn::text
     FROM dupes d WHERE u.id = d.id AND d.rn > 1`,
  );

  if (changed > 0) {
    console.log(`[premigrate] ${changed} давхардсан утасны дугаар ялгав`);
  }
}

async function main(): Promise<void> {
  try {
    await dedupePhones();
  } catch (error) {
    // Анхны deploy дээр хүснэгт байхгүй — энэ хэвийн
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[premigrate] алгаслаа: ${message.split("\n")[0]}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Цэгцлэл бүтэлгүйтсэн ч схемийн шинэчлэлийг зогсоохгүй
void main();
