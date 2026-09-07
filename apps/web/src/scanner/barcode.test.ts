import { describe, expect, it } from "vite-plus/test";
import { scanRegion, validBarcode } from "./barcode";
import { barcodeProduct, parseBarcodeResponse } from "./product";

describe("retail barcode validation", () => {
  it.each(["3017620422003", "96385074", "012345678905", "10012345678902"])(
    "accepts valid GTIN %s without dropping leading zeros",
    (code) => {
      expect(validBarcode(code)).toBe(true);
    },
  );
  it.each([
    "3017620422004",
    "96385075",
    "012345678904",
    "",
    "301762042200",
    "abc",
    " 3017620422003",
    "https://example.com",
  ])("rejects %s", (code) => {
    expect(validBarcode(code)).toBe(false);
  });
});

describe("camera decode region", () => {
  it("prioritizes the middle half and caps image width", () => {
    expect(scanRegion(1920, 1080, false)).toEqual({
      y: 270,
      cropHeight: 540,
      width: 1280,
      height: 360,
    });
  });
  it("periodically includes codes outside the guide", () => {
    expect(scanRegion(1920, 1080, true)).toEqual({
      y: 0,
      cropHeight: 1080,
      width: 1280,
      height: 720,
    });
  });
  it("does not upscale a portrait camera", () => {
    expect(scanRegion(720, 1280, false)).toEqual({
      y: 320,
      cropHeight: 640,
      width: 720,
      height: 640,
    });
  });
});

describe("barcode nutrition", () => {
  it("accepts global products and prefers their Polish name", () => {
    const product = barcodeProduct(
      parseBarcodeResponse({
        status: 1,
        product: {
          product_name: "Milk",
          product_name_pl: " Mleko ",
          nutriments: { "energy-kj_100g": 418.4, proteins_100g: 0, fat_100g: -1 },
        },
      }),
      "012345678905",
    );
    expect(product).toMatchObject({
      name: "Mleko",
      code: "012345678905",
      protein: 0,
      fat: null,
      carbs: null,
    });
    expect(product?.kcal).toBeCloseTo(100);
  });
  it("does not invent nutrition for an incomplete product", () => {
    expect(
      barcodeProduct(
        parseBarcodeResponse({ status: 1, product: { product_name: "Milk" } }),
        "012345678905",
      )?.kcal,
    ).toBeNull();
  });
  it("returns no product for missing or unnamed entries", () => {
    expect(barcodeProduct(parseBarcodeResponse({ status: 0 }), "012345678905")).toBeNull();
    expect(
      barcodeProduct(parseBarcodeResponse({ status: 1, product: {} }), "012345678905"),
    ).toBeNull();
  });
  it("rejects malformed API data at the boundary", () => {
    expect(() =>
      parseBarcodeResponse({ status: 1, product: { nutriments: { proteins_100g: "12" } } }),
    ).toThrow();
  });
});
