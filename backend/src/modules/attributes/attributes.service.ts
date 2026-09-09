import { Injectable } from "@nestjs/common";
import { AttributeType } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ангилал тус бүрийн техникийн үзүүлэлтүүд.
   * Шинэ ангилал нэмэхэд schema өөрчлөх шаардлагагүй (баримтын 8-р хэсэг).
   */
  byCategory(slug: string) {
    return this.prisma.attribute.findMany({
      where: { category: { slug } },
      orderBy: { position: "asc" },
    });
  }

  create(data: {
    categoryId: string;
    key: string;
    label: string;
    unit?: string;
    type?: AttributeType;
  }) {
    return this.prisma.attribute.create({ data });
  }

  remove(id: string) {
    return this.prisma.attribute.delete({ where: { id } });
  }
}
