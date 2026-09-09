import { RedisService } from "../../common/cache/redis.service";
import { PrismaService } from "../../common/prisma.service";
import { distanceKm, GeoService } from "./geo.service";

const redis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
} as unknown as RedisService;

describe("distanceKm", () => {
  it("Улаанбаатар — Дархан хоорондын зайг ойролцоогоор олно", () => {
    const ub = { lat: 47.918, lng: 106.917 };
    const darkhan = { lat: 49.486, lng: 105.922 };
    expect(distanceKm(ub, darkhan)).toBeGreaterThan(170);
    expect(distanceKm(ub, darkhan)).toBeLessThan(200);
  });

  it("ижил цэгийн зай тэг байна", () => {
    expect(distanceKm({ lat: 47.9, lng: 106.9 }, { lat: 47.9, lng: 106.9 })).toBe(0);
  });
});

describe("GeoService", () => {
  const env = { ...process.env };
  const fetchMock = jest.fn();
  const prisma = { warehouse: { findMany: jest.fn() } } as unknown as PrismaService;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("MAPBOX_TOKEN байхгүй үед OpenStreetMap ашиглана", async () => {
    delete process.env.MAPBOX_TOKEN;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: "Мишээл экспо",
          display_name: "Мишээл экспо, Улаанбаатар",
          lat: "47.9105",
          lon: "106.8830",
          address: { city: "Улаанбаатар" },
        },
      ],
    });

    const geo = new GeoService(prisma, redis);
    expect(geo.provider).toBe("osm");

    const places = await geo.search("мишээл");
    expect(fetchMock.mock.calls[0][0]).toContain("nominatim.openstreetmap.org/search");
    expect(places[0]).toEqual({
      name: "Мишээл экспо",
      address: "Мишээл экспо, Улаанбаатар",
      city: "Улаанбаатар",
      lat: 47.9105,
      lng: 106.883,
    });
  });

  it("MAPBOX_TOKEN тохируулбал Mapbox руу хандана", async () => {
    process.env.MAPBOX_TOKEN = "pk.test";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            text: "Нарантуул",
            place_name: "Нарантуул, Улаанбаатар",
            center: [106.94, 47.91],
            context: [{ id: "place.1", text: "Улаанбаатар" }],
          },
        ],
      }),
    });

    const geo = new GeoService(prisma, redis);
    expect(geo.provider).toBe("mapbox");

    const places = await geo.search("нарантуул");
    expect(fetchMock.mock.calls[0][0]).toContain("api.mapbox.com");
    expect(places[0].lat).toBe(47.91);
    expect(places[0].city).toBe("Улаанбаатар");
  });

  it("хэт богино хайлтад гадагш хандахгүй", async () => {
    const geo = new GeoService(prisma, redis);
    await expect(geo.search("а")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("үйлчилгээ унасан үед хоосон жагсаалт буцаана", async () => {
    delete process.env.MAPBOX_TOKEN;
    fetchMock.mockRejectedValue(new Error("timeout"));
    const geo = new GeoService(prisma, redis);
    await expect(geo.search("цемент")).resolves.toEqual([]);
  });

  it("агуулахуудыг зайгаар эрэмбэлж, нөөцөлснийг хассан үлдэгдэл өгнө", async () => {
    (prisma.warehouse.findMany as jest.Mock).mockResolvedValue([
      {
        id: "w-far",
        name: "Дархан салбар",
        city: "Дархан",
        address: null,
        lat: 49.486,
        lng: 105.922,
        supplier: { id: "s1", name: "Монцемент", slug: "montsement", verified: true },
        inventory: [{ quantity: 100, reserved: 10 }],
      },
      {
        id: "w-near",
        name: "Төв агуулах",
        city: "Улаанбаатар",
        address: "БЗД",
        lat: 47.92,
        lng: 106.92,
        supplier: { id: "s1", name: "Монцемент", slug: "montsement", verified: true },
        inventory: [{ quantity: 40, reserved: 5 }],
      },
    ]);

    const geo = new GeoService(prisma, redis);
    const rows = await geo.nearestWarehouses({ lat: 47.918, lng: 106.917 });

    expect(rows.map((row) => row.id)).toEqual(["w-near", "w-far"]);
    expect(rows[0].stock).toBe(35);
    expect(rows[0].distanceKm).toBeLessThan(1);
  });
});
