import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { RedisService } from "../../common/cache/redis.service";

export interface GeoPlace {
  name: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Хоёр цэгийн хоорондох зай, километрээр (haversine) */
export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/**
 * Байршлын үйлчилгээ (баримтын 2-р хэсгийн "Google Maps эсвэл Mapbox").
 *
 * `MAPBOX_TOKEN` тохируулсан бол Mapbox geocoding, байхгүй бол түлхүүр
 * шаардахгүй OpenStreetMap (Nominatim) ашиглана. Хоёулаа боломжгүй үед
 * хайлт хоосон жагсаалт буцаах бөгөөд агуулахын координатыг гараар
 * оруулах боломж хэвээр үлдэнэ.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly mapboxToken = process.env.MAPBOX_TOKEN ?? "";
  private readonly nominatim =
    process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  get provider(): "mapbox" | "osm" {
    return this.mapboxToken ? "mapbox" : "osm";
  }

  config() {
    return {
      provider: this.provider,
      geocoding: true,
      /** Газрын зургийн хүрээ: Монгол улс */
      defaultCenter: { lat: 47.918, lng: 106.917 },
    };
  }

  /** Хаягаар хайх. Үр дүнг 1 цаг cache-д хадгална */
  async search(query: string, limit = 5): Promise<GeoPlace[]> {
    const term = query.trim();
    if (term.length < 2) return [];

    const cacheKey = `geo:search:${this.provider}:${term.toLowerCase()}`;
    const cached = await this.redis.get<GeoPlace[]>(cacheKey);
    if (cached) return cached;

    const places =
      this.provider === "mapbox"
        ? await this.searchMapbox(term, limit)
        : await this.searchNominatim(term, limit);

    if (places.length > 0) await this.redis.set(cacheKey, places, 3600);
    return places;
  }

  /** Координатаас хаяг */
  async reverse(lat: number, lng: number): Promise<GeoPlace | null> {
    if (this.provider === "mapbox") {
      const [place] = await this.callMapbox(`${lng},${lat}`, 1);
      return place ?? null;
    }
    const url = `${this.nominatim}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=mn`;
    const result = await this.fetchJson<NominatimPlace>(url);
    return result ? this.fromNominatim(result) : null;
  }

  /**
   * Хэрэглэгчийн байршилд хамгийн ойрхон агуулахууд. Бүтээгдэхүүний slug
   * өгвөл зөвхөн тухайн барааны үлдэгдэлтэй агуулахыг харуулна.
   */
  async nearestWarehouses(input: {
    lat: number;
    lng: number;
    productSlug?: string;
    limit?: number;
  }) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        ...(input.productSlug
          ? {
              inventory: {
                some: {
                  quantity: { gt: 0 },
                  offer: { active: true, product: { slug: input.productSlug } },
                },
              },
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, slug: true, verified: true } },
        inventory: input.productSlug
          ? {
              where: { offer: { active: true, product: { slug: input.productSlug } } },
              select: { quantity: true, reserved: true },
            }
          : { select: { quantity: true, reserved: true } },
      },
    });

    return warehouses
      .map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
        city: warehouse.city,
        address: warehouse.address,
        lat: warehouse.lat as number,
        lng: warehouse.lng as number,
        supplier: warehouse.supplier,
        stock: warehouse.inventory.reduce(
          (sum, row) => sum + Math.max(0, row.quantity - row.reserved),
          0,
        ),
        distanceKm: distanceKm(input, {
          lat: warehouse.lat as number,
          lng: warehouse.lng as number,
        }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, input.limit ?? 10);
  }

  private async searchMapbox(query: string, limit: number): Promise<GeoPlace[]> {
    return this.callMapbox(encodeURIComponent(query), limit);
  }

  private async callMapbox(term: string, limit: number): Promise<GeoPlace[]> {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${term}.json` +
      `?access_token=${this.mapboxToken}&country=mn&language=mn&limit=${limit}`;
    const result = await this.fetchJson<{ features: MapboxFeature[] }>(url);

    return (result?.features ?? []).map((feature) => ({
      name: feature.text ?? feature.place_name,
      address: feature.place_name,
      city:
        feature.context?.find((row) => row.id.startsWith("place"))?.text ?? null,
      lng: feature.center[0],
      lat: feature.center[1],
    }));
  }

  private async searchNominatim(query: string, limit: number): Promise<GeoPlace[]> {
    const url =
      `${this.nominatim}/search?format=jsonv2&countrycodes=mn&accept-language=mn` +
      `&limit=${limit}&q=${encodeURIComponent(query)}`;
    const result = await this.fetchJson<NominatimPlace[]>(url);
    return (result ?? []).map((place) => this.fromNominatim(place));
  }

  private fromNominatim(place: NominatimPlace): GeoPlace {
    return {
      name: place.name || place.display_name.split(",")[0],
      address: place.display_name,
      city:
        place.address?.city ??
        place.address?.town ??
        place.address?.state ??
        null,
      lat: Number(place.lat),
      lng: Number(place.lon),
    };
  }

  /** Гадаад үйлчилгээ унасан ч хуудас ажиллах ёстой тул алдааг залгина */
  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "100ail-marketplace/0.1 (support@100ail.mn)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        this.logger.warn(`Байршлын үйлчилгээ ${response.status} буцаалаа`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Байршлын үйлчилгээ алдаа: ${(error as Error).message}`);
      return null;
    }
  }
}

interface MapboxFeature {
  text: string;
  place_name: string;
  center: [number, number];
  context?: { id: string; text: string }[];
}

interface NominatimPlace {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: { city?: string; town?: string; state?: string };
}
