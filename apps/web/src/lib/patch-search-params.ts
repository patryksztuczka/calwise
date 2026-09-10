import { useNavigate } from "react-router";

export function usePatchSearchParams() {
  const navigate = useNavigate();
  return (patch: Readonly<Record<string, string | null>>) => {
    // BrowserRouter 8.3.1 updates history before committing its React transition.
    // Both useLocation and setSearchParams(prev => ...) can still hold the old
    // params when the next input event fires. Repro: choose Snacks, then type a
    // search, losing meal=snacks. All in-place URL edits use this writer so they
    // preserve the latest history state. Covered by food-log.spec.ts.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    void navigate({ search: `?${next}` }, { replace: true });
  };
}
