import { scanRegion, validBarcode } from "./barcode";

type Detector = { detect(image: HTMLCanvasElement): Promise<{ rawValue: string }[]> };
export interface ScanResult {
  code: string;
  engine: string;
  decodeMs: number;
  elapsedMs: number;
}

export function startCamera(
  video: HTMLVideoElement,
  callbacks: {
    ready: (track: MediaStreamTrack, engine: string) => void;
    result: (result: ScanResult) => void;
    error: (message: string) => void;
  },
): () => void {
  let stopped = false;
  let stream: MediaStream | undefined;
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let started = 0;
  let decodeStarted = 0;
  let engine = "";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    worker?.terminate();
    stream?.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
  const fail = (message: string) => {
    if (stopped) return;
    stop();
    callbacks.error(message);
  };
  const onHidden = () => {
    if (document.hidden) fail("Skanowanie wstrzymane. Uruchom aparat, gdy wrócisz.");
  };
  document.addEventListener("visibilitychange", onHidden);

  void (async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Aparat wymaga HTTPS lub localhost. Możesz też wpisać kod ręcznie.");
    }
    let detector: Detector | undefined;
    const Native = window.BarcodeDetector;
    try {
      const formats = await Native?.getSupportedFormats();
      const wanted = ["ean_13", "ean_8", "upc_a"];
      if (Native && wanted.every((format) => formats?.includes(format))) {
        detector = new Native({ formats: wanted });
      }
    } catch {
      /* Use the local WASM decoder if native detection cannot initialize. */
    }
    if (stopped) return;
    engine = detector ? "Native" : "ZXing · WASM worker";
    let workerReady: Promise<void> = Promise.resolve();
    if (!detector) {
      worker = new Worker(new URL("./decoder.worker.ts", import.meta.url), { type: "module" });
      workerReady = new Promise<void>((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Dekoder nie odpowiada. Spróbuj ponownie.")),
          20_000,
        );
        worker!.addEventListener(
          "error",
          () => reject(new Error("Nie udało się załadować dekodera.")),
          { once: true },
        );
        worker!.addEventListener(
          "message",
          (event) => {
            clearTimeout(timer);
            if (event.data.error) reject(new Error(event.data.error));
            else resolve();
          },
          { once: true },
        );
      });
    }
    // Request the camera while WASM downloads and compiles.
    const cameraReady = navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
      })
      .then(async (media) => {
        stream = media;
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = media;
        await video.play();
      });
    await Promise.all([workerReady, cameraReady]);
    if (stopped) return;
    if (!context || !stream) throw new Error("Ta przeglądarka nie obsługuje skanowania.");
    const track = stream.getVideoTracks()[0]!;
    track.addEventListener("ended", () => fail("Aparat został odłączony. Spróbuj ponownie."), {
      once: true,
    });
    const capabilities = track.getCapabilities?.();
    if (capabilities?.focusMode?.includes("continuous")) {
      void track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
    }
    started = performance.now();
    callbacks.ready(track, engine);
    const accept = (codes: string[]) => {
      if (stopped) return;
      const now = performance.now();
      const code = codes.find(validBarcode);
      if (code) {
        stop();
        callbacks.result({
          code,
          engine,
          decodeMs: Math.round(now - decodeStarted),
          elapsedMs: Math.round(now - started),
        });
      } else {
        // One frame in flight. Never build a queue on slower phones.
        timer = setTimeout(() => void decode(), Math.max(0, 65 - (now - decodeStarted)));
      }
    };
    const decode = async () => {
      if (stopped) return;
      if (video.readyState < 2 || !video.videoWidth) {
        timer = setTimeout(() => void decode(), 100);
        return;
      }
      decodeStarted = performance.now();
      const region = scanRegion(video.videoWidth, video.videoHeight, ++frame % 4 === 0);
      canvas.width = region.width;
      canvas.height = region.height;
      context.drawImage(
        video,
        0,
        region.y,
        video.videoWidth,
        region.cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      try {
        if (detector) accept((await detector.detect(canvas)).map((result) => result.rawValue));
        else {
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          worker!.postMessage(image, [image.data.buffer]);
          timer = setTimeout(() => fail("Dekoder nie odpowiada. Uruchom aparat ponownie."), 10_000);
        }
      } catch {
        fail("Nie udało się odczytać obrazu. Uruchom aparat ponownie.");
      }
    };
    if (worker) {
      worker.addEventListener("error", () =>
        fail("Dekoder przestał działać. Uruchom aparat ponownie."),
      );
      worker.addEventListener("message", (event) => {
        clearTimeout(timer);
        if (event.data.error) fail(event.data.error);
        else accept(event.data.codes);
      });
    }
    void decode();
  })().catch((error) => {
    const name = error instanceof Error ? error.name : "";
    fail(
      name === "NotAllowedError"
        ? "Zezwól na dostęp do aparatu w ustawieniach przeglądarki lub wpisz kod ręcznie."
        : name === "NotFoundError"
          ? "Nie znaleziono aparatu. Wpisz kod ręcznie."
          : name === "NotReadableError"
            ? "Aparat jest zajęty. Zamknij inne aplikacje korzystające z aparatu."
            : error instanceof Error
              ? error.message
              : "Nie udało się uruchomić aparatu.",
    );
  });
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onHidden);
  };
}
