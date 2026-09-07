import type { DecoderReply } from "./decoder.worker";

const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

interface NativeDetector {
  detect(source: HTMLCanvasElement): Promise<{ rawValue: string }[]>;
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

function workerDecoder(signal: AbortSignal) {
  const worker = new Worker(new URL("./decoder.worker.ts", import.meta.url), { type: "module" });
  let resolveReply: ((reply: DecoderReply) => void) | undefined;
  let rejectReply: ((error: Error) => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function waitForReply() {
    return new Promise<DecoderReply>((resolve, reject) => {
      resolveReply = resolve;
      rejectReply = reject;
      timeout = setTimeout(() => reject(new Error("Barcode decoder timed out")), 15_000);
    });
  }

  worker.addEventListener("message", (event: MessageEvent<DecoderReply>) => {
    clearTimeout(timeout);
    if (event.data.kind === "error") rejectReply?.(new Error("Barcode decoder failed"));
    else resolveReply?.(event.data);
  });
  worker.addEventListener("error", () => {
    clearTimeout(timeout);
    rejectReply?.(new Error("Barcode decoder could not load"));
  });
  signal.addEventListener(
    "abort",
    () => {
      worker.terminate();
      clearTimeout(timeout);
      rejectReply?.(new DOMException("Scanning stopped", "AbortError"));
    },
    { once: true },
  );

  const ready = waitForReply();
  return {
    ready,
    async detect(canvas: HTMLCanvasElement) {
      signal.throwIfAborted();
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Camera frames are unavailable");
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const reply = waitForReply();
      worker.postMessage(image, [image.data.buffer]);
      const result = await reply;
      return result.kind === "result" ? result.code : undefined;
    },
  };
}

/** Uses the platform decoder first; the bundled WASM worker is loaded only when needed. */
export async function createBarcodeDecoder(signal: AbortSignal) {
  let native: NativeDetector | undefined;
  try {
    const Detector = window.BarcodeDetector;
    if (Detector) {
      const supported = await Detector.getSupportedFormats();
      if (formats.every((format) => supported.includes(format))) {
        native = new Detector({ formats });
      }
    }
  } catch {
    // Some browsers expose the API but cannot initialize its platform service.
  }
  signal.throwIfAborted();
  let fallback: ReturnType<typeof workerDecoder> | undefined;
  if (!native) {
    fallback = workerDecoder(signal);
    await fallback.ready;
  }
  return {
    async detect(canvas: HTMLCanvasElement): Promise<string | undefined> {
      signal.throwIfAborted();
      if (native) {
        try {
          const results = await native.detect(canvas);
          return results.find((result) => result.rawValue.length > 0)?.rawValue;
        } catch {
          signal.throwIfAborted();
          native = undefined;
          fallback = workerDecoder(signal);
          await fallback.ready;
        }
      }
      return fallback?.detect(canvas);
    },
  };
}
