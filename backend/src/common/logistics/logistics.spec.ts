import {
  defaultUnitWeight,
  formatWeight,
  planShipment,
  shipmentPrice,
  unitWeight,
  vehicleById,
  VEHICLES,
} from "./logistics";

describe("logistics", () => {
  describe("defaultUnitWeight", () => {
    it("ангилал, нэгжийн хослолоор жин олно", () => {
      expect(defaultUnitWeight("cement", "ш")).toBe(50);
      expect(defaultUnitWeight("brick", "ш")).toBe(3.5);
      expect(defaultUnitWeight("cement", "м3")).toBe(2400);
    });

    it("нэгж тохирохгүй бол ангиллын ерөнхий утгыг авна", () => {
      expect(defaultUnitWeight("brick", "багц")).toBe(3.5);
    });

    it("ангилал ч тохирохгүй бол ерөнхий анхдагчийг авна", () => {
      expect(defaultUnitWeight("mystery", "багц")).toBe(5);
      expect(defaultUnitWeight(null, null)).toBe(6); // tools:ш
    });
  });

  describe("unitWeight", () => {
    it("нийлүүлэгчийн оруулсан жин таамгаас давамгайлна", () => {
      const offer = {
        weightKg: 42,
        unit: "ш",
        product: { category: { icon: "cement" } },
      };
      expect(unitWeight(offer)).toBe(42);
    });

    it("жин оруулаагүй бол ангиллаар таамаглана", () => {
      const offer = { unit: "ш", product: { category: { icon: "cement" } } };
      expect(unitWeight(offer)).toBe(50);
    });

    it("тэг эсвэл сөрөг жинг үл тоомсорлоно", () => {
      const offer = {
        weightKg: 0,
        unit: "ш",
        product: { category: { icon: "brick" } },
      };
      expect(unitWeight(offer)).toBe(3.5);
    });
  });

  describe("planShipment", () => {
    it("хоосон ачаанд машин сонгохгүй", () => {
      expect(planShipment(0)).toEqual({
        totalKg: 0,
        vehicle: null,
        trips: 0,
        estimated: false,
        price: 0,
        chosen: false,
      });
    });

    it("багтах хамгийн жижиг машиныг сонгоно", () => {
      expect(planShipment(800).vehicle?.id).toBe("porter");
      expect(planShipment(1000).vehicle?.id).toBe("porter");
      expect(planShipment(1001).vehicle?.id).toBe("truck-3");
      expect(planShipment(4500).vehicle?.id).toBe("truck-5");
    });

    it("40 шуудай цемент 3 тонны машин шаардана", () => {
      const plan = planShipment(40 * 50);
      expect(plan.totalKg).toBe(2000);
      expect(plan.vehicle?.id).toBe("truck-3");
      expect(plan.trips).toBe(1);
    });

    it("хамгийн том машинаас хэтэрвэл ачилтын тоог бодно", () => {
      const largest = VEHICLES[VEHICLES.length - 1];
      const plan = planShipment(largest.capacityKg * 2 + 1);
      expect(plan.vehicle?.id).toBe(largest.id);
      expect(plan.trips).toBe(3);
    });
  });

  describe("formatWeight", () => {
    it("тонн болон килограммаар бичнэ", () => {
      expect(formatWeight(2400)).toBe("2.4 т");
      expect(formatWeight(950)).toBe("950 кг");
      expect(formatWeight(24_000)).toBe("24 т");
      expect(formatWeight(3.55)).toBe("3.6 кг");
    });
  });

  describe("хүргэлтийн үнэ", () => {
    const porter = vehicleById("porter")!;
    const truck5 = vehicleById("truck-5")!;

    it("сонгосон машины тарифаар үнэ гарна", () => {
      expect(shipmentPrice(240, porter)).toBe(porter.price);
      expect(shipmentPrice(240, truck5)).toBe(truck5.price);
    });

    it("даацаас хэтэрсэн ачаанд ачилтын тоогоор үржинэ", () => {
      // 2.5 т ачаа 1 тонны Портероор 3 удаа явна
      expect(shipmentPrice(2500, porter)).toBe(porter.price * 3);
    });

    it("сонгосон машин багтвал түүгээр, эс бөгөөс санал болгосноор", () => {
      const chosen = planShipment(240, false, truck5);
      expect(chosen.vehicle?.id).toBe("truck-5");
      expect(chosen.price).toBe(truck5.price);
      expect(chosen.chosen).toBe(true);

      // 2.5 т ачаа Портерт багтахгүй тул санал болгосон машин руу буцна
      const tooSmall = planShipment(2500, false, porter);
      expect(tooSmall.vehicle?.id).toBe("truck-3");
      expect(tooSmall.chosen).toBe(false);
    });

    it("хоосон ачаанд үнэ 0", () => {
      expect(planShipment(0).price).toBe(0);
    });

    it("vehicleById танихгүй id-д null өгнө", () => {
      expect(vehicleById("nope")).toBeNull();
      expect(vehicleById(null)).toBeNull();
    });

    it("санал болгосон машин нь багтах машинуудаас хамгийн хямд нь", () => {
      // 1.1 т ачаанд Портер 2 ачилт (50,000₮) хийхээс 3 тонны машинаар
      // нэг удаа (45,000₮) явуулах нь хямд. Санал болгох нь үргэлж
      // хамгийн хямд сонголт байх ёстой.
      for (const kg of [50, 900, 1100, 2500, 3200, 4800, 9000, 12_000]) {
        const plan = planShipment(kg);
        const cheapestThatFits = Math.min(
          ...VEHICLES.filter((v) => v.capacityKg >= kg).map((v) => v.price),
        );
        if (Number.isFinite(cheapestThatFits)) {
          expect(plan.price).toBe(cheapestThatFits);
        }
      }
    });

    it("бүх машин тарифтай, даацаар нь өсөж эрэмбэлэгдсэн", () => {
      expect(VEHICLES.every((v) => v.price > 0)).toBe(true);
      const prices = VEHICLES.map((v) => v.price);
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    });
  });
});
