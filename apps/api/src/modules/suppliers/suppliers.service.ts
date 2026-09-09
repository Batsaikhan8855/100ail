import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: [{ verified: "desc" }, { rating: "desc" }],
      include: {
        _count: { select: { offers: true, warehouses: true } },
      },
    });

    return suppliers.map((supplier) => ({
      id: supplier.id,
      slug: supplier.slug,
      name: supplier.name,
      verified: supplier.verified,
      rating: supplier.rating,
      reviewCount: supplier.reviewCount,
      description: supplier.description,
      offerCount: supplier._count.offers,
      warehouseCount: supplier._count.warehouses,
    }));
  }

  async bySlug(slug: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { slug },
      include: {
        warehouses: true,
        offers: {
          where: { active: true },
          include: { product: true, inventory: true },
          take: 24,
        },
      },
    });
    if (!supplier) throw new NotFoundException("Нийлүүлэгч олдсонгүй");
    return supplier;
  }

  /** Админ баталгаажуулалт (баримтын 4.3) */
  setVerified(id: string, verified: boolean) {
    return this.prisma.supplier.update({ where: { id }, data: { verified } });
  }

  update(id: string, data: { name?: string; description?: string; regNo?: string }) {
    return this.prisma.supplier.update({ where: { id }, data });
  }
}
