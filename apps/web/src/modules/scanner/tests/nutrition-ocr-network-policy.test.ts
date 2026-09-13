import { describe, expect, it } from "vite-plus/test";
import { inspectNutritionOcrRequest, nutritionOcrAssetUrls } from "../nutrition-ocr-network-policy";

const get = (url: string, hasBody = false) => ({ url, method: "GET", hasBody });

describe("nutrition OCR browser request policy", () => {
  it.each([
    nutritionOcrAssetUrls.worker,
    nutritionOcrAssetUrls.core.lstm,
    nutritionOcrAssetUrls.core.simd,
    nutritionOcrAssetUrls.core.relaxedSimd,
    nutritionOcrAssetUrls.languages.eng,
    nutritionOcrAssetUrls.languages.pol,
    "http://localhost:4173/assets/create-product-page-abc_123.js",
    "http://localhost:4173/manifest.webmanifest",
    "http://localhost:4173/sw.js",
    "blob:http://localhost:4173/12345678-1234-1234-1234-123456789abc",
  ])("accepts a body-free pinned or local static asset: %s", (url) => {
    expect(inspectNutritionOcrRequest(get(url))).toBeNull();
    expect(inspectNutritionOcrRequest({ url, method: "HEAD", hasBody: false })).toBeNull();
  });

  it.each([
    ["PUT asset request", { ...get(nutritionOcrAssetUrls.worker), method: "PUT" }],
    ["body-bearing asset request", get(nutritionOcrAssetUrls.languages.eng, true)],
    [
      "wrong CDN asset",
      get("https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/tesseract.min.js"),
    ],
    ["unexpected query", get(`${nutritionOcrAssetUrls.worker}?token=secret`)],
    [
      "unpinned core version",
      get("https://cdn.jsdelivr.net/npm/tesseract.js-core@latest/tesseract-core-lstm.wasm.js"),
    ],
    [
      "unexpected outbound upload",
      { url: "https://example.com/ocr", method: "POST", hasBody: true },
    ],
    [
      "local API after monitoring",
      { url: "http://localhost:8787/trpc/food", method: "GET", hasBody: false },
    ],
    [
      "local mutation after monitoring",
      { url: "http://localhost:4173/api/ocr", method: "PATCH", hasBody: true },
    ],
  ])("rejects %s", (_name, request) => {
    expect(inspectNutritionOcrRequest(request)).not.toBeNull();
  });
});
