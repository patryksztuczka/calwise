export const nutritionOcrRuntimePaths = {
  worker: "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js",
  core: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0",
  languages: "https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@4.1.0",
} as const;

export const nutritionOcrAssetUrls = {
  worker: nutritionOcrRuntimePaths.worker,
  core: {
    lstm: `${nutritionOcrRuntimePaths.core}/tesseract-core-lstm.wasm.js`,
    simd: `${nutritionOcrRuntimePaths.core}/tesseract-core-simd-lstm.wasm.js`,
    relaxedSimd: `${nutritionOcrRuntimePaths.core}/tesseract-core-relaxedsimd-lstm.wasm.js`,
  },
  languages: {
    eng: `${nutritionOcrRuntimePaths.languages}/eng.traineddata`,
    pol: `${nutritionOcrRuntimePaths.languages}/pol.traineddata`,
  },
} as const;

export interface NutritionOcrObservedRequest {
  readonly url: string;
  readonly method: string;
  readonly hasBody: boolean;
}

const pinnedRemoteAssets = new Set([
  nutritionOcrAssetUrls.worker,
  nutritionOcrAssetUrls.core.lstm,
  nutritionOcrAssetUrls.core.simd,
  nutritionOcrAssetUrls.core.relaxedSimd,
  nutritionOcrAssetUrls.core.lstm.replace(/\.js$/, ""),
  nutritionOcrAssetUrls.core.simd.replace(/\.js$/, ""),
  nutritionOcrAssetUrls.core.relaxedSimd.replace(/\.js$/, ""),
  nutritionOcrAssetUrls.languages.eng,
  nutritionOcrAssetUrls.languages.pol,
]);

export function isNutritionOcrCoreUrl(url: string) {
  return (
    url === nutritionOcrAssetUrls.core.lstm ||
    url === nutritionOcrAssetUrls.core.simd ||
    url === nutritionOcrAssetUrls.core.relaxedSimd ||
    url === nutritionOcrAssetUrls.core.lstm.replace(/\.js$/, "") ||
    url === nutritionOcrAssetUrls.core.simd.replace(/\.js$/, "") ||
    url === nutritionOcrAssetUrls.core.relaxedSimd.replace(/\.js$/, "")
  );
}

function isAllowlistedLocalStaticAsset(url: URL) {
  if (url.origin !== "http://localhost:4173" || url.search !== "" || url.hash !== "") return false;
  return (
    /^\/assets\/[A-Za-z0-9._-]+$/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js"
  );
}

function isAllowlistedBlobAsset(rawUrl: string) {
  if (!rawUrl.startsWith("blob:http://localhost:4173/")) return false;
  const url = new URL(rawUrl);
  return url.search === "" && url.hash === "";
}

/** Returns a body-free reason suitable for test output, or null when the request is allowed. */
export function inspectNutritionOcrRequest(request: NutritionOcrObservedRequest): string | null {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return "request method is not GET or HEAD";
  if (request.hasBody) return "asset request contains a body";

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return "request URL is invalid";
  }
  if (url.username !== "" || url.password !== "") return "request URL contains credentials";
  if (pinnedRemoteAssets.has(request.url)) return null;
  if (isAllowlistedLocalStaticAsset(url)) return null;
  if (isAllowlistedBlobAsset(request.url)) return null;
  return "request URL is not an allowlisted OCR or local static asset";
}
