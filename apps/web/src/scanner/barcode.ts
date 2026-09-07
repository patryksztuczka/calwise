import type { ReaderOptions } from "zxing-wasm/reader";

export const readerOptions: ReaderOptions = {
  formats: ["EAN-13", "EAN-8", "UPC-A"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  eanAddOnSymbol: "Ignore",
};

// GTIN check digit validation prevents accepting partial or malformed retail codes.
export function validBarcode(code: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) {
    sum += Number(code[i]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}

export function scanRegion(width: number, height: number, full: boolean) {
  const cropHeight = full ? height : Math.round(height * 0.5);
  const scale = Math.min(1, 1280 / width);
  return {
    y: Math.floor((height - cropHeight) / 2),
    cropHeight,
    width: Math.round(width * scale),
    height: Math.round(cropHeight * scale),
  };
}
