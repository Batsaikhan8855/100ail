import { DeliveryStatus } from "@prisma/client";
import { deliveryPosition } from "./route";

const base = {
  city: "Улаанбаатар",
  originLat: 47.9,
  originLng: 106.9,
  destLat: 48.0,
  destLng: 107.0,
};

describe("deliveryPosition", () => {
  it("зам гараагүй бол агуулах дээр байна", () => {
    const position = deliveryPosition({
      ...base,
      status: DeliveryStatus.ASSIGNED,
      dispatchedAt: null,
    });
    expect(position?.progress).toBe(0);
    expect(position?.current).toEqual({ lat: 47.9, lng: 106.9 });
  });

  it("хүргэгдсэн бол хаяг дээр байна", () => {
    const position = deliveryPosition({
      ...base,
      status: DeliveryStatus.DELIVERED,
      dispatchedAt: new Date(),
    });
    expect(position?.progress).toBe(1);
    expect(position?.current).toEqual({ lat: 48.0, lng: 107.0 });
    expect(position?.etaMinutes).toBe(0);
  });

  it("замд яваа үед хугацаагаар дундуур шилжинэ", () => {
    const position = deliveryPosition({
      ...base,
      status: DeliveryStatus.IN_TRANSIT,
      dispatchedAt: new Date(Date.now() - 45 * 60_000),
    });
    expect(position?.progress).toBeCloseTo(0.5, 1);
    expect(position?.current.lat).toBeGreaterThan(47.9);
    expect(position?.current.lat).toBeLessThan(48.0);
    expect(position?.etaMinutes).toBeGreaterThan(0);
  });

  it("хүргэгдсэн гэж тэмдэглэх хүртэл 100% болохгүй", () => {
    const position = deliveryPosition({
      ...base,
      status: DeliveryStatus.IN_TRANSIT,
      dispatchedAt: new Date(Date.now() - 10 * 60 * 60_000),
    });
    expect(position?.progress).toBeLessThan(1);
    expect(position?.progress).toBeCloseTo(0.94, 2);
  });

  it("координатгүй бол хотын төвөөр орлуулна", () => {
    const position = deliveryPosition({
      city: "Дархан",
      originLat: null,
      originLng: null,
      destLat: 49.5,
      destLng: 106.0,
      status: DeliveryStatus.ASSIGNED,
      dispatchedAt: null,
    });
    expect(position?.origin).toEqual({ lat: 49.4867, lng: 105.9228 });
  });

  it("эхлэх ба очих цэг ижил бол байршил харуулахгүй", () => {
    expect(
      deliveryPosition({
        city: "Улаанбаатар",
        originLat: null,
        originLng: null,
        destLat: null,
        destLng: null,
        status: DeliveryStatus.IN_TRANSIT,
        dispatchedAt: new Date(),
      }),
    ).toBeNull();
  });
});
