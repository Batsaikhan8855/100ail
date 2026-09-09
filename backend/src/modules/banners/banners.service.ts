import { Injectable, NotFoundException } from "@nestjs/common";
import { BannerPlacement } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { StorageService } from "../storage/storage.service";

export interface BannerInput {
  title: string;
  subtitle?: string | null;
  imageKey?: string | null;
  linkUrl?: string | null;
  placement?: BannerPlacement;
  position?: number;
  startsAt: string;
  endsAt: string;
}

/**
 * Сурталчилгааны баннер (баримтын 4.3 "сурталчилгаа").
 * Хөнгөлөлтийн кодоос тусдаа: энэ нь storefront-д харагдах зурагт зар.
 */
@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private map = (banner: {
    id: string;
    title: string;
    subtitle: string | null;
    imageKey: string | null;
    linkUrl: string | null;
    placement: BannerPlacement;
    position: number;
    startsAt: Date;
    endsAt: Date;
    active: boolean;
    impressions: number;
    clicks: number;
  }) => ({
    ...banner,
    imageUrl: banner.imageKey ? this.storage.publicUrl(banner.imageKey) : null,
    /** Хэдэн хувь нь дарагдсан бэ */
    ctr:
      banner.impressions > 0
        ? Math.round((banner.clicks / banner.impressions) * 1000) / 10
        : 0,
  });

  /** Storefront: тухайн байрлалын идэвхтэй баннерууд */
  async active(placement: BannerPlacement = BannerPlacement.HOME_HERO) {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        placement,
        active: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 8,
    });

    if (banners.length > 0) {
      // Харагдсан тоог нэмнэ; тоолуур амжилтгүй болсон ч хуудас гацахгүй
      await this.prisma.banner
        .updateMany({
          where: { id: { in: banners.map((banner) => banner.id) } },
          data: { impressions: { increment: 1 } },
        })
        .catch(() => undefined);
    }

    return banners.map(this.map);
  }

  /** Дарагдсаныг бүртгээд очих хаягийг буцаана */
  async registerClick(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("Баннер олдсонгүй");

    await this.prisma.banner.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
    return { linkUrl: banner.linkUrl };
  }

  async listAll() {
    const banners = await this.prisma.banner.findMany({
      orderBy: [{ placement: "asc" }, { position: "asc" }],
    });
    return banners.map(this.map);
  }

  async create(input: BannerInput) {
    const banner = await this.prisma.banner.create({
      data: {
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        imageKey: input.imageKey?.trim() || null,
        linkUrl: input.linkUrl?.trim() || null,
        placement: input.placement ?? BannerPlacement.HOME_HERO,
        position: input.position ?? 0,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      },
    });
    return this.map(banner);
  }

  async update(id: string, input: Partial<BannerInput> & { active?: boolean }) {
    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        title: input.title,
        subtitle: input.subtitle,
        imageKey: input.imageKey,
        linkUrl: input.linkUrl,
        placement: input.placement,
        position: input.position,
        active: input.active,
        ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}),
        ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
      },
    });
    return this.map(banner);
  }

  remove(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }
}
