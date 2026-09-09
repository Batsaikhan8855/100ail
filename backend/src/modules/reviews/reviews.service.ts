import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

/** Худалдан авалт баталгаажсанд тооцох захиалгын төлөв */
const PURCHASED_STATUS: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
];

export interface ReviewInput {
  productId: string;
  supplierId?: string;
  userId?: string;
  authorName: string;
  rating: number;
  text: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async byProduct(slug: string) {
    return this.prisma.review.findMany({
      where: { product: { slug } },
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Нийлүүлэгчийн бүх барааны сэтгэгдэл */
  async bySupplier(slug: string) {
    return this.prisma.review.findMany({
      where: { supplier: { slug } },
      include: { product: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /**
   * Хэрэглэгч тухайн бараанд сэтгэгдэл бичих боломжтой эсэх.
   * UI нь энэ хариунаас хамааран формоо харуулна.
   */
  async eligibility(userId: string, slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Бүтээгдэхүүн олдсонгүй");

    const [existing, purchase] = await Promise.all([
      this.prisma.review.findFirst({ where: { productId: product.id, userId } }),
      this.findPurchase(userId, product.id),
    ]);

    return {
      productId: product.id,
      canReview: !existing,
      alreadyReviewed: Boolean(existing),
      verifiedPurchase: Boolean(purchase),
      /** Худалдаж авсан бол сэтгэгдлийг тухайн нийлүүлэгчид холбоно */
      supplierId: purchase?.supplierId ?? null,
      supplierName: purchase?.supplierName ?? null,
    };
  }

  async create(input: ReviewInput) {
    const rating = Math.round(input.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException("Үнэлгээ 1-5 хооронд байна");
    }
    const text = input.text?.trim() ?? "";
    if (text.length < 3) throw new BadRequestException("Сэтгэгдэл хэт богино байна");

    if (input.userId) {
      const existing = await this.prisma.review.findFirst({
        where: { productId: input.productId, userId: input.userId },
      });
      if (existing) {
        throw new BadRequestException("Та энэ бараанд сэтгэгдэл үлдээсэн байна");
      }
    }

    const purchase = input.userId
      ? await this.findPurchase(input.userId, input.productId)
      : null;
    const supplierId = input.supplierId ?? purchase?.supplierId ?? null;

    const review = await this.prisma.review.create({
      data: {
        productId: input.productId,
        supplierId,
        userId: input.userId ?? null,
        authorName: input.authorName.trim() || "Зочин",
        rating,
        text,
        verifiedPurchase: Boolean(purchase),
      },
    });

    if (supplierId) await this.recalculateSupplierRating(supplierId);
    return review;
  }

  /** Хэрэглэгч тухайн барааг авсан эсэх, аль нийлүүлэгчээс авсныг олно */
  private async findPurchase(userId: string, productId: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        offer: { productId },
        supplierOrder: { order: { userId, status: { in: PURCHASED_STATUS } } },
      },
      include: { supplierOrder: { include: { supplier: { select: { name: true } } } } },
      orderBy: { supplierOrder: { createdAt: "desc" } },
    });
    if (!item) return null;

    return {
      supplierId: item.supplierOrder.supplierId,
      supplierName: item.supplierOrder.supplier.name,
    };
  }

  /** Нийлүүлэгчийн дундаж үнэлгээг дахин тооцно */
  private async recalculateSupplierRating(supplierId: string) {
    const reviews = await this.prisma.review.findMany({ where: { supplierId } });
    if (reviews.length === 0) return;
    const average =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { rating: Number(average.toFixed(1)), reviewCount: reviews.length },
    });
  }

  async remove(id: string) {
    const review = await this.prisma.review.delete({ where: { id } });
    if (review.supplierId) await this.recalculateSupplierRating(review.supplierId);
    return review;
  }
}
