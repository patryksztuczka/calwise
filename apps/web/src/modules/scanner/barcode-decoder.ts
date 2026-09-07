import type { DecoderReply } from "./decoder.worker";

export interface Decoder {
  detect(image: ImageData): Promise<string | undefined>;
}

const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

interface NativeDetector {
  detect(image: ImageData): Promise<{ rawValue: string }[]>;
}

interface NativeDetectorConstructor {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

// BarcodeDetector is not yet in TypeScript's DOM library. It remains optional at runtime.
declare global {
  interface Window {
    BarcodeDetector?: NativeDetectorConstructor;
  }
}

async function nativeDecoder(): Promise<Decoder | undefined> {
  try {
    const Detector = window.BarcodeDetector;
    if (!Detector) return;
    const supported = await Detector.getSupportedFormats();
    if (!formats.every((format) => supported.includes(format))) return;
    const detector = new Detector({ formats });
    return {
      async detect(image) {
        return (await detector.detect(image)).find((result) => result.rawValue.length > 0)
          ?.rawValue;
      },
    };
  } catch {
    // Some browsers expose the API but cannot initialize its platform service.
    return undefined;
  }
}

function workerDecoder(signal: AbortSignal): Decoder {
  signal.throwIfAborted();
  const worker = new Worker(new URL("./decoder.worker.ts", import.meta.url), { type: "module" });
  signal.addEventListener("abort", () => worker.terminate(), { once: true });
  return {
    async detect(image) {
      signal.throwIfAborted();
      const request = new AbortController();
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
      return new Promise<string | undefined>((resolve, reject) => {
        worker.addEventListener(
          "message",
          (event: MessageEvent<DecoderReply>) => {
            if (event.data.kind === "error") reject(new Error("Barcode decoder failed"));
            else resolve(event.data.code);
          },
          { once: true, signal: request.signal },
        );
        worker.addEventListener(
          "error",
          () => reject(new Error("Barcode decoder could not load")),
          { once: true, signal: request.signal },
        );
        deadline.addEventListener(
          "abort",
          () => reject(new DOMException("Barcode decode aborted or timed out", "AbortError")),
          { once: true, signal: request.signal },
        );
        worker.postMessage(image, [image.data.buffer]);
      })
        .catch((error) => {
          // A late reply from a failed request must never satisfy a later detect call.
          worker.terminate();
          throw error;
        })
        .finally(() => request.abort());
    },
  };
}

/** Owns the single-flight invariant and switches from native to WASM at most once. */
export async function createBarcodeDecoder(signal: AbortSignal): Promise<Decoder> {
  const native = await nativeDecoder();
  signal.throwIfAborted();
  let decoder = native ?? workerDecoder(signal);
  let detecting = false;
  return {
    async detect(image) {
      signal.throwIfAborted();
      if (detecting) throw new Error("A barcode decode is already in progress");
      detecting = true;
      return decoder
        .detect(image)
        .catch((error) => {
          signal.throwIfAborted();
          if (decoder !== native) throw error;
          decoder = workerDecoder(signal);
          return decoder.detect(image);
        })
        .finally(() => {
          detecting = false;
        });
    },
  };
}
