import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { QpayClient } from "./qpay.client";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, QpayClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
