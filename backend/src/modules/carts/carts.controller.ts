import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CartsService, type CartOwner } from "./carts.service";

/**
 * Нэвтрээгүй хэрэглэгчийн сагсыг `x-session-id` толгойгоор,
 * нэвтэрсэн хэрэглэгчийнхийг хэрэглэгчийн id-гаар тодорхойлно.
 */
@ApiTags("carts")
@Public()
@UseGuards(JwtAuthGuard)
@Controller("carts")
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  private owner(user: AuthUser | undefined, sessionId?: string): CartOwner {
    return { userId: user?.id ?? null, sessionId: sessionId ?? null };
  }

  @Get()
  get(@CurrentUser() user: AuthUser, @Headers("x-session-id") sessionId: string) {
    return this.carts.get(this.owner(user, sessionId));
  }

  @Post("items")
  add(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Body() body: { offerId: string; qty?: number },
  ) {
    return this.carts.addItem(this.owner(user, sessionId), body.offerId, body.qty ?? 1);
  }

  @Patch("items/:offerId")
  setQty(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Param("offerId") offerId: string,
    @Body() body: { qty: number },
  ) {
    return this.carts.setQty(this.owner(user, sessionId), offerId, body.qty);
  }

  @Delete("items/:offerId")
  remove(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Param("offerId") offerId: string,
  ) {
    return this.carts.removeItem(this.owner(user, sessionId), offerId);
  }

  /** Нийлүүлэгч тус бүрт гарах хүргэлтийн машиныг сонгоно */
  @Patch("vehicle")
  setVehicle(
    @CurrentUser() user: AuthUser,
    @Headers("x-session-id") sessionId: string,
    @Body() body: { supplierId: string; vehicleId: string },
  ) {
    return this.carts.setVehicle(
      this.owner(user, sessionId),
      body.supplierId,
      body.vehicleId,
    );
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser, @Headers("x-session-id") sessionId: string) {
    return this.carts.clear(this.owner(user, sessionId));
  }
}
