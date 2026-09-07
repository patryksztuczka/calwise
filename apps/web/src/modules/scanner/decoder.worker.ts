import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

export type DecoderReply =
  | { kind: "ready" }
  | { kind: "result"; code: string | undefined }
  | { kind: "error" };

function reply(message: DecoderReply) {
  // Workers post to their owning page, not a Window, so there is no targetOrigin.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  self.postMessage(message);
}

void prepareZXingModule({
  overrides: { locateFile: () => wasmUrl },
  fireImmediately: true,
}).then(
  () => reply({ kind: "ready" }),
  () => reply({ kind: "error" }),
);

self.addEventListener("message", async (event: MessageEvent<ImageData>) => {
  try {
    const results = await readBarcodes(event.data, {
      formats: ["EAN13", "EAN8", "UPCA", "UPCE", "Code128", "Code39", "ITF"],
      maxNumberOfSymbols: 1,
      tryHarder: false,
      tryInvert: false,
      textMode: "Plain",
    });
    reply({ kind: "result", code: results.find((result) => result.isValid)?.text });
  } catch {
    reply({ kind: "error" });
  }
});
