import {
  defaultUnitWeight,
  formatWeight,
  planShipment,
  unitWeight,
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
});
