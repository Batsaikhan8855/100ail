import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  VEHICLES,
  formatWeight,
  formatVolume,
  planShipment,
  unitVolume,
  unitWeight,
  vehicleById,
} from "../../common/logistics/logistics";

const cartInclude = {
  items: {
    // Тогтвортой эрэмбэ — эс бөгөөс тоо хэмжээ засах бүрд мөр өөр байранд
    // үсэрч, хэрэглэгч аль мөрөө засснаа алддаг. Хуучин мөрүүд ижил
    // `createdAt`-тай тул `id`-гаар давхар эрэмбэлнэ.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      offer: {
        include: {
          supplier: true,
          // Ангиллын дүрс нь жингийн таамагт хэрэгтэй (common/logistics),
          // эхний зураг нь сагсны мөрөнд бодит гэрэл зураг харуулахад
          product: {
            include: {
              category: true,
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
          inventory: { include: { warehouse: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export interface CartOwner {
  userId?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Бөөний үнэ нь зөвхөн доод тоо хэмжээнээс дээш захиалгад хүчинтэй */
  static unitPrice(
    offer: {
      price: number;
      bulkPrice: number | null;
      bulkMinQty: number | null;
    },
    qty: number,
  ) {
    return offer.bulkPrice && offer.bulkMinQty && qty >= offer.bulkMinQty
      ? offer.bulkPrice
      : offer.price;
  }

  /**
   * Зочны сагсыг нэвтэрсэн хэрэглэгчийн сагстай нэгтгэнэ.
   *
   * Хэрэглэгч зочноор бараагаа түүгээд, төлбөр төлөх гэж нэвтэрдэг.
   * Урьд нь нэвтрэхэд өөр сагс (userId-аар) үүсээд зочны сагс алга
   * болдог байв. Одоо нэвтрэх үед session id хамт ирвэл түүний
   * барааг зөөж, зочны сагсыг устгана. Ижил санал хоёуланд нь байвал
   * илүү тоо хэмжээг үлдээнэ.
   */
  private async mergeGuestCart(userCartId: string, sessionId: string) {
    const guest = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guest || guest.id === userCartId) return;

    if (guest.items.length > 0) {
      const mine = await this.prisma.cartItem.findMany({
        where: { cartId: userCartId },
      });
      const qtyByOffer = new Map(mine.map((item) => [item.offerId, item.qty]));

      for (const item of guest.items) {
        const current = qtyByOffer.get(item.offerId);
        await this.prisma.cartItem.upsert({
          where: {
            cartId_offerId: { cartId: userCartId, offerId: item.offerId },
          },
          update: { qty: Math.max(current ?? 0, item.qty) },
          create: { cartId: userCartId, offerId: item.offerId, qty: item.qty },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guest.id } });
  }

  async getOrCreate(owner: CartOwner): Promise<CartWithItems> {
    if (owner.userId) {
      const existing = await this.prisma.cart.findFirst({
        where: { userId: owner.userId },
        include: cartInclude,
      });
      const cartId =
        existing?.id ??
        (await this.prisma.cart.create({ data: { userId: owner.userId } })).id;

      if (owner.sessionId) await this.mergeGuestCart(cartId, owner.sessionId);

      return this.prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: cartInclude,
      });
    }

    if (!owner.sessionId) {
      throw new BadRequestException("sessionId эсвэл нэвтрэлт шаардлагатай");
    }

    const sessionId = owner.sessionId;
    const existing = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: cartInclude,
    });
    if (existing) return existing;

    // Нүүр хуудас сагсаа зэрэг хэд хэдэн хүсэлтээр татдаг тул хоёр хүсэлт
    // нэгэн зэрэг үүсгэх гэж оролдож `sessionId`-ийн unique дээр мөргөлддөг.
    // (Prisma-гийн `upsert` нь `include`-тэй үед атомик биш тул үүнийг
    // шийддэггүй.) Хожсон хүсэлтийн үүсгэсэн сагсыг буцаана.
    try {
      return await this.prisma.cart.create({
        data: { sessionId },
        include: cartInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await this.prisma.cart.findUnique({
          where: { sessionId },
          include: cartInclude,
        });
        if (raced) return raced;
      }
      throw error;
    }
  }

  /** `Cart.vehicleChoice` JSON-ыг найдвартай уншина */
  private static vehicleChoice(cart: CartWithItems): Record<string, string> {
    const raw = cart.vehicleChoice;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  }

  /** Худалдан авагч нийлүүлэгч тус бүрт гарах машинаа өөрөө сонгоно */
  async setVehicle(owner: CartOwner, supplierId: string, vehicleId: string) {
    if (!vehicleById(vehicleId)) {
      throw new BadRequestException("Ийм хүргэлтийн машин алга");
    }
    const cart = await this.getOrCreate(owner);
    const next = {
      ...CartsService.vehicleChoice(cart),
      [supplierId]: vehicleId,
    };
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { vehicleChoice: next },
    });
    return this.view({ ...cart, vehicleChoice: next });
  }

  /** Сагсыг нийлүүлэгчээр бүлэглэж, дүнг тооцсон хэлбэрээр буцаана */
  view(cart: CartWithItems) {
    const lines = cart.items.map((item) => {
      const unitPrice = CartsService.unitPrice(item.offer, item.qty);
      const stock = item.offer.inventory.reduce(
        (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
        0,
      );
      const main = [...item.offer.inventory].sort(
        (a, b) => b.quantity - a.quantity,
      )[0];
      const lineUnitWeight = unitWeight(item.offer);
      const lineUnitVolume = unitVolume(item.offer);

      return {
        offerId: item.offerId,
        productId: item.offer.productId,
        productSlug: item.offer.product.slug,
        productName: [item.offer.product.name, item.offer.product.variantLabel]
          .filter(Boolean)
          .join(" "),
        art: item.offer.product.art,
        // Бодит гэрэл зураг байвал вектор дүрслэлийн оронд харагдана
        image: item.offer.product.images[0]
          ? this.storage.publicUrl(item.offer.product.images[0].key)
          : null,
        supplierId: item.offer.supplierId,
        supplierName: item.offer.supplier.name,
        basePrice: item.offer.price,
        bulkPrice: item.offer.bulkPrice,
        bulkMinQty: item.offer.bulkMinQty,
        unitPrice,
        qty: item.qty,
        unit: item.offer.unit,
        lineTotal: unitPrice * item.qty,
        unitWeightKg: lineUnitWeight,
        lineWeightKg: Math.round(lineUnitWeight * item.qty * 10) / 10,
        // Хөнгөн ч овор ихтэй ачаа даацаас өмнө тэвшийг дүүргэдэг
        unitVolumeM3: lineUnitVolume,
        lineVolumeM3: Math.round(lineUnitVolume * item.qty * 100) / 100,
        /** Жин, овор нь таамагласан эсэх (нийлүүлэгч оруулаагүй) */
        weightEstimated: !item.offer.weightKg || !item.offer.volumeM3,
        deliveryPrice: item.offer.deliveryPrice,
        deliveryDays: item.offer.deliveryDays,
        location: main?.warehouse.city ?? null,
        stock,
      };
    });

    const groupMap = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        location: string | null;
        deliveryPrice: number;
        deliveryDays: number | null;
        lines: typeof lines;
        goodsTotal: number;
        weightKg: number;
        volumeM3: number;
        weightEstimated: boolean;
        total: number;
      }
    >();

    for (const line of lines) {
      const group = groupMap.get(line.supplierId) ?? {
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        location: line.location,
        deliveryPrice: 0,
        deliveryDays: null,
        lines: [] as typeof lines,
        goodsTotal: 0,
        weightKg: 0,
        volumeM3: 0,
        weightEstimated: false,
        total: 0,
      };
      group.lines.push(line);
      group.goodsTotal += line.lineTotal;
      group.weightKg += line.lineWeightKg;
      group.volumeM3 += line.lineVolumeM3;
      if (line.weightEstimated) group.weightEstimated = true;
      // Нэг нийлүүлэгчээс нэг удаа хүргэнэ
      group.deliveryPrice = Math.max(group.deliveryPrice, line.deliveryPrice);
      group.deliveryDays =
        Math.max(group.deliveryDays ?? 0, line.deliveryDays ?? 0) || null;
      groupMap.set(line.supplierId, group);
    }

    // Нийлүүлэгч бүр өөрийн ачаагаа тусад нь хүргэдэг тул машиныг
    // бүлэг тутамд сонгоно
    const choice = CartsService.vehicleChoice(cart);
    const groups = [...groupMap.values()].map((group) => {
      const shipment = planShipment(
        { kg: group.weightKg, m3: group.volumeM3 },
        group.weightEstimated,
        vehicleById(choice[group.supplierId]),
      );
      // Хүргэлтийн үнэ = гарах машины тариф + нийлүүлэгчийн нэмэлт төлбөр.
      // Ингэснээр «ямар машин сонгосон бэ» гэдэг нь дүнд шууд тусна.
      const deliveryPrice = group.deliveryPrice + shipment.price;
      return {
        ...group,
        deliveryPrice,
        total: group.goodsTotal + deliveryPrice,
        shipment: {
          ...shipment,
          label: formatWeight(shipment.totalKg),
          volumeLabel: formatVolume(shipment.totalM3),
        },
      };
    });

    const goodsTotal = groups.reduce((sum, g) => sum + g.goodsTotal, 0);
    const deliveryTotal = groups.reduce((sum, g) => sum + g.deliveryPrice, 0);
    const weightKg =
      Math.round(groups.reduce((s, g) => s + g.weightKg, 0) * 10) / 10;
    const volumeM3 =
      Math.round(groups.reduce((s, g) => s + g.volumeM3, 0) * 100) / 100;

    return {
      id: cart.id,
      sessionId: cart.sessionId,
      lines,
      groups,
      count: lines.length,
      goodsTotal,
      deliveryTotal,
      total: goodsTotal + deliveryTotal,
      weightKg,
      weightLabel: formatWeight(weightKg),
      volumeM3,
      volumeLabel: formatVolume(volumeM3),
      // Худалдан авагч машинаа өөрөө сонгож болохын тулд бүх ангиллыг
      // даацынх нь хамт өгнө. Тохирох нь `shipment.vehicle`.
      vehicles: VEHICLES,
    };
  }

  async get(owner: CartOwner) {
    return this.view(await this.getOrCreate(owner));
  }

  async addItem(owner: CartOwner, offerId: string, qty: number) {
    if (qty < 1)
      throw new BadRequestException("Тоо хэмжээ 1-ээс багагүй байна");
    const cart = await this.getOrCreate(owner);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { inventory: true },
    });
    if (!offer || !offer.active)
      throw new BadRequestException("Санал олдсонгүй");

    const available = offer.inventory.reduce(
      (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
      0,
    );
    const existing = cart.items.find((item) => item.offerId === offerId);
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > available) {
      throw new BadRequestException(
        `Үлдэгдэл хүрэлцэхгүй байна (${available})`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_offerId: { cartId: cart.id, offerId } },
      update: { qty: nextQty },
      create: { cartId: cart.id, offerId, qty },
    });

    return this.get(owner);
  }

  async setQty(owner: CartOwner, offerId: string, qty: number) {
    const cart = await this.getOrCreate(owner);
    if (qty < 1) return this.removeItem(owner, offerId);

    await this.prisma.cartItem.update({
      where: { cartId_offerId: { cartId: cart.id, offerId } },
      data: { qty },
    });
    return this.get(owner);
  }

  async removeItem(owner: CartOwner, offerId: string) {
    const cart = await this.getOrCreate(owner);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, offerId },
    });
    return this.get(owner);
  }

  async clear(owner: CartOwner) {
    const cart = await this.getOrCreate(owner);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.get(owner);
  }
}
