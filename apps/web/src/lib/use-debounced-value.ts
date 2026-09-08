import { useEffect, useState } from "react";

/** Keeps the pending input separate from the value used by a request. Flush on submit. */
export function useDebouncedValue<T>(input: T, delayMs: number) {
  const [value, setValue] = useState(() => input);
  useEffect(() => {
    const timer = setTimeout(() => setValue(() => input), delayMs);
    return () => clearTimeout(timer);
  }, [input, delayMs]);

  return { value, settled: Object.is(value, input), flush: () => setValue(() => input) };
}
