import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "./common/cache/cache.module";
import { PrismaModule } from "./common/prisma.module";
import { MessengerModule } from "./common/notify/messenger.module";
import { QueueModule } from "./common/queue/queue.module";
import { AttributesModule } from "./modules/attributes/attributes.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CartsModule } from "./modules/carts/carts.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { CommissionsModule } from "./modules/commissions/commissions.module";
import { DeliveriesModule } from "./modules/deliveries/deliveries.module";
import { BannersModule } from "./modules/banners/banners.module";
import { DisputesModule } from "./modules/disputes/disputes.module";
import { GeoModule } from "./modules/geo/geo.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { ProductVariantsModule } from "./modules/product-variants/product-variants.module";
import { ProductsModule } from "./modules/products/products.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { MeiliModule } from "./modules/search/meili.module";
import { SearchModule } from "./modules/search/search.module";
import { StorageModule } from "./modules/storage/storage.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { UsersModule } from "./modules/users/users.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";

/**
 * Modular monolith: бүх модуль нэг backend дотор ажиллана.
 * Ачаалал нэмэгдэх үед search, payments, deliveries, notifications
 * модулиудыг тусдаа service болгон салгах боломжтой (баримтын 5-р хэсэг).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule,
    QueueModule,
    MessengerModule,
    MeiliModule,
    NotificationsModule,
    StorageModule,

    AuthModule,
    UsersModule,
    SuppliersModule,
    OrganizationsModule,

    CategoriesModule,
    AttributesModule,
    ProductsModule,
    ProductVariantsModule,
    OffersModule,
    InventoryModule,
    WarehousesModule,
    SearchModule,
    GeoModule,

    CartsModule,
    FavoritesModule,
    OrdersModule,
    PaymentsModule,
    CommissionsModule,
    PayoutsModule,
    DeliveriesModule,

    ReviewsModule,
    PromotionsModule,
    BannersModule,
    DisputesModule,
    ReportsModule,
  ],
})
export class AppModule {}
