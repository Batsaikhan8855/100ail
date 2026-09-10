import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { ProductsService } from "../products/products.service";

/** Хадгалсан барааны эзэн: нэвтэрсэн хэрэглэгч эсвэл зочны session */
export interface FavoriteOwner {
  userId?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  /**
   * Эзэмшлийн шүүлт. Нэвтэрсэн бол хэрэглэгчийнх, эс бөгөөс зочны
   * session-ийнх. Аль нь ч байхгүй бол хүсэлт буруу.
   */
  private scope(owner: FavoriteOwner) {
    if (owner.userId) return { userId: owner.userId };
    if (owner.sessionId) return { sessionId: owner.sessionId, userId: null };
    throw new BadRequestException("sessionId эсвэл нэвтрэлт шаардлагатай");
  }

  /**
   * Зочны хадгалсан барааг нэвтэрсэн хэрэглэгч рүү шилжүүлнэ.
   *
   * Сагстай ижил асуудал: зочноор зүрхэлсэн бараа нэвтрэхэд алга
   * болох ёсгүй. Аль хэдийн хадгалсан барааг давхардуулахгүй.
   */
  private async mergeGuest(userId: string, sessionId: string) {
    const guests = await this.prisma.favorite.findMany({
      where: { sessionId, userId: null },
    });
    if (guests.length === 0) return;

    const mine = await this.prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });
    const have = new Set(mine.map((row) => row.productId));

    for (const row of guests) {
      if (!have.has(row.productId)) {
        await this.prisma.favorite.create({
          data: { userId, productId: row.productId },
        });
      }
    }
    await this.prisma.favorite.deleteMany({ where: { sessionId, userId: null } });
  }

  /** Хадгалсан барааны ID-ууд — каталогийн зүрхийг будахад хэрэглэнэ */
  async ids(owner: FavoriteOwner): Promise<string[]> {
    if (owner.userId && owner.sessionId) {
      await this.mergeGuest(owner.userId, owner.sessionId);
    }
    const rows = await this.prisma.favorite.findMany({
      where: this.scope(owner),
      select: { productId: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => row.productId);
  }

  /** Хадгалсан бараа бүтнээрээ — жагсаалтын хуудсанд */
  async list(owner: FavoriteOwner) {
    const ids = await this.ids(owner);
    if (ids.length === 0) return { items: [], total: 0 };

    const items = await this.products.list({ ids, limit: ids.length, page: 1 });
    // Хадгалсан дараалал (шинэ нь эхэнд) хадгалагдана
    const order = new Map(ids.map((id, index) => [id, index]));
    const sorted = [...items.items].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
    return { items: sorted, total: sorted.length };
  }

  async add(owner: FavoriteOwner, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");

    const scope = this.scope(owner);
    const existing = await this.prisma.favorite.findFirst({
      where: { ...scope, productId },
    });
    if (!existing) {
      await this.prisma.favorite.create({ data: { ...scope, productId } });
    }
    return this.ids(owner);
  }

  async remove(owner: FavoriteOwner, productId: string) {
    await this.prisma.favorite.deleteMany({
      where: { ...this.scope(owner), productId },
    });
    return this.ids(owner);
  }

  async clear(owner: FavoriteOwner) {
    await this.prisma.favorite.deleteMany({ where: this.scope(owner) });
    return [];
  }
}
