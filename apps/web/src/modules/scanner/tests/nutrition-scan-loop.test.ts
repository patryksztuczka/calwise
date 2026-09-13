import { describe, expect, it } from "vite-plus/test";
import { runNutritionFrameLoop } from "../nutrition-scan-loop";

const reading = { basis: "g" as const, values: { protein100: "7" }, issues: [], canPrefill: true };

describe("runNutritionFrameLoop", () => {
  it("OCRs only stable frames and keeps one recognition in flight", async () => {
    const signatures = [
      new Uint8Array([0, 0]),
      new Uint8Array([40, 40]),
      new Uint8Array([41, 40]),
      new Uint8Array([42, 40]),
    ];
    let active = 0;
    let mostActive = 0;
    let recognitions = 0;
    const received: unknown[] = [];

    await runNutritionFrameLoop({
      signal: new AbortController().signal,
      maxFrames: 4,
      maxRecognitions: 4,
      stabilityThreshold: 2,
      sleep: async () => {},
      readFrame: () => {
        const signature = signatures.shift();
        return signature ? { image: signature, signature } : undefined;
      },
      recognize: async () => {
        active += 1;
        mostActive = Math.max(mostActive, active);
        recognitions += 1;
        await Promise.resolve();
        active -= 1;
        return reading;
      },
      onReading: (value) => received.push(value),
    });

    expect(recognitions).toBe(2);
    expect(mostActive).toBe(1);
    expect(received).toEqual([reading, reading]);
  });

  it("ignores a recognition response that arrives after cancellation", async () => {
    const controller = new AbortController();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const received: unknown[] = [];
    let frame = 0;
    const loop = runNutritionFrameLoop({
      signal: controller.signal,
      maxFrames: 3,
      sleep: async () => {},
      readFrame: () => ({ image: frame++, signature: new Uint8Array([1, 1]) }),
      recognize: async () => {
        await pending;
        return reading;
      },
      onReading: (value) => received.push(value),
    });

    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    release();
    await loop;
    expect(received).toEqual([]);
  });
});
