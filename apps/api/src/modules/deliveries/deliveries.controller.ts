import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DeliveryStatus, UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DeliveriesService } from "./deliveries.service";

@ApiTags("deliveries")
@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Public()
  @Get("track/:code")
  track(@Param("code") code: string) {
    return this.deliveries.track(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.deliveries.forSupplier(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { status?: DeliveryStatus; driverName?: string; driverPhone?: string },
  ) {
    return this.deliveries.update(user, id, body);
  }
}
