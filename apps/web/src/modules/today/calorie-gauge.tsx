import type { ReactNode } from "react";
import { RING_SEGMENTS, SegmentedRing } from "../../components/segmented-ring";

interface CalorieGaugeProps {
  /** Share of the goal eaten, 0 to 1. */
  readonly progress: number;
  /** Lime while within the goal, amber once the goal is exceeded. */
  readonly tone: "lime" | "over";
  readonly label: string;
  readonly children: ReactNode;
}

/** Segmented ring around the remaining calories ("Component / Daily energy counter" gauge). */
export function CalorieGauge({ progress, tone, label, children }: CalorieGaugeProps) {
  const filled = Math.round(Math.min(Math.max(progress, 0), 1) * RING_SEGMENTS);
  const activeClass = tone === "over" ? "stroke-over" : "stroke-lime";
  return (
    <div role="img" aria-label={label} className="relative size-[142px] shrink-0">
      <SegmentedRing filled={filled} activeClass={activeClass} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
