import { Camera, FileImage, Flashlight, FlashlightOff, ScanText } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type ChangeEvent } from "react";
import { IconButton } from "../../components/icon-button";
import { PrimaryAction } from "../../components/primary-action";
import { guideCropRect } from "./guide-crop-rect";
import { runNutritionFrameLoop, type NutritionFrame } from "./nutrition-scan-loop";
import {
  createNutritionRecognizer,
  type NutritionOcrProgress,
  type NutritionRecognizer,
} from "./nutrition-ocr";
import {
  PERSONAL_PRODUCT_NUTRIENT_KEYS,
  type PersonalProductNutrientKey,
} from "@calwise/food-rules/personal-product";
import type { ParsedNutritionLabel } from "./nutrition-label-parser";
import { advanceReadingConfirmation, type ReadingConfirmation } from "./nutrition-scan-state";

interface NutritionLabelScannerProps {
  readonly onCapture: (capture: ParsedNutritionLabel) => void;
  readonly onManual: () => void;
}

type ScanState =
  | { readonly kind: "camera"; readonly message: string }
  | { readonly kind: "loading"; readonly progress: number; readonly message: string }
  | { readonly kind: "moving" | "reading" | "confirming"; readonly message: string }
  | {
      readonly kind: "captured";
      readonly capture: ParsedNutritionLabel;
      readonly evidence: "repeated-camera" | "single-image";
    }
  | { readonly kind: "paused" | "timed-out" | "error"; readonly message: string };

interface TorchState {
  readonly available: boolean;
  readonly on: boolean;
  readonly busy: boolean;
}

const nutrientLabels = {
  energyKcal100: "Calories",
  energyKj100: "Energy",
  protein100: "Protein",
  carbohydrates100: "Carbohydrates",
  fat100: "Fat",
  saturatedFat100: "Saturated fat",
  sugars100: "Sugars",
  fiber100: "Fibre",
  salt100: "Salt",
  sodium100: "Sodium",
} satisfies Record<PersonalProductNutrientKey, string>;

interface TorchCapabilities extends MediaTrackCapabilities {
  readonly torch?: boolean;
}

interface TorchConstraints extends MediaTrackConstraintSet {
  readonly torch?: boolean;
}

function cameraFailure(error: Error) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was denied. You can choose an image or enter the label manually.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No suitable camera was found. You can choose an image or enter the label manually.";
  }
  if (name === "NotReadableError") {
    return "The camera is busy. Close other apps using it, then retry or enter values manually.";
  }
  return "The label scanner could not start. Check your connection, retry, or enter values manually.";
}

function frameReader(video: HTMLVideoElement, guide: HTMLElement) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const signatureCanvas = document.createElement("canvas");
  signatureCanvas.width = 24;
  signatureCanvas.height = 24;
  const signatureContext = signatureCanvas.getContext("2d", { willReadFrequently: true });
  if (!context || !signatureContext) throw new Error("Camera frames are unavailable");

  return (): NutritionFrame<HTMLCanvasElement> | undefined => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0) return;
    const crop = guideCropRect(
      {
        width: video.videoWidth,
        height: video.videoHeight,
        viewport: video.getBoundingClientRect(),
      },
      guide.getBoundingClientRect(),
    );
    canvas.width = Math.max(1, Math.min(1_400, Math.max(900, Math.round(crop.width))));
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
    signatureContext.drawImage(canvas, 0, 0, 24, 24);
    const pixels = signatureContext.getImageData(0, 0, 24, 24).data;
    const signature = new Uint8Array(24 * 24);
    for (let index = 0; index < signature.length; index += 1) {
      const offset = index * 4;
      signature[index] = Math.round(
        pixels[offset]! * 0.299 + pixels[offset + 1]! * 0.587 + pixels[offset + 2]! * 0.114,
      );
    }
    return { image: canvas, signature };
  };
}

function startCameraNutritionScan(
  video: HTMLVideoElement,
  guide: HTMLElement,
  onState: (state: ScanState) => void,
  onTorch: (state: TorchState) => void,
  onCaptured: (capture: ParsedNutritionLabel) => void,
) {
  const controller = new AbortController();
  const { signal } = controller;
  let stream: MediaStream | undefined;
  let recognizer: NutritionRecognizer | undefined;
  let phase: "camera" | "ocr" = "camera";
  let confirmation: ReadingConfirmation = { fingerprint: null, matches: 0, captured: null };
  const torch = { available: false, on: false, busy: false };

  const stop = () => {
    if (signal.aborted) return;
    controller.abort();
    stream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
    void recognizer?.terminate();
  };

  const pause = () => {
    if (signal.aborted) return;
    stop();
    onState({ kind: "paused", message: "Camera scanning stopped while this page was hidden." });
  };

  const progress = ({ status, progress: amount }: NutritionOcrProgress) => {
    if (signal.aborted) return;
    onState({
      kind: "loading",
      progress: amount,
      message: `${status}. ${Math.round(amount * 100)}%`,
    });
  };

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0];
    if (!track || !torch.available || torch.busy || signal.aborted) return;
    torch.busy = true;
    onTorch({ ...torch });
    try {
      const constraints: TorchConstraints = { torch: !torch.on };
      await track.applyConstraints({ advanced: [constraints] });
      torch.on = !torch.on;
    } catch {
      torch.available = false;
    } finally {
      torch.busy = false;
      if (!signal.aborted) onTorch({ ...torch });
    }
  }

  async function start() {
    onState({ kind: "camera", message: "Starting camera. Allow access when prompted." });
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onState({
        kind: "error",
        message:
          "Camera scanning needs HTTPS and browser camera support. Choose an image or use manual entry.",
      });
      return;
    }
    document.addEventListener("visibilitychange", () => document.hidden && pause(), { signal });
    window.addEventListener("pagehide", pause, { signal });
    if (document.hidden) return pause();

    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 24 },
        },
      });
      if (signal.aborted) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = acquired;
      const track = stream.getVideoTracks()[0];
      track?.addEventListener("ended", pause, { once: true, signal });
      const capabilities: TorchCapabilities = track?.getCapabilities?.() ?? {};
      torch.available = capabilities.torch === true;
      onTorch({ ...torch });
      video.srcObject = stream;
      await video.play();
      signal.throwIfAborted();

      phase = "ocr";
      onState({ kind: "loading", progress: 0, message: "Loading OCR engine and language models." });
      recognizer = await createNutritionRecognizer(signal, progress);
      signal.throwIfAborted();
      onState({ kind: "moving", message: "Hold the nutrition table straight and fill the frame." });
      await runNutritionFrameLoop({
        signal,
        readFrame: frameReader(video, guide),
        recognize: recognizer.recognize,
        onFrameState: (state) => {
          if (signal.aborted) return;
          onState(
            state === "moving"
              ? { kind: "moving", message: "Hold still. Avoid glare and keep all columns visible." }
              : { kind: "reading", message: "Reading label on this device…" },
          );
        },
        onReading: (reading) => {
          confirmation = advanceReadingConfirmation(confirmation, reading);
          if (confirmation.captured) {
            const capture = confirmation.captured;
            stop();
            onCaptured(capture);
            return;
          }
          onState(
            reading.canPrefill
              ? { kind: "confirming", message: "Read once. Keep the same label still to confirm." }
              : {
                  kind: "moving",
                  message:
                    reading.issues.find((issue) => issue.kind !== "qualified-value")?.message ??
                    reading.issues[0]?.message ??
                    "No safe per-100 values yet. Reframe the table.",
                },
          );
        },
      });
      if (!signal.aborted) {
        stop();
        onState({
          kind: "timed-out",
          message:
            "No repeated safe reading was found. Retry, choose a clearer image, or enter values manually.",
        });
      }
    } catch (error) {
      if (signal.aborted) return;
      stop();
      onState({
        kind: "error",
        message:
          phase === "camera"
            ? cameraFailure(error instanceof Error ? error : new Error("Camera failed"))
            : "OCR could not load or read this label. Check your connection, retry, or enter values manually.",
      });
    }
  }

  void start();
  return { stop, toggleTorch };
}

export function NutritionLabelScanner({ onCapture, onManual }: NutritionLabelScannerProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ScannerAttempt
      key={attempt}
      onCapture={onCapture}
      onManual={onManual}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function ScannerAttempt({
  onCapture,
  onManual,
  onRetry,
}: NutritionLabelScannerProps & { readonly onRetry: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<ReturnType<typeof startCameraNutritionScan> | null>(null);
  const fileControllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ScanState>({
    kind: "camera",
    message: "Starting camera. Allow access when prompted.",
  });
  const [torch, setTorch] = useState<TorchState>({ available: false, on: false, busy: false });
  const handleCaptured = useEffectEvent((capture: ParsedNutritionLabel) => {
    setState({ kind: "captured", capture, evidence: "repeated-camera" });
  });

  useEffect(() => {
    if (!videoRef.current || !guideRef.current) return;
    const scanner = startCameraNutritionScan(
      videoRef.current,
      guideRef.current,
      setState,
      setTorch,
      handleCaptured,
    );
    cameraRef.current = scanner;
    return () => {
      scanner.stop();
      fileControllerRef.current?.abort();
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pauseFile = () => {
      const active = fileControllerRef.current;
      if (!active || active.signal.aborted) return;
      active.abort();
      setState({ kind: "paused", message: "Image OCR stopped while this page was hidden." });
    };
    const pauseHiddenFile = () => {
      if (document.hidden) pauseFile();
    };
    document.addEventListener("visibilitychange", pauseHiddenFile);
    window.addEventListener("pagehide", pauseFile);
    return () => {
      document.removeEventListener("visibilitychange", pauseHiddenFile);
      window.removeEventListener("pagehide", pauseFile);
    };
  }, []);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    cameraRef.current?.stop();
    fileControllerRef.current?.abort();
    const controller = new AbortController();
    fileControllerRef.current = controller;
    const { signal } = controller;
    setState({ kind: "loading", progress: 0, message: "Loading OCR engine and language models." });
    let recognizer: NutritionRecognizer | undefined;
    try {
      const activeRecognizer = await createNutritionRecognizer(signal, ({ status, progress }) => {
        if (!signal.aborted) {
          setState({
            kind: "loading",
            progress,
            message: `${status}. ${Math.round(progress * 100)}%`,
          });
        }
      });
      recognizer = activeRecognizer;
      setState({ kind: "reading", message: "Reading the selected image on this device…" });
      const reading = await activeRecognizer.recognize(file);
      if (signal.aborted) return;
      if (fileControllerRef.current === controller) fileControllerRef.current = null;
      if (reading.canPrefill) {
        setState({ kind: "captured", capture: reading, evidence: "single-image" });
      } else {
        setState({
          kind: "error",
          message:
            reading.issues[0]?.message ??
            "The image did not produce an unambiguous per-100 reading. Try another image or enter values manually.",
        });
      }
    } catch {
      if (!signal.aborted) {
        setState({
          kind: "error",
          message: "OCR could not read that image. Try a sharper image or enter values manually.",
        });
      }
    } finally {
      await recognizer?.terminate();
      if (fileControllerRef.current === controller) fileControllerRef.current = null;
    }
  }

  const captured = state.kind === "captured" ? state.capture : null;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="rounded-10 border border-line bg-surface p-3 text-11 leading-relaxed text-muted">
        <p>
          The first scan downloads the OCR engine and English and Polish language models. Your
          browser may cache them.
        </p>
        <p className="mt-2 text-white">
          Photos and camera frames stay on this device. Calwise never uploads them. The model host
          sees the download request, not your label.
        </p>
      </div>

      {!captured && (
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-18 border border-line bg-surface">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Live nutrition label camera"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-bg/75 px-4 py-3 text-muted">
            <Camera size={16} aria-hidden="true" />
            <span className="text-9 font-semibold tracking-[1px]">AUTOMATIC LOCAL OCR</span>
          </div>
          <div
            ref={guideRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[6%] top-[14%] h-[62%] border-2 border-lime/80"
          />
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-center gap-2 rounded-10 bg-bg/90 p-3">
            <ScanText size={20} className="text-lime" aria-hidden="true" />
            <p
              role={state.kind === "error" ? "alert" : "status"}
              className="text-center text-11 leading-relaxed"
            >
              {state.kind === "captured" ? "Reading confirmed." : state.message}
            </p>
            {state.kind === "loading" && (
              <progress
                aria-label="OCR model loading"
                value={state.progress}
                max={1}
                className="h-1 w-full"
              />
            )}
            {(state.kind === "error" || state.kind === "paused" || state.kind === "timed-out") && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 text-11 font-semibold text-lime"
              >
                TRY CAMERA AGAIN
              </button>
            )}
          </div>
          {torch.available && (
            <IconButton
              aria-label="Toggle torch"
              aria-pressed={torch.on}
              disabled={torch.busy}
              onClick={() => void cameraRef.current?.toggleTorch()}
              className="absolute top-12 right-3 bg-bg/90"
            >
              {torch.on ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
            </IconButton>
          )}
        </div>
      )}

      {captured && (
        <section className="flex flex-col gap-3 rounded-10 border border-success-border bg-success-soft p-4">
          <h2 className="font-display text-22 font-bold italic">
            {state.kind === "captured" && state.evidence === "single-image"
              ? "IMAGE READ. REVIEW REQUIRED"
              : "READING CONFIRMED"}
          </h2>
          <p className="text-12 text-muted">
            {state.kind === "captured" && state.evidence === "single-image"
              ? "One deterministic image read is not independent confirmation. Check every value."
              : "The same safe camera reading was seen twice."}
          </p>
          <p className="text-12 text-muted">Captured basis: per 100 {captured.basis}</p>
          <dl className="grid grid-cols-2 gap-2 text-12">
            {PERSONAL_PRODUCT_NUTRIENT_KEYS.flatMap((field) => {
              const value = captured.values[field];
              return value === undefined
                ? []
                : [
                    <div key={field} className="rounded-8 bg-bg/60 p-2">
                      <dt className="text-10 text-muted">{nutrientLabels[field]}</dt>
                      <dd>
                        {value}{" "}
                        {field === "energyKcal100" ? "kcal" : field === "energyKj100" ? "kJ" : "g"}
                      </dd>
                    </div>,
                  ];
            })}
          </dl>
          {captured.issues.map((issue) => (
            <p
              key={`${issue.kind}-${issue.field ?? "label"}`}
              role="status"
              className="text-11 text-muted"
            >
              {issue.message}
            </p>
          ))}
          <PrimaryAction onClick={() => onCapture(captured)}>REVIEW &amp; EDIT</PrimaryAction>
        </section>
      )}

      {!captured && (
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-10 border border-line bg-surface px-3 text-12 font-semibold">
          <FileImage size={18} className="text-lime" aria-hidden="true" />
          CHOOSE LABEL IMAGE
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void readFile(event)}
          />
        </label>
      )}
      <button type="button" onClick={onManual} className="min-h-11 text-12 text-lime">
        Enter label manually
      </button>
      <p className="text-10 leading-relaxed text-muted">
        Prototype limits: straight, readable Polish or English tables work best. Prepared values,
        unclear columns, serving-only labels and qualified values stay blank for review.
      </p>
    </div>
  );
}
