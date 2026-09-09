import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SupplierOrderStatus, UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateOrderDto } from "./dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Нэвтрээгүй ч захиалга үүсгэж болно (зочны захиалга) */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.createFromCart(
      { userId: user?.id ?? null, sessionId: sessionId ?? null },
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.mine(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("supplier")
  forSupplier(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: SupplierOrderStatus,
  ) {
    return this.orders.forSupplier(user, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("all")
  listAll() {
    return this.orders.listAll();
  }

  @Public()
  @Get(":code")
  byCode(@Param("code") code: string) {
    return this.orders.byCode(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Patch("supplier-orders/:id/status")
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { status: SupplierOrderStatus },
  ) {
    return this.orders.updateSupplierOrderStatus(user, id, body.status);
  }
}
