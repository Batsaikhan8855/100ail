import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Идэвхтэй, хугацаа нь болсон урамшуулал */
  active() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: "asc" },
    });
  }

  listAll() {
    return this.prisma.promotion.findMany({ orderBy: { startsAt: "desc" } });
  }

  async byCode(code: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promotion) throw new NotFoundException("Урамшуулал олдсонгүй");
    return promotion;
  }

  create(data: {
    code: string;
    title: string;
    description?: string;
    percentOff?: number;
    amountOff?: number;
    startsAt: string;
    endsAt: string;
  }) {
    return this.prisma.promotion.create({
      data: {
        ...data,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      },
    });
  }

  update(id: string, data: { title?: string; active?: boolean; percentOff?: number }) {
    return this.prisma.promotion.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.promotion.delete({ where: { id } });
  }
}
