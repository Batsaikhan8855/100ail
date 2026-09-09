import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { GeoService } from "./geo.service";

@ApiTags("geo")
@Public()
@Controller("geo")
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get("config")
  config() {
    return this.geo.config();
  }

  /** Хаяг, агуулахын байршлыг нэрээр хайх */
  @Get("search")
  search(@Query("q") q = "", @Query("limit") limit?: string) {
    return this.geo.search(q, limit ? Number(limit) : 5);
  }

  @Get("reverse")
  reverse(@Query("lat") lat: string, @Query("lng") lng: string) {
    return this.geo.reverse(Number(lat), Number(lng));
  }

  /** Хэрэглэгчид хамгийн ойрхон агуулахууд, зайны хамт */
  @Get("nearest-warehouses")
  nearest(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("product") product?: string,
    @Query("limit") limit?: string,
  ) {
    return this.geo.nearestWarehouses({
      lat: Number(lat),
      lng: Number(lng),
      productSlug: product,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
