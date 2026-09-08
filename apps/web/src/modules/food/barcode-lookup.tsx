import { CircleCheck, ScanBarcode, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { IconButton } from "../../components/icon-button";
import { SegmentedActivity } from "../../components/segmented-activity";
import { FoodAttribution, ProductIdentity, ProductNutrition } from "./product-details";
import { useBarcodeLookup, type LookupState } from "./use-barcode-lookup";

const headings = {
  invalid: { title: "INVALID BARCODE", Icon: ScanBarcode, color: "text-muted" },
  loading: { title: "LOOKING UP FOOD", Icon: ScanBarcode, color: "text-muted" },
  found: { title: "PRODUCT FOUND", Icon: CircleCheck, color: "text-lime" },
  missing: { title: "PRODUCT NOT FOUND", Icon: ScanBarcode, color: "text-muted" },
  failed: { title: "LOOKUP FAILED", Icon: ScanBarcode, color: "text-muted" },
} satisfies Record<
  LookupState["status"],
  { title: string; Icon: typeof ScanBarcode; color: string }
>;

interface BarcodeLookupProps {
  readonly code: string;
  readonly searchUrl: string;
  readonly onDismiss: () => void;
}

export function BarcodeLookup({ code, searchUrl, onDismiss }: BarcodeLookupProps) {
  const state = useBarcodeLookup(code);
  const { title, Icon, color } = headings[state.status];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      className="fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-20 border border-line bg-bg p-5 pb-[max(24px,env(safe-area-inset-bottom))] text-white backdrop:bg-bg/80 sm:bottom-6 sm:rounded-b-36"
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-2 bg-line" aria-hidden="true" />
      <header className="flex items-center gap-3">
        <Icon size={22} className={`shrink-0 ${color}`} aria-hidden="true" />
        <h2 id={titleId} className="flex-1 font-display text-30 font-bold italic">
          {title}
        </h2>
        <IconButton aria-label="Close and scan again" onClick={onDismiss}>
          <X size={21} aria-hidden="true" />
        </IconButton>
      </header>
      <div className="mt-3 flex flex-col gap-4">
        <LookupContent state={state} searchUrl={searchUrl} />
        {state.status !== "found" && (
          <p className="text-11 break-all text-muted">
            Barcode:{" "}
            <output aria-label="Scanned barcode" className="font-mono select-all">
              {code}
            </output>
          </p>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-11 items-center justify-center gap-2.5 text-12 font-semibold text-lime"
        >
          <ScanBarcode size={20} aria-hidden="true" /> Scan again
        </button>
      </div>
    </dialog>
  );
}

interface LookupContentProps {
  readonly state: LookupState;
  readonly searchUrl: string;
}

function LookupContent({ state, searchUrl }: LookupContentProps) {
  switch (state.status) {
    case "invalid":
      return (
        <p role="alert" className="text-13 text-muted">
          This code is not a supported product barcode. Try scanning the packaging again.
        </p>
      );
    case "loading":
      return (
        <div role="status" className="flex flex-col items-center gap-4">
          <p className="self-start text-12 text-muted">
            Fetching the product details for this barcode.
          </p>
          <SegmentedActivity />
        </div>
      );
    case "missing":
      return (
        <div role="alert" className="flex flex-col gap-3 text-13">
          <p className="text-muted">
            This barcode is not in the food catalog. Try searching by name or brand.
          </p>
          <Link to={searchUrl} className="flex min-h-11 items-center text-lime">
            Search by name
          </Link>
        </div>
      );
    case "failed":
      return (
        <div role="alert" className="flex flex-col gap-3 text-13">
          <p className="text-muted">
            Could not look up this barcode. Check your connection and try again.
          </p>
          <button type="button" onClick={state.retry} className="min-h-11 text-lime">
            Try again
          </button>
          <Link to={searchUrl} className="flex min-h-11 items-center text-lime">
            Search by name
          </Link>
        </div>
      );
    case "found":
      return (
        <>
          <p role="status" className="text-12 text-muted">
            Product details. Nothing is added to your meals.
          </p>
          <div className="flex flex-col gap-5 rounded-12 border border-line bg-surface p-4">
            <ProductIdentity product={state.data.product} />
            <ProductNutrition product={state.data.product} />
          </div>
          <FoodAttribution attribution={state.data.attribution} />
        </>
      );
  }
}
