import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

/** Байгууллагын худалдан авалт: нэхэмжлэх, тайлан (баримтын 4.1) */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.organization.findMany({
      include: { _count: { select: { users: true, orders: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async byId(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        users: { select: { id: true, name: true, email: true } },
      },
    });
    if (!organization) throw new NotFoundException("Байгууллага олдсонгүй");
    return organization;
  }

  create(data: { name: string; regNo: string; phone?: string; address?: string }) {
    return this.prisma.organization.create({ data });
  }

  update(id: string, data: { name?: string; phone?: string; address?: string }) {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
