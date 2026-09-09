import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

const cartInclude = {
  items: {
    include: {
      offer: {
        include: {
          supplier: true,
          product: true,
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
  constructor(private readonly prisma: PrismaService) {}

  /** Бөөний үнэ нь зөвхөн доод тоо хэмжээнээс дээш захиалгад хүчинтэй */
  static unitPrice(offer: { price: number; bulkPrice: number | null; bulkMinQty: number | null }, qty: number) {
    return offer.bulkPrice && offer.bulkMinQty && qty >= offer.bulkMinQty
      ? offer.bulkPrice
      : offer.price;
  }

  async getOrCreate(owner: CartOwner): Promise<CartWithItems> {
    if (owner.userId) {
      const existing = await this.prisma.cart.findFirst({
        where: { userId: owner.userId },
        include: cartInclude,
      });
      if (existing) return existing;
      return this.prisma.cart.create({
        data: { userId: owner.userId },
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

  /** Сагсыг нийлүүлэгчээр бүлэглэж, дүнг тооцсон хэлбэрээр буцаана */
  view(cart: CartWithItems) {
    const lines = cart.items.map((item) => {
      const unitPrice = CartsService.unitPrice(item.offer, item.qty);
      const stock = item.offer.inventory.reduce(
        (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
        0,
      );
      const main = [...item.offer.inventory].sort((a, b) => b.quantity - a.quantity)[0];

      return {
        offerId: item.offerId,
        productId: item.offer.productId,
        productSlug: item.offer.product.slug,
        productName: [item.offer.product.name, item.offer.product.variantLabel]
          .filter(Boolean)
          .join(" "),
        art: item.offer.product.art,
        supplierId: item.offer.supplierId,
        supplierName: item.offer.supplier.name,
        basePrice: item.offer.price,
        bulkPrice: item.offer.bulkPrice,
        bulkMinQty: item.offer.bulkMinQty,
        unitPrice,
        qty: item.qty,
        unit: item.offer.unit,
        lineTotal: unitPrice * item.qty,
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
        total: 0,
      };
      group.lines.push(line);
      group.goodsTotal += line.lineTotal;
      // Нэг нийлүүлэгчээс нэг удаа хүргэнэ
      group.deliveryPrice = Math.max(group.deliveryPrice, line.deliveryPrice);
      group.deliveryDays = Math.max(group.deliveryDays ?? 0, line.deliveryDays ?? 0) || null;
      groupMap.set(line.supplierId, group);
    }

    const groups = [...groupMap.values()].map((group) => ({
      ...group,
      total: group.goodsTotal + group.deliveryPrice,
    }));

    const goodsTotal = groups.reduce((sum, g) => sum + g.goodsTotal, 0);
    const deliveryTotal = groups.reduce((sum, g) => sum + g.deliveryPrice, 0);

    return {
      id: cart.id,
      sessionId: cart.sessionId,
      lines,
      groups,
      count: lines.length,
      goodsTotal,
      deliveryTotal,
      total: goodsTotal + deliveryTotal,
    };
  }

  async get(owner: CartOwner) {
    return this.view(await this.getOrCreate(owner));
  }

  async addItem(owner: CartOwner, offerId: string, qty: number) {
    if (qty < 1) throw new BadRequestException("Тоо хэмжээ 1-ээс багагүй байна");
    const cart = await this.getOrCreate(owner);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { inventory: true },
    });
    if (!offer || !offer.active) throw new BadRequestException("Санал олдсонгүй");

    const available = offer.inventory.reduce(
      (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
      0,
    );
    const existing = cart.items.find((item) => item.offerId === offerId);
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > available) {
      throw new BadRequestException(`Үлдэгдэл хүрэлцэхгүй байна (${available})`);
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
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, offerId } });
    return this.get(owner);
  }

  async clear(owner: CartOwner) {
    const cart = await this.getOrCreate(owner);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.get(owner);
  }
}
