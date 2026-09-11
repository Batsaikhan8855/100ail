import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { json, urlencoded } from "express";
import * as path from "path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { validateEnv } from "./common/env";

/**
 * `CORS_ORIGINS` дэх зөвшөөрөгдсөн эх сурвалжууд. Vercel-ийн preview
 * домэйн deploy бүрд өөрчлөгддөг тул `https://*.vercel.app` хэлбэрийн
 * орлуулагчийг дэмжинэ (`*` нь цэг агуулаагүй нэг хэсэгтэй тохирно).
 */
function corsOrigin(
  raw: string | undefined,
): (origin: string | undefined, done: (e: Error | null, ok?: boolean) => void) => void {
  const patterns = (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) =>
      value.includes("*")
        ? new RegExp(
            `^${value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]+")}$`,
          )
        : value,
    );

  return (origin, done) => {
    // Хөтчийн бус хүсэлт (curl, server-to-server) Origin илгээдэггүй
    if (!origin) return done(null, true);
    const allowed = patterns.some((pattern) =>
      typeof pattern === "string" ? pattern === origin : pattern.test(origin),
    );
    done(null, allowed);
  };
}

async function bootstrap(): Promise<void> {
  // Модуль ачаалахаас өмнө: буруу тохиргоог хүсэлт ирэх хүртэл нуухгүй
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api");
  // Дотоод медиа сан: S3 тохируулаагүй орчинд барааны зургийг эндээс өгнө
  // (`MEDIA_DIR`, түлхүүрийн нийтийн хаяг нь `S3_PUBLIC_URL`-ээр тодорхойлогдоно)
  app.useStaticAssets(path.resolve(process.env.MEDIA_DIR ?? "media"), {
    prefix: "/media/",
    maxAge: "7d",
    fallthrough: true,
  });
  // Excel импорт base64-ээр ирдэг тул үндсэн 100kb хязгаарыг тэлнэ
  app.use(json({ limit: "12mb" }));
  app.use(urlencoded({ extended: true, limit: "12mb" }));
  app.enableCors({ origin: corsOrigin(process.env.CORS_ORIGINS), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("barilgaHUB API")
    .setDescription("Барилгын материалын marketplace-ийн modular monolith API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 4000);
  // `0.0.0.0` — контейнерын гаднаас хандах боломжтой байх ёстой.
  // Railway/Docker дээр localhost дээр сонсвол хүсэлт огт хүрэхгүй.
  await app.listen(port, "0.0.0.0");
  console.log(`barilgaHUB API: http://localhost:${port}/api (docs: /api/docs)`);
}

void bootstrap();
