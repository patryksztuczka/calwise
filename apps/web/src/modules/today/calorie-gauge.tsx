import type { ReactNode } from "react";

const SIZE = 142;
const SEGMENTS = 40;
const SEGMENT_SWEEP = 4.7;
const SEGMENT_STEP = 7;
const FIRST_SEGMENT_ANGLE = 230;
const OUTER_RADIUS = 68;
const INNER_RATIO = 0.87;

const center = SIZE / 2;
const thickness = OUTER_RADIUS * (1 - INNER_RATIO);
const radius = OUTER_RADIUS - thickness / 2;

function point(angleDegrees: number): string {
  const angle = (angleDegrees * Math.PI) / 180;
  return `${(center + radius * Math.cos(angle)).toFixed(2)} ${(center - radius * Math.sin(angle)).toFixed(2)}`;
}

/** Arc paths for the 40 segments, ordered clockwise from the bottom left to the bottom right, leaving a gap at the bottom. */
const segmentPaths = Array.from({ length: SEGMENTS }, (_, index) => {
  const from = FIRST_SEGMENT_ANGLE - index * SEGMENT_STEP;
  const to = from - SEGMENT_SWEEP;
  return `M ${point(from)} A ${radius} ${radius} 0 0 1 ${point(to)}`;
});

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
  const filled = Math.round(Math.min(Math.max(progress, 0), 1) * SEGMENTS);
  const activeClass = tone === "over" ? "stroke-over" : "stroke-lime";
  return (
    <div role="img" aria-label={label} className="relative size-[142px] shrink-0">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        {segmentPaths.map((d, index) => (
          <path
            key={d}
            d={d}
            fill="none"
            strokeWidth={thickness}
            className={index < filled ? activeClass : "stroke-gauge-empty"}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
