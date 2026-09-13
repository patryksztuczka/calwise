import type { ParsedNutritionLabel } from "./nutrition-label-parser";
import { frameDifference } from "./nutrition-scan-state";

export interface NutritionFrame<Image> {
  readonly image: Image;
  readonly signature: Uint8Array;
}

interface NutritionFrameLoopOptions<Image> {
  readonly signal: AbortSignal;
  readonly readFrame: () => NutritionFrame<Image> | undefined;
  readonly recognize: (image: Image) => Promise<ParsedNutritionLabel>;
  readonly onReading: (reading: ParsedNutritionLabel) => void;
  readonly onFrameState?: (state: "moving" | "reading") => void;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly intervalMs?: number;
  readonly stabilityThreshold?: number;
  readonly maxFrames?: number;
  readonly maxRecognitions?: number;
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** A bounded sequential loop. It gates OCR locally and cannot overlap recognition jobs. */
export async function runNutritionFrameLoop<Image>({
  signal,
  readFrame,
  recognize,
  onReading,
  onFrameState,
  sleep = (milliseconds) => wait(milliseconds, signal),
  intervalMs = 1_200,
  stabilityThreshold = 6,
  maxFrames = 60,
  maxRecognitions = 20,
}: NutritionFrameLoopOptions<Image>): Promise<void> {
  async function scan(
    frameCount: number,
    recognitionCount: number,
    previous: Uint8Array | undefined,
  ): Promise<void> {
    if (signal.aborted || frameCount >= maxFrames || recognitionCount >= maxRecognitions) return;
    if (frameCount > 0) await sleep(intervalMs);
    if (signal.aborted) return;
    const frame = readFrame();
    if (!frame) return scan(frameCount + 1, recognitionCount, previous);
    const stable =
      previous !== undefined && frameDifference(previous, frame.signature) <= stabilityThreshold;
    if (!stable) {
      onFrameState?.("moving");
      return scan(frameCount + 1, recognitionCount, frame.signature);
    }
    onFrameState?.("reading");
    try {
      const reading = await recognize(frame.image);
      if (!signal.aborted) onReading(reading);
    } catch {
      if (!signal.aborted) throw new Error("Nutrition recognition failed");
      return;
    }
    return scan(frameCount + 1, recognitionCount + 1, frame.signature);
  }

  await scan(0, 0, undefined);
}
