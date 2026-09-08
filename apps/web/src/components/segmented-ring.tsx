import { segmentArc } from "../lib/segment-arc";

export const RING_SEGMENTS = 40;
const SIZE = 142;
const SEGMENT_SWEEP = 4.7;
const SEGMENT_STEP = 7;
const FIRST_SEGMENT_ANGLE = 230;
const OUTER_RADIUS = 68;
const INNER_RATIO = 0.87;

const center = SIZE / 2;
const thickness = OUTER_RADIUS * (1 - INNER_RATIO);
const radius = OUTER_RADIUS - thickness / 2;
const paths = Array.from({ length: RING_SEGMENTS }, (_, index) =>
  segmentArc(center, radius, FIRST_SEGMENT_ANGLE - index * SEGMENT_STEP, SEGMENT_SWEEP),
);

interface SegmentedRingProps {
  readonly filled: number;
  readonly activeClass: string;
}

/** Clockwise segments from bottom left to bottom right. The caller supplies size and semantics. */
export function SegmentedRing({ filled, activeClass }: SegmentedRingProps) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
      {paths.map((d, index) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={thickness}
          className={index < filled ? activeClass : "stroke-gauge-empty"}
        />
      ))}
    </svg>
  );
}
