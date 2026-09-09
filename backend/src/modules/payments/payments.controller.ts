import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PaymentMethod, UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post("invoice")
  createInvoice(@Body() body: { orderCode: string; method?: PaymentMethod }) {
    return this.payments.createInvoice(body.orderCode, body.method);
  }

  /** Банк, QPay-ээс ирэх callback */
  @Public()
  @Post("callback")
  confirm(@Body() body: { invoiceId: string; transactionId?: string }) {
    return this.payments.confirm(body.invoiceId, body.transactionId);
  }

  /** QPay-ийн callback: төлөлтийг QPay-ээс шалгаад баталгаажуулна */
  @Public()
  @Post("qpay/callback")
  qpayCallback(
    @Query("payment") paymentId?: string,
    @Query("qpay_payment_id") qpayPaymentId?: string,
    @Body() body?: { object_id?: string; invoice_id?: string },
  ) {
    return this.payments.handleQpayCallback(
      paymentId,
      body?.invoice_id ?? body?.object_id ?? qpayPaymentId,
    );
  }

  @Public()
  @Get("qpay/callback")
  qpayCallbackGet(
    @Query("payment") paymentId?: string,
    @Query("qpay_payment_id") qpayPaymentId?: string,
  ) {
    return this.payments.handleQpayCallback(paymentId, qpayPaymentId);
  }

  /** Клиент талаас төлөв шалгах (QR уншуулсны дараа) */
  @Public()
  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.payments.verify(id);
  }

  @Public()
  @Get("order/:code")
  byOrder(@Param("code") code: string) {
    return this.payments.byOrder(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(":id/refund")
  refund(@Param("id") id: string) {
    return this.payments.refund(id);
  }
}
