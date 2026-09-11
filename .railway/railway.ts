/**
 * Railway-ийн дэд бүтэц кодоор (Infrastructure as Code).
 *
 * Ашиглах:
 *   brew install railway   # эсвэл railway.com/install.sh
 *   npm install            # `railway` SDK — тохиргоог уншихад хэрэгтэй
 *   railway login && railway link
 *   npm run railway:plan   # ямар өөрчлөлт орохыг харуулна
 *   npm run railway:apply  # баталгаажуулсны дараа хэрэгжүүлнэ
 *
 * Яагаад `railway.json`/`railway.toml` биш вэ: Railway-ийн хуучин
 * «Config as Code» нь 2026-12-01-нд уншигдахаа болих бөгөөд ШИНЭ
 * сервис түүнийг ерөөсөө дэмжихгүй. Тиймээс энэ файл нь цорын ганц
 * ажиллах хувилбар.
 *
 * Frontend-ийн гурван апп Vercel дээр хэвээр — энд зөвхөн backend ба
 * түүний PostgreSQL байна.
 *
 * Redis болон Meilisearch энд байхгүй — тохируулаагүй үед код нь
 * доголдолгүй нөөц зам руу шилждэг (ажлууд шууд гүйцэтгэгдэж, хайлт
 * PostgreSQL дээр ажиллана). Ачаалал нэмэгдвэл дараа нь нэмнэ.
 */
import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

/**
 * Монголоос хамгийн ойр бүс — Render дээр Франкфурт байсныг Сингапур
 * болгов (сүлжээний хоцролт мэдэгдэхүйц бага). Сан, диск, сервис
 * гурав ижил бүсэд байх ёстой.
 */
const REGION = "asia-southeast1";

export default defineRailway(() => {
  const db = postgres("postgres", { region: REGION });

  /**
   * Хэрэглэгчийн байршуулсан файл (нэхэмжлэх, баримт) — `MEDIA_DIR`.
   * Диск байхгүй бол эдгээр нь deploy бүрд устана: контейнерын файлын
   * систем түр зуурынх. Барааны зураг энд ордоггүй — тэдгээр нь
   * frontend-ийн `public/media/` дотроос Vercel-ийн CDN-ээр өгөгддөг.
   */
  const media = volume("media", { region: REGION, sizeMB: 1024 });

  const api = service("api", {
    source: github("Batsaikhan8855/100ail", { branch: "main" }),

    // Repo-гийн үндсэн Dockerfile (контекст нь бас үндэс).
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      // Vercel дээрх frontend өөрчлөгдөхөд backend-ыг дахин барих
      // шаардлагагүй.
      watchPatterns: ["backend/**", "Dockerfile", ".railway/**"],
    },

    healthcheck: "/api/health",

    deploy: {
      region: REGION,
      // Render-ийн үнэгүй тарифаас нүүх гол шалтгаан: идэвхгүй үед
      // унтраахгүй, тиймээс хүйтэн асалт (30 сек) байхгүй.
      sleepApplication: false,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },

    volumeMounts: {
      "/app/media": media,
    },

    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      // Дискний холболтын зам — дээрх `volumeMounts`-той таарна.
      MEDIA_DIR: "/app/media",
      JWT_EXPIRES_IN: "7d",
      PLATFORM_COMMISSION_RATE: "0.02",

      // Доорхийг Railway-ийн самбараас нэг удаа тохируулна; `preserve()`
      // нь дараагийн `apply` тэдгээрийг дарж бичихээс сэргийлнэ.
      //
      //   JWT_SECRET      — санамсаргүй урт мөр
      //   CORS_ORIGINS    — Vercel-ийн домэйнууд, таслалаар,
      //                     жишээ нь `https://barilgahub.vercel.app,https://*.vercel.app`
      //   PUBLIC_API_URL  — энэ сервисийн нийтийн хаяг
      //   PUBLIC_WEB_URL  — storefront-ын хаяг
      //   S3_PUBLIC_URL   — барааны зургийн суурь, жишээ нь
      //                     `https://barilgahub.vercel.app/media`
      JWT_SECRET: preserve(),
      CORS_ORIGINS: preserve(),
      PUBLIC_API_URL: preserve(),
      PUBLIC_WEB_URL: preserve(),
      S3_PUBLIC_URL: preserve(),
    },
  });

  // `PORT`-ыг Railway өөрөө оноодог; `main.ts` нь `process.env.PORT`-ыг
  // уншаад `0.0.0.0` дээр сонсдог тул энд заах шаардлагагүй.

  // Railway дээрх төслийн нэр. `plan` нь энэ нэрийг бодит төслийнхтэй
  // тулгадаг тул самбар дээрх нэртэй яг тааруулж бичнэ — эс бөгөөс
  // дахин нэрлэх өөрчлөлт санал болгоно.
  return project("barilgaHUB", {
    resources: [db, media, api],
  });
});
