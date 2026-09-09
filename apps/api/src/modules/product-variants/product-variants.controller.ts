import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ProductVariantsService } from "./product-variants.service";

@ApiTags("product-variants")
@Controller("product-variants")
export class ProductVariantsController {
  constructor(private readonly variants: ProductVariantsService) {}

  @Public()
  @Get("product/:productId")
  byProduct(@Param("productId") productId: string) {
    return this.variants.byProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post()
  create(@Body() body: { productId: string; name: string; sku?: string }) {
    return this.variants.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { name?: string; sku?: string }) {
    return this.variants.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.variants.remove(id);
  }
}
