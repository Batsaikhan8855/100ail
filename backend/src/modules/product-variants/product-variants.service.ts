import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  byProduct(productId: string) {
    return this.prisma.productVariant.findMany({ where: { productId } });
  }

  create(data: { productId: string; name: string; sku?: string }) {
    return this.prisma.productVariant.create({ data });
  }

  update(id: string, data: { name?: string; sku?: string }) {
    return this.prisma.productVariant.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.productVariant.delete({ where: { id } });
  }
}
