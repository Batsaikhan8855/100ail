import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { CategoriesService } from "./categories.service";

@ApiTags("categories")
@Public()
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.categories.bySlug(slug);
  }
}
