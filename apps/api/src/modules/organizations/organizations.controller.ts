import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { OrganizationsService } from "./organizations.service";

@ApiTags("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  list() {
    return this.organizations.list();
  }

  @Get(":id")
  byId(@Param("id") id: string) {
    return this.organizations.byId(id);
  }

  @Post()
  create(@Body() body: { name: string; regNo: string; phone?: string; address?: string }) {
    return this.organizations.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { name?: string; phone?: string; address?: string }) {
    return this.organizations.update(id, body);
  }
}
