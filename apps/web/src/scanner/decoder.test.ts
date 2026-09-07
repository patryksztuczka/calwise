import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vite-plus/test";
import { prepareZXingModule as prepareWriter, writeBarcode } from "zxing-wasm/writer";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { readerOptions, validBarcode } from "./barcode";

const require = createRequire(import.meta.url);
prepareWriter({
  overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/writer/zxing_writer.wasm")) },
});
prepareZXingModule({
  overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")) },
});

describe("real WASM retail decoder", () => {
  it.each([
    { format: "EAN-13", code: "3017620422003" },
    { format: "EAN-8", code: "96385074" },
    { format: "UPC-A", code: "012345678905" },
  ] as const)("decodes a $format image with the camera options", async ({ format, code }) => {
    const barcode = await writeBarcode(code, { format, scale: 3 });
    expect(barcode.error).toBe("");
    expect(barcode.image).not.toBeNull();
    const decoded = await readBarcodes(await barcode.image!.arrayBuffer(), readerOptions);
    // UPC-A and its zero-prefixed EAN-13 representation identify the same product.
    expect(
      decoded.some(
        (result) =>
          result.text.replace(/^0+/, "") === code.replace(/^0+/, "") && validBarcode(result.text),
      ),
    ).toBe(true);
  });
});
