import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get("product/:slug")
  byProduct(@Param("slug") slug: string) {
    return this.reviews.byProduct(slug);
  }

  @Public()
  @Get("supplier/:slug")
  bySupplier(@Param("slug") slug: string) {
    return this.reviews.bySupplier(slug);
  }

  /** Сэтгэгдэл бичих боломжтой эсэх (UI формоо шийдэхэд) */
  @UseGuards(JwtAuthGuard)
  @Get("eligibility/:slug")
  eligibility(@CurrentUser() user: AuthUser, @Param("slug") slug: string) {
    return this.reviews.eligibility(user.id, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { productId: string; supplierId?: string; authorName: string; rating: number; text: string },
  ) {
    return this.reviews.create({ ...body, userId: user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.reviews.remove(id);
  }
}
