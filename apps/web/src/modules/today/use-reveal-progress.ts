import { useEffect, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * One-shot reveal clock shared by the eaten count, the remaining count and the gauge:
 * 900 ms cubic ease-out, played once when the data is ready. Reduced motion jumps to the end.
 * Returns eased progress from 0 to 1.
 */
export function useRevealProgress(durationMs = 900): number {
  const [progress, setProgress] = useState(() =>
    window.matchMedia(REDUCED_MOTION).matches ? 1 : 0,
  );

  useEffect(() => {
    if (progress === 1) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min((now - start) / durationMs, 1);
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // The reveal plays once per mount; progress is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  return progress;
}
