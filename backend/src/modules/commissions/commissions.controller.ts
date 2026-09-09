import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CommissionStatus, UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CommissionsService } from "./commissions.service";

@ApiTags("commissions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.commissions.forSupplier(user);
  }

  @Roles(UserRole.ADMIN)
  @Get("overview")
  overview() {
    return this.commissions.overview();
  }

  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll(@Query("status") status?: CommissionStatus) {
    return this.commissions.listAll(status);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/settle")
  settle(@Param("id") id: string) {
    return this.commissions.settle(id);
  }
}
