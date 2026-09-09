import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { OfferImportService } from "./offer-import.service";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";

@Module({
  imports: [ProductsModule],
  controllers: [OffersController],
  providers: [OffersService, OfferImportService],
  exports: [OffersService, OfferImportService],
})
export class OffersModule {}
