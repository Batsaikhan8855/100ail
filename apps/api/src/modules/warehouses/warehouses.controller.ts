import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WarehousesService } from "./warehouses.service";

@ApiTags("warehouses")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPLIER, UserRole.ADMIN)
@Controller("warehouses")
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.warehouses.mine(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; city: string; address?: string; lat?: number; lng?: number },
  ) {
    return this.warehouses.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      city?: string;
      address?: string;
      lat?: number | null;
      lng?: number | null;
    },
  ) {
    return this.warehouses.update(user, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.warehouses.remove(user, id);
  }
}
