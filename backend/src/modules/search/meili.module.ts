import { Global, Module } from "@nestjs/common";
import { MeiliService } from "./meili.service";

/**
 * Индексжүүлэлтийг products, offers, inventory модулиуд дуудах тул
 * глобалаар нээнэ. SearchModule-ээс тусад нь байгаа нь модулийн
 * тойрог хамаарлаас сэргийлнэ.
 */
@Global()
@Module({
  providers: [MeiliService],
  exports: [MeiliService],
})
export class MeiliModule {}
