import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PayoutStatus, UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PayoutsService, type BankAccountInput } from "./payouts.service";

@ApiTags("payouts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.payouts.overview(user);
  }

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post("bank-account")
  saveBankAccount(@CurrentUser() user: AuthUser, @Body() body: BankAccountInput) {
    return this.payouts.saveBankAccount(user, body);
  }

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post()
  request(
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; note?: string },
  ) {
    return this.payouts.request(user, body);
  }

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.payouts.cancel(user, id);
  }

  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll(@Query("status") status?: PayoutStatus) {
    return this.payouts.listAll(status);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: { status: PayoutStatus; reference?: string; note?: string },
  ) {
    return this.payouts.updateStatus(id, body);
  }
}
