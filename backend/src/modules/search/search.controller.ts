import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ProductQueryDto } from "../products/dto";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  find(@Query() query: ProductQueryDto) {
    return this.search.search(query);
  }

  @Public()
  @Get("suggest")
  suggest(@Query("q") term: string) {
    return this.search.suggest(term ?? "");
  }

  @Public()
  @Get("status")
  status() {
    return { meilisearch: this.search.indexEnabled };
  }

  /** Индексийг бүхэлд нь дахин барих */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post("reindex")
  reindex() {
    return this.search.reindex();
  }
}
