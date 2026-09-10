import { CircleCheck, ScanBarcode } from "lucide-react";
import { Link } from "react-router";
import { BottomSheet } from "../../components/bottom-sheet";
import { SegmentedActivity } from "../../components/segmented-activity";
import { FoodAttribution, ProductIdentity } from "./product-details";
import type { LookupState } from "./barcode-lookup-state";
import type { RenderProduct } from "./food-types";
import { useBarcodeLookup } from "./use-barcode-lookup";

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
  readonly renderProduct: RenderProduct;
}

export function BarcodeLookup({ code, searchUrl, onDismiss, renderProduct }: BarcodeLookupProps) {
  const { state, retry } = useBarcodeLookup(code);
  const { title, Icon, color } = headings[state.status];
  return (
    <BottomSheet
      title={
        <>
          <Icon size={22} className={`shrink-0 ${color}`} aria-hidden="true" />
          {title}
        </>
      }
      onClose={onDismiss}
      closeLabel="Close and scan again"
    >
      <div className="mt-3 flex flex-col gap-4">
        <LookupContent
          state={state}
          searchUrl={searchUrl}
          onRetry={retry}
          renderProduct={renderProduct}
          onAdded={onDismiss}
        />
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
    </BottomSheet>
  );
}

interface LookupContentProps {
  readonly state: LookupState;
  readonly searchUrl: string;
  readonly onRetry: () => void;
  readonly renderProduct: BarcodeLookupProps["renderProduct"];
  readonly onAdded: () => void;
}

function LookupContent({ state, searchUrl, onRetry, renderProduct, onAdded }: LookupContentProps) {
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
          <button type="button" onClick={onRetry} className="min-h-11 text-lime">
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
            Check your portion before adding. Nothing added yet.
          </p>
          <div className="flex flex-col gap-5 rounded-12 border border-line bg-surface p-4">
            <ProductIdentity product={state.data.product} />
            {renderProduct(state.data.product, onAdded)}
          </div>
          <FoodAttribution attribution={state.data.attribution} />
        </>
      );
  }
}
