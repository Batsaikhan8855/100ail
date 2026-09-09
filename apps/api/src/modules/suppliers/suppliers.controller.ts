import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SuppliersService } from "./suppliers.service";

@ApiTags("suppliers")
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Public()
  @Get()
  list() {
    return this.suppliers.list();
  }

  @Public()
  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.suppliers.bySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id/verify")
  verify(@Param("id") id: string, @Body() body: { verified: boolean }) {
    return this.suppliers.setVerified(id, body.verified);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPLIER)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; regNo?: string },
  ) {
    return this.suppliers.update(id, body);
  }
}
