import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole, AttributeType } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AttributesService } from "./attributes.service";

@ApiTags("attributes")
@Controller("attributes")
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Public()
  @Get("category/:slug")
  byCategory(@Param("slug") slug: string) {
    return this.attributes.byCategory(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body()
    body: {
      categoryId: string;
      key: string;
      label: string;
      unit?: string;
      type?: AttributeType;
    },
  ) {
    return this.attributes.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.attributes.remove(id);
  }
}
