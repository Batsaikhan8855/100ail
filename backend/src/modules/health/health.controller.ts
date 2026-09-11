import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";

/**
 * Хөнгөн амьд байдлын шалгуур.
 *
 * Railway-ийн health check (`.railway/railway.ts` дахь `healthcheck`)
 * үүнийг ашиглана — Swagger-ийн `/api/docs` нь хэдэн КБ HTML буцаадаг
 * тул шалгуурт тохиромжгүй. Мэдээллийн сан руу огт хандахгүй: зорилго
 * нь процесс хүсэлт хүлээж авах болсон эсэхийг мэдэх.
 */
@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", uptime: Math.round(process.uptime()) };
  }
}
