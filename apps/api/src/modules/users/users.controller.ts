import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  list(@Query("role") role?: UserRole) {
    return this.users.list(role);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: AuthUser, @Body() body: { name?: string; phone?: string }) {
    return this.users.updateProfile(user.id, body);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/supplier")
  assignSupplier(@Param("id") id: string, @Body() body: { supplierId: string | null }) {
    return this.users.assignSupplier(id, body.supplierId);
  }
}
