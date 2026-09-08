import { useEffect, useState } from "react";
import { segmentArc } from "../lib/segment-arc";

const SEGMENTS = 40;
const CYCLE_MS = 2_400;
const REDUCED_MOTION_FILL = 24;
const paths = Array.from({ length: SEGMENTS }, (_, index) =>
  segmentArc(88, 69.5, 90 - index * 9, 3.3),
);

/** Indeterminate activity: fill clockwise, empty in reverse. Reduced motion keeps a static 60% arc. */
export function SegmentedActivity() {
  const [filled, setFilled] = useState(REDUCED_MOTION_FILL);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function start() {
      cancelAnimationFrame(frame);
      if (motion.matches) {
        setFilled(REDUCED_MOTION_FILL);
        return;
      }
      const startTime = performance.now();
      function tick(now: number) {
        const phase = ((now - startTime) % CYCLE_MS) / CYCLE_MS;
        const progress = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
        setFilled(Math.round(progress * SEGMENTS));
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    start();
    motion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", start);
    };
  }, []);

  return (
    <svg viewBox="0 0 176 176" className="size-44" aria-hidden="true">
      {paths.map((d, index) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={13}
          className={index < filled ? "stroke-lime" : "stroke-gauge-empty"}
        />
      ))}
    </svg>
  );
}
