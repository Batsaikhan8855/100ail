import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ангиллын жагсаалт, бүтээгдэхүүний тоотой */
  async list() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      include: {
        children: {
          orderBy: { position: "asc" },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      // Дэд ангилалд байгаа бараа мөн үндсэн ангиллын тоонд орно
      productCount: category.children.reduce(
        (sum, child) => sum + child._count.products,
        category._count.products,
      ),
      children: category.children.map((child) => ({
        id: child.id,
        slug: child.slug,
        name: child.name,
        icon: child.icon,
        productCount: child._count.products,
      })),
    }));
  }

  async bySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        attributes: { orderBy: { position: "asc" } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException("Ангилал олдсонгүй");
    return category;
  }
}
