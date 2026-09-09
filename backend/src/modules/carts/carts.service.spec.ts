import { CartsService } from "./carts.service";

describe("CartsService.unitPrice", () => {
  const offer = { price: 24_900, bulkPrice: 23_500, bulkMinQty: 50 };

  it("доод тооноос бага үед жижиглэнгийн үнэ хэрэглэнэ", () => {
    expect(CartsService.unitPrice(offer, 49)).toBe(24_900);
  });

  it("доод тоонд хүрсэн үед бөөний үнэ хэрэглэнэ", () => {
    expect(CartsService.unitPrice(offer, 50)).toBe(23_500);
    expect(CartsService.unitPrice(offer, 120)).toBe(23_500);
  });

  it("бөөний үнэ тодорхойлоогүй бол үргэлж жижиглэнгийн үнэ", () => {
    const retailOnly = { price: 12_000, bulkPrice: null, bulkMinQty: null };
    expect(CartsService.unitPrice(retailOnly, 1000)).toBe(12_000);
  });

  it("бөөний үнэтэй ч доод тоо заагаагүй бол жижиглэнгийн үнэ", () => {
    const noMin = { price: 12_000, bulkPrice: 10_000, bulkMinQty: null };
    expect(CartsService.unitPrice(noMin, 1000)).toBe(12_000);
  });
});
