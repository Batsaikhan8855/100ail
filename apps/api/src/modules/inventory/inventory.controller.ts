import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPLIER, UserRole.ADMIN)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.inventory.mine(user);
  }

  @Get("low-stock")
  lowStock(@CurrentUser() user: AuthUser, @Query("threshold") threshold?: string) {
    return this.inventory.lowStock(user, threshold ? Number(threshold) : undefined);
  }

  @Patch()
  setQuantity(
    @CurrentUser() user: AuthUser,
    @Body() body: { offerId: string; warehouseId: string; quantity: number },
  ) {
    return this.inventory.setQuantity(user, body);
  }
}
