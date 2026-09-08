import { useEffect, useState } from "react";
import { RING_SEGMENTS, SegmentedRing } from "./segmented-ring";

const CYCLE_MS = 2_400;
const REDUCED_MOTION_FILL = Math.round(RING_SEGMENTS * 0.6);

/** Indeterminate activity: fill clockwise, empty in reverse. Reduced motion keeps a static 60% arc. */
export function SegmentedActivity() {
  const filled = useActivityFill();
  return (
    <div className="size-44">
      <SegmentedRing filled={filled} activeClass="stroke-lime" />
    </div>
  );
}

function useActivityFill() {
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
        setFilled(Math.round(progress * RING_SEGMENTS));
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

  return filled;
}
