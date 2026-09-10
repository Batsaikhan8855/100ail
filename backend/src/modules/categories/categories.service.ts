import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Дэд ангилал бүрийг төлөөлөх нэг зураг.
   *
   * Нүүрний ангиллын мөрөнд дэд ангиллыг зурагтай хавтангаар харуулдаг
   * тул ангилал тус бүрээс идэвхтэй, зурагтай нэг бараа сонгоно.
   * `distinct` ашигласнаар нэг л хүсэлтээр бүх ангиллын зураг гарна.
   */
  private async coverByCategory(
    categoryIds: string[],
  ): Promise<Map<string, string>> {
    if (categoryIds.length === 0) return new Map();
    const covers = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        active: true,
        images: { some: {} },
      },
      distinct: ["categoryId"],
      orderBy: { createdAt: "desc" },
      select: {
        categoryId: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { key: true },
        },
      },
    });

    const map = new Map<string, string>();
    for (const cover of covers) {
      const key = cover.images[0]?.key;
      if (key) map.set(cover.categoryId, this.storage.publicUrl(key));
    }
    return map;
  }

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

    const covers = await this.coverByCategory(
      categories.flatMap((category) => category.children.map((c) => c.id)),
    );

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
        image: covers.get(child.id) ?? null,
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
