import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { json, urlencoded } from "express";
import * as path from "path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
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
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("100 Айл API")
    .setDescription("Барилгын материалын marketplace-ийн modular monolith API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`100 Айл API: http://localhost:${port}/api (docs: /api/docs)`);
}

void bootstrap();
