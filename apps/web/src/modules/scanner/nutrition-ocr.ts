import {
  parseNutritionLabel,
  type NutritionOcrLine,
  type NutritionOcrWord,
  type ParsedNutritionLabel,
} from "./nutrition-label-parser";
import { nutritionOcrRuntimePaths } from "./nutrition-ocr-network-policy";

declare global {
  interface Window {
    calwiseTestNutritionRecognize?: () => ParsedNutritionLabel | Promise<ParsedNutritionLabel>;
  }
}

export interface NutritionOcrProgress {
  readonly status: string;
  readonly progress: number;
}

export interface NutritionRecognizer {
  readonly recognize: (
    image: HTMLCanvasElement | File | Blob,
  ) => Promise<ReturnType<typeof parseNutritionLabel>>;
  readonly terminate: () => Promise<void>;
}

function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("OCR stopped", "AbortError");
}

/** Convert Tesseract word TSV into positioned lines used by the conservative parser. */
export function nutritionLinesFromTsv(tsv: string): readonly NutritionOcrLine[] {
  const lines = new Map<string, NutritionOcrWord[]>();
  for (const row of tsv.split(/\r?\n/).slice(1)) {
    const columns = row.split("\t");
    if (columns.length < 12 || columns[0] !== "5") continue;
    const [left, top, width, height, confidence] = columns.slice(6, 11).map(Number);
    const text = columns.slice(11).join("\t").trim();
    if (!text || ![left, top, width, height].every(Number.isFinite)) continue;
    const key = columns.slice(1, 5).join(":");
    const words = lines.get(key) ?? [];
    const word: NutritionOcrWord =
      confidence !== undefined && Number.isFinite(confidence)
        ? {
            text,
            left: left!,
            top: top!,
            right: left! + width!,
            bottom: top! + height!,
            confidence,
          }
        : { text, left: left!, top: top!, right: left! + width!, bottom: top! + height! };
    words.push(word);
    lines.set(key, words);
  }
  return [...lines.values()].map((words) => ({
    words: words.toSorted((left, right) => left.left - right.left),
  }));
}

/** Lazy-load one Tesseract worker and reuse it for every image in this scan session. */
export async function createNutritionRecognizer(
  signal: AbortSignal,
  onProgress: (progress: NutritionOcrProgress) => void,
): Promise<NutritionRecognizer> {
  signal.throwIfAborted();
  const testRecognize = window.calwiseTestNutritionRecognize;
  if (testRecognize) {
    onProgress({ status: "loaded test OCR", progress: 1 });
    return {
      async recognize() {
        signal.throwIfAborted();
        const result = await testRecognize();
        signal.throwIfAborted();
        return result;
      },
      async terminate() {},
    };
  }
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  signal.throwIfAborted();
  let terminated = false;
  const worker = await createWorker(["eng", "pol"], OEM.LSTM_ONLY, {
    workerPath: nutritionOcrRuntimePaths.worker,
    corePath: nutritionOcrRuntimePaths.core,
    langPath: nutritionOcrRuntimePaths.languages,
    gzip: false,
    logger: ({ status, progress }) => onProgress({ status, progress }),
  });

  const terminate = async () => {
    if (terminated) return;
    terminated = true;
    await worker.terminate();
  };
  signal.addEventListener("abort", () => void terminate(), { once: true });
  if (signal.aborted) {
    await terminate();
    throw abortReason(signal);
  }

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  return {
    async recognize(image) {
      if (signal.aborted || terminated) throw abortReason(signal);
      const result = await worker.recognize(image, {}, { text: true, tsv: true });
      if (signal.aborted || terminated) throw abortReason(signal);
      return parseNutritionLabel(nutritionLinesFromTsv(result.data.tsv ?? ""));
    },
    terminate,
  };
}
