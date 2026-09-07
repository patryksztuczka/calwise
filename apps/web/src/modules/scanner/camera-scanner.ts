import { createBarcodeDecoder } from "./barcode-decoder";

export type ScannerState =
  | { kind: "starting" }
  | { kind: "scanning"; torchAvailable: boolean; torchOn: boolean; torchBusy: boolean }
  | { kind: "paused" }
  | { kind: "error"; message: string };

interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}
interface CameraConstraints extends MediaTrackConstraintSet {
  torch?: boolean;
}

function cameraError(error: Error) {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is busy. Close other apps using it, then try again.";
    default:
      return "The scanner could not start. Check your camera and connection, then try again.";
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
  let torchOn = false;
  let torchBusy = false;
  let torchAvailable = false;

  function stop() {
    controller.abort();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", pauseWhenHidden);
    window.removeEventListener("pagehide", pause);
    stream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
  }

  function pause() {
    if (signal.aborted) return;
    stop();
    onState({ kind: "paused" });
  }

  function pauseWhenHidden() {
    if (document.hidden) pause();
  }

  function publishScanning() {
    onState({ kind: "scanning", torchAvailable, torchOn, torchBusy });
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0];
    if (!track || !torchAvailable || torchBusy || signal.aborted) return;
    torchBusy = true;
    publishScanning();
    try {
      const constraints: CameraConstraints = { torch: !torchOn };
      await track.applyConstraints({ advanced: [constraints] });
      torchOn = !torchOn;
    } catch {
      torchAvailable = false;
    } finally {
      torchBusy = false;
      if (!signal.aborted) publishScanning();
    }
  }

  async function start() {
    onState({ kind: "starting" });
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onState({
        kind: "error",
        message: "Camera scanning needs HTTPS and a browser with camera support.",
      });
      stop();
      return;
    }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pagehide", pause);
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
      track?.addEventListener("ended", pause, { once: true });
      const capabilities: CameraCapabilities = track?.getCapabilities?.() ?? {};
      torchAvailable = capabilities.torch === true;
      video.srcObject = stream;
      await video.play();
      signal.throwIfAborted();
      const decoder = await createBarcodeDecoder(signal);
      signal.throwIfAborted();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Camera frames are unavailable");
      publishScanning();

      async function scan() {
        if (signal.aborted) return;
        const started = performance.now();
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            // Map the visible alignment guide through object-cover into camera pixels.
            const view = video.getBoundingClientRect();
            const frame = guide.getBoundingClientRect();
            const scale = Math.max(view.width / video.videoWidth, view.height / video.videoHeight);
            const width = frame.width / scale;
            const height = frame.height / scale;
            const x =
              (video.videoWidth - view.width / scale) / 2 + (frame.left - view.left) / scale;
            const y =
              (video.videoHeight - view.height / scale) / 2 + (frame.top - view.top) / scale;
            canvas.width = Math.max(1, Math.min(960, Math.round(width)));
            canvas.height = Math.max(1, Math.round((height * canvas.width) / width));
            context!.drawImage(video, x, y, width, height, 0, 0, canvas.width, canvas.height);
            const code = await decoder.detect(canvas);
            if (signal.aborted) return;
            if (code) {
              stop();
              onScan(code);
              return;
            }
          }
          // At most ten scans per second, with only one decode in flight.
          timer = setTimeout(() => void scan(), Math.max(0, 100 - (performance.now() - started)));
        } catch {
          if (signal.aborted) return;
          stop();
          onState({
            kind: "error",
            message: "Scanning was interrupted. Try starting the camera again.",
          });
        }
      }
      void scan();
    } catch (error) {
      if (signal.aborted) return;
      stop();
      onState({
        kind: "error",
        message: cameraError(error instanceof Error ? error : new Error()),
      });
    }
  }

  void start();
  return { stop, toggleTorch };
}
