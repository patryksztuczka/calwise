/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated workers do not accept a target origin. */
import { readerOptions } from "./barcode";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

const ready = prepareZXingModule({
  overrides: { locateFile: () => wasmUrl },
  fireImmediately: true,
});
void ready
  .then(() => self.postMessage({ ready: true }))
  .catch(() => {
    self.postMessage({
      error: "Nie udało się uruchomić dekodera. Odśwież stronę i spróbuj ponownie.",
    });
  });
self.addEventListener("message", async (event: MessageEvent<ImageData>) => {
  try {
    await ready;
    const results = await readBarcodes(event.data, readerOptions);
    self.postMessage({ codes: results.map((result) => result.text) });
  } catch {
    self.postMessage({ error: "Dekoder nie może odczytać obrazu. Uruchom aparat ponownie." });
  }
});
