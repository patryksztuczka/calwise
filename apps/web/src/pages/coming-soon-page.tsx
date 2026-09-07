import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router";

const titles = new Map([
  ["/diary", "DIARY"],
  ["/trends", "TRENDS"],
  ["/log-food", "LOG FOOD"],
]);

/** Placeholder for designed screens that are not built yet, so navigation never dead-ends. */
export default function ComingSoonPage() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <h1 className="font-display text-30 font-bold text-white italic">
        {titles.get(pathname) ?? "NOT FOUND"}
      </h1>
      <p className="font-body text-11 text-muted">This screen is not built yet.</p>
      <Link
        to="/"
        className="mt-3 inline-flex items-center gap-1.5 font-body text-12 font-bold tracking-[1.2px] text-lime"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        BACK TO TODAY
      </Link>
    </div>
  );
}
