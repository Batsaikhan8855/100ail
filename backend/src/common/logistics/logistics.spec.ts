import {
  defaultUnitVolume,
  defaultUnitWeight,
  formatBed,
  formatVolume,
  formatWeight,
  palletsOnFloor,
  planShipment,
  shipmentPrice,
  unitVolume,
  unitWeight,
  vehicleById,
  VEHICLES,
} from "./logistics";

describe("palletsOnFloor", () => {
  it("нэг чиглэлээр биш, холимгоор тавьж хамгийн ихийг олно", () => {
    // 5.5 × 2.2: цэвэр урт талаар 4×2 = 8, харин нэг эгнээ хөндлөн
    // тавибал 4 + 6 = 10
    expect(palletsOnFloor({ lengthM: 5.5, widthM: 2.2, heightM: 2.2 })).toBe(10);
    // 4.3 × 2.0: 3×2 = 6, холимгоор 3 + 5 = 8
    expect(palletsOnFloor({ lengthM: 4.3, widthM: 2.0, heightM: 2.0 })).toBe(8);
  });

  it("паллет багтахгүй жижиг тэвшинд 0", () => {
    expect(palletsOnFloor({ lengthM: 0.5, widthM: 0.5, heightM: 1 })).toBe(0);
    expect(palletsOnFloor({ lengthM: 0, widthM: 0, heightM: 0 })).toBe(0);
  });

  it("машин бүрд тооцоологдсон байна", () => {
    for (const v of VEHICLES) {
      expect(`${v.name}: ${v.pallets}`).toBe(
        `${v.name}: ${palletsOnFloor(v.bed)}`,
      );
      expect(v.pallets).toBeGreaterThan(0);
    }
  });
});

describe("VEHICLES габарит", () => {
  it("урд гарц + гүүр хоорондын зай + хойд гарц нь гадна урттай тэнцэнэ", () => {
    for (const { name, spec } of VEHICLES) {
      const sum =
        spec.frontOverhangM + spec.wheelbaseM + spec.rearOverhangM;
      expect(`${name}: ${Number(sum.toFixed(3))}`).toBe(
        `${name}: ${Number(spec.lengthM.toFixed(3))}`,
      );
    }
  });

  it("тэвш нь машины гадна габаритад багтана", () => {
    for (const { name, bed, spec } of VEHICLES) {
      expect(`${name} урт`).toBe(
        bed.lengthM < spec.lengthM ? `${name} урт` : "хэтэрсэн",
      );
      expect(`${name} өргөн`).toBe(
        bed.widthM <= spec.widthM ? `${name} өргөн` : "хэтэрсэн",
      );
      expect(`${name} өндөр`).toBe(
        bed.heightM < spec.heightM ? `${name} өндөр` : "хэтэрсэн",
      );
    }
  });
});

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
      expect(planShipment({ kg: 0, m3: 0 })).toEqual({
        totalKg: 0,
        totalM3: 0,
        limitedBy: "weight",
        vehicle: null,
        trips: 0,
        estimated: false,
        price: 0,
        chosen: false,
      });
    });

    it("багтах хамгийн жижиг машиныг сонгоно", () => {
      expect(planShipment({ kg: 800, m3: 0 }).vehicle?.id).toBe("porter");
      expect(planShipment({ kg: 1000, m3: 0 }).vehicle?.id).toBe("porter");
      expect(planShipment({ kg: 1001, m3: 0 }).vehicle?.id).toBe("truck-3");
      expect(planShipment({ kg: 4500, m3: 0 }).vehicle?.id).toBe("truck-5");
    });

    it("40 шуудай цемент 3 тонны машин шаардана", () => {
      const plan = planShipment({ kg: 40 * 50, m3: 0 });
      expect(plan.totalKg).toBe(2000);
      expect(plan.vehicle?.id).toBe("truck-3");
      expect(plan.trips).toBe(1);
    });

    it("хамгийн том машинаас хэтэрвэл ачилтын тоог бодно", () => {
      const largest = VEHICLES[VEHICLES.length - 1];
      const plan = planShipment({ kg: largest.capacityKg * 2 + 1, m3: 0 });
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
      expect(shipmentPrice({ kg: 240, m3: 0 }, porter)).toBe(porter.price);
      expect(shipmentPrice({ kg: 240, m3: 0 }, truck5)).toBe(truck5.price);
    });

    it("даацаас хэтэрсэн ачаанд ачилтын тоогоор үржинэ", () => {
      // 2.5 т ачаа 1 тонны Портероор 3 удаа явна
      expect(shipmentPrice({ kg: 2500, m3: 0 }, porter)).toBe(porter.price * 3);
    });

    it("сонгосон машин багтвал түүгээр, эс бөгөөс санал болгосноор", () => {
      const chosen = planShipment({ kg: 240, m3: 0 }, false, truck5);
      expect(chosen.vehicle?.id).toBe("truck-5");
      expect(chosen.price).toBe(truck5.price);
      expect(chosen.chosen).toBe(true);

      // 2.5 т ачаа Портерт багтахгүй тул санал болгосон машин руу буцна
      const tooSmall = planShipment({ kg: 2500, m3: 0 }, false, porter);
      expect(tooSmall.vehicle?.id).toBe("truck-3");
      expect(tooSmall.chosen).toBe(false);
    });

    it("хоосон ачаанд үнэ 0", () => {
      expect(planShipment({ kg: 0, m3: 0 }).price).toBe(0);
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
        const plan = planShipment({ kg, m3: 0 });
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

  describe("овор", () => {
    it("бүх машин тэвшийн хэмжээ, эзэлхүүнтэй", () => {
      for (const v of VEHICLES) {
        expect(v.bed.lengthM).toBeGreaterThan(0);
        expect(v.volumeM3).toBeCloseTo(
          v.bed.lengthM * v.bed.widthM * v.bed.heightM,
          1,
        );
      }
      // Даац өсөхийн хэрээр тэвш ч томордог
      const vols = VEHICLES.map((v) => v.volumeM3);
      expect([...vols].sort((a, b) => a - b)).toEqual(vols);
    });

    it("хөнгөн ч овор ихтэй ачаанд том машин сонгоно", () => {
      // 300 м² дулаалга: 450 кг (Портерын даацад багтана) ба 15 м³
      // (Портерын 4 м³ тэвшинд багтахгүй)
      const load = { kg: 450, m3: 15 };
      const porter = vehicleById("porter")!;
      expect(load.kg).toBeLessThan(porter.capacityKg);
      expect(load.m3).toBeGreaterThan(porter.volumeM3);

      const plan = planShipment(load);
      expect(plan.vehicle?.id).toBe("truck-3");
      expect(plan.limitedBy).toBe("volume");
      expect(plan.trips).toBe(1);
    });

    it("оврын хязгаараар ачилтын тоог бодно", () => {
      // 200 м³ ачаа хөнгөн ч чиргүүлийн 90 м³ тэвшинд 3 удаа л багтана
      const largest = VEHICLES[VEHICLES.length - 1];
      const plan = planShipment({ kg: 1000, m3: 200 });
      expect(plan.vehicle?.id).toBe(largest.id);
      expect(plan.limitedBy).toBe("volume");
      expect(plan.trips).toBe(Math.ceil(200 / largest.volumeM3));
      expect(plan.price).toBe(largest.price * plan.trips);
    });

    it("овор багтахгүй бол дараагийн том машин руу шилжинэ", () => {
      // 40 м³ нь 3 тонны машины 17 м³ тэвшинд багтахгүй тул 10 тонных
      const plan = planShipment({ kg: 100, m3: 40 }, false, vehicleById("truck-3"));
      expect(plan.chosen).toBe(false);
      expect(plan.vehicle?.id).toBe("truck-10");
      expect(plan.trips).toBe(1);
    });

    it("овор багтахгүй машиныг сонгуулахгүй", () => {
      const plan = planShipment({ kg: 450, m3: 15 }, false, vehicleById("porter"));
      expect(plan.chosen).toBe(false);
      expect(plan.vehicle?.id).toBe("truck-3");
    });

    it("жин давамгайлбал limitedBy нь weight", () => {
      const plan = planShipment({ kg: 2900, m3: 1 });
      expect(plan.limitedBy).toBe("weight");
    });

    it("defaultUnitVolume ангилал, нэгжээр овор олно", () => {
      expect(defaultUnitVolume("cement", "ш")).toBe(0.035);
      expect(defaultUnitVolume("insulation", "м2")).toBe(0.05);
      expect(defaultUnitVolume("mystery", "багц")).toBe(0.03);
    });

    it("unitVolume нь нийлүүлэгчийн утгыг илүүд үзнэ", () => {
      expect(unitVolume({ volumeM3: 2, unit: "ш" })).toBe(2);
      expect(
        unitVolume({ unit: "ш", product: { category: { icon: "cement" } } }),
      ).toBe(0.035);
    });

    it("formatVolume, formatBed уншигдахуйц", () => {
      expect(formatVolume(0.35)).toBe("0.35 м³");
      expect(formatVolume(4)).toBe("4 м³");
      expect(formatVolume(17.2)).toBe("17 м³");
      expect(formatBed({ lengthM: 4.3, widthM: 2, heightM: 2 })).toBe(
        "4.3 × 2 × 2 м",
      );
    });
  });
});
