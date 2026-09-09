import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { OfferImportService } from "./offer-import.service";
import { OffersService, type OfferInput } from "./offers.service";

@ApiTags("offers")
@Controller("offers")
export class OffersController {
  constructor(
    private readonly offers: OffersService,
    private readonly imports: OfferImportService,
  ) {}

  @Public()
  @Get("product/:slug")
  byProduct(@Param("slug") slug: string) {
    return this.offers.byProduct(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.offers.mine(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: OfferInput) {
    return this.offers.create(user, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch("bulk-price")
  bulkPrice(
    @CurrentUser() user: AuthUser,
    @Body() body: { rows: { offerId: string; price?: number; bulkPrice?: number | null }[] },
  ) {
    return this.offers.bulkUpdatePrices(user, body.rows);
  }

  /** Excel/CSV файлаас бараа, үнэ, үлдэгдлийг бөөнөөр оруулах */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post("import")
  import(
    @CurrentUser() user: AuthUser,
    @Body() body: { content: string; fileName?: string; dryRun?: boolean },
  ) {
    return this.imports.import(user, body);
  }

  /** Одоогийн саналаар бөглөсөн CSV загвар */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("import/template")
  async template(@CurrentUser() user: AuthUser) {
    return { fileName: "100ail-import.csv", content: await this.imports.template(user) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Partial<OfferInput>,
  ) {
    return this.offers.update(user, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.offers.remove(user, id);
  }
}
