import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DisputeStatus, UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DisputesService } from "./disputes.service";

@ApiTags("disputes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderCode: string; supplierOrderId?: string; reason: string; detail?: string },
  ) {
    return this.disputes.create({ ...body, userId: user.id });
  }

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.disputes.mine(user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll() {
    return this.disputes.listAll();
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/resolve")
  resolve(
    @Param("id") id: string,
    @Body() body: { status: DisputeStatus; resolution?: string },
  ) {
    return this.disputes.resolve(id, body.status, body.resolution);
  }
}
