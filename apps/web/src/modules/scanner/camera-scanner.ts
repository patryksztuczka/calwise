import { createBarcodeDecoder, type Decoder } from "./barcode-decoder";
import { guideCropRect } from "./guide-crop-rect";

export type ScannerFailureReason =
  | "permission-denied"
  | "camera-not-found"
  | "camera-busy"
  | "unsupported"
  | "startup-failed"
  | "scan-interrupted";

export type ScannerState =
  | { kind: "starting" }
  | {
      kind: "scanning";
      torch: { readonly available: boolean; readonly on: boolean; readonly busy: boolean };
    }
  | { kind: "paused" }
  | { kind: "error"; reason: ScannerFailureReason };

interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}
interface CameraConstraints extends MediaTrackConstraintSet {
  torch?: boolean;
}

function cameraError(error: Error): ScannerFailureReason {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "permission-denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "camera-not-found";
    case "NotReadableError":
      return "camera-busy";
    default:
      return "startup-failed";
  }
}

/** One session returns one unmodified code. Stopping also cancels pending camera/decoder work. */
export function startCameraScanner(
  video: HTMLVideoElement,
  guide: HTMLElement,
  onScan: (code: string) => void,
  onState: (state: ScannerState) => void,
) {
  const controller = new AbortController();
  const { signal } = controller;
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const torch = { available: false, on: false, busy: false };

  function stop() {
    controller.abort();
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
  }

  function end(state: ScannerState) {
    if (signal.aborted) return;
    stop();
    onState(state);
  }

  function publishScanning() {
    onState({ kind: "scanning", torch: { ...torch } });
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0];
    if (!track || !torch.available || torch.busy || signal.aborted) return;
    torch.busy = true;
    publishScanning();
    try {
      const constraints: CameraConstraints = { torch: !torch.on };
      await track.applyConstraints({ advanced: [constraints] });
      torch.on = !torch.on;
    } catch {
      torch.available = false;
    } finally {
      torch.busy = false;
      if (!signal.aborted) publishScanning();
    }
  }

  async function scan(readGuideFrame: () => ImageData | undefined, decoder: Decoder) {
    if (signal.aborted) return;
    const started = performance.now();
    try {
      const frame = readGuideFrame();
      if (frame) {
        const code = await decoder.detect(frame);
        if (signal.aborted) return;
        if (code) {
          stop();
          onScan(code);
          return;
        }
      }
      // At most ten scans per second, with only one decode in flight.
      timer = setTimeout(
        () => void scan(readGuideFrame, decoder),
        Math.max(0, 100 - (performance.now() - started)),
      );
    } catch {
      end({ kind: "error", reason: "scan-interrupted" });
    }
  }

  async function start() {
    onState({ kind: "starting" });
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      end({ kind: "error", reason: "unsupported" });
      return;
    }
    const pause = () => end({ kind: "paused" });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) pause();
      },
      { signal },
    );
    window.addEventListener("pagehide", pause, { signal });
    if (document.hidden) {
      pause();
      return;
    }
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
      });
      // getUserMedia cannot be aborted. Release a late permission grant after navigation.
      if (signal.aborted) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = acquired;
      const track = stream.getVideoTracks()[0];
      track?.addEventListener("ended", pause, { once: true, signal });
      const capabilities: CameraCapabilities = track?.getCapabilities?.() ?? {};
      torch.available = capabilities.torch === true;
      video.srcObject = stream;
      await video.play();
      signal.throwIfAborted();
      const decoder = await createBarcodeDecoder(signal);
      signal.throwIfAborted();
      const context = document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Camera frames are unavailable");
      const readGuideFrame = (): ImageData | undefined => {
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0) return;
        const crop = guideCropRect(
          {
            width: video.videoWidth,
            height: video.videoHeight,
            viewport: video.getBoundingClientRect(),
          },
          guide.getBoundingClientRect(),
        );
        const canvas = context.canvas;
        canvas.width = Math.max(1, Math.min(960, Math.round(crop.width)));
        canvas.height = Math.max(1, Math.round((crop.height * canvas.width) / crop.width));
        context.drawImage(
          video,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };

      publishScanning();
      void scan(readGuideFrame, decoder);
    } catch (error) {
      end({ kind: "error", reason: cameraError(error instanceof Error ? error : new Error()) });
    }
  }

  void start();
  return { stop, toggleTorch };
}
