import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { FavoritesService, type FavoriteOwner } from "./favorites.service";

/**
 * Хадгалсан бараа. Сагстай ижил зарчим: зочин `x-session-id`
 * толгойгоор, нэвтэрсэн хэрэглэгч id-гаараа. Нэвтрэх үед зочны
 * хадгалсан бараа хэрэглэгч рүү шилжинэ.
 */
@ApiTags("favorites")
@Public()
@UseGuards(JwtAuthGuard)
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  private owner(user: AuthUser | undefined, sessionId?: string): FavoriteOwner {
    return { userId: user?.id ?? null, sessionId: sessionId ?? null };
  }

  /** Хадгалсан барааны ID-ууд — каталогийн зүрхийг будахад */
  @Get("ids")
  ids(@CurrentUser() user: AuthUser, @Headers("x-session-id") sessionId: string) {
    return this.favorites.ids(this.owner(user, sessionId));
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Headers("x-session-id") sessionId: string) {
    return this.favorites.list(this.owner(user, sessionId));
  }

  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Body() body: { productId: string },
  ) {
    return this.favorites.add(this.owner(user, sessionId), body.productId);
  }

  @Delete(":productId")
  remove(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Param("productId") productId: string,
  ) {
    return this.favorites.remove(this.owner(user, sessionId), productId);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser, @Headers("x-session-id") sessionId: string) {
    return this.favorites.clear(this.owner(user, sessionId));
  }
}
