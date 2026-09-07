import { useQuery } from "@tanstack/react-query";
import { CircleCheck, ScanBarcode, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { IconButton } from "../../components/icon-button";
import { useTRPC } from "../../lib/trpc";
import { FoodAttribution, ProductIdentity, ProductNutrition } from "./product-details";

interface BarcodeLookupProps {
  readonly code: string;
  readonly searchUrl: string;
  readonly onDismiss: () => void;
}

export function BarcodeLookup({ code, searchUrl, onDismiss }: BarcodeLookupProps) {
  const trpc = useTRPC();
  const valid = /^\d{4,24}$/.test(code);
  const lookup = useQuery({
    ...trpc.food.barcode.queryOptions({ barcode: code }),
    enabled: valid,
    retry: false,
    staleTime: 60_000,
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const missing = lookup.error?.data?.code === "NOT_FOUND";
  const loading = valid && lookup.isPending;
  let title = "LOOKING UP FOOD";
  if (!valid) title = "INVALID BARCODE";
  else if (lookup.data) title = "PRODUCT FOUND";
  else if (missing) title = "PRODUCT NOT FOUND";
  else if (lookup.isError) title = "LOOKUP FAILED";

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
        {lookup.data ? (
          <CircleCheck size={22} className="shrink-0 text-lime" aria-hidden="true" />
        ) : (
          <ScanBarcode size={22} className="shrink-0 text-muted" aria-hidden="true" />
        )}
        <h2 id={titleId} className="flex-1 font-display text-30 font-bold italic">
          {title}
        </h2>
        <IconButton aria-label="Close and scan again" onClick={onDismiss}>
          <X size={21} aria-hidden="true" />
        </IconButton>
      </header>
      <div className="mt-3 flex flex-col gap-4">
        {loading && (
          <div role="status" className="flex flex-col items-center gap-4">
            <p className="self-start text-12 text-muted">
              Fetching the product details for this barcode.
            </p>
            <svg viewBox="0 0 176 176" className="size-44" aria-hidden="true">
              {Array.from({ length: 40 }, (_, index) => (
                <path
                  key={index}
                  d="M 88 12 L 88 25"
                  transform={`rotate(${index * 9} 88 88)`}
                  strokeWidth="4"
                  className="stroke-gauge-empty"
                />
              ))}
              <circle
                cx="88"
                cy="88"
                r="69.5"
                pathLength="100"
                fill="none"
                strokeWidth="13"
                strokeDasharray="60 40"
                transform="rotate(-90 88 88)"
                className="barcode-activity stroke-lime"
              />
              {Array.from({ length: 40 }, (_, index) => (
                <path
                  key={index}
                  d="M 88 11 L 88 26"
                  transform={`rotate(${index * 9 + 4.5} 88 88)`}
                  strokeWidth="7"
                  className="stroke-bg"
                />
              ))}
            </svg>
          </div>
        )}
        {!valid && (
          <p role="alert" className="text-13 text-muted">
            This code is not a supported product barcode. Try scanning the packaging again.
          </p>
        )}
        {valid && lookup.isError && !lookup.data && (
          <div role="alert" className="flex flex-col gap-3 text-13">
            <p className="text-muted">
              {missing
                ? "This barcode is not in the food catalog. Try searching by name or brand."
                : "Could not look up this barcode. Check your connection and try again."}
            </p>
            {!missing && (
              <button
                type="button"
                onClick={() => void lookup.refetch()}
                disabled={lookup.isFetching}
                className="min-h-11 text-lime disabled:opacity-50"
              >
                Try again
              </button>
            )}
            <Link to={searchUrl} className="flex min-h-11 items-center text-lime">
              Search by name
            </Link>
          </div>
        )}
        {lookup.data && (
          <>
            <p role="status" className="text-12 text-muted">
              Product details. Nothing is added to your meals.
            </p>
            <div className="rounded-12 border border-line bg-surface p-4">
              <div className="mb-5 flex items-center gap-3.5">
                <ProductIdentity product={lookup.data.product} />
              </div>
              <ProductNutrition product={lookup.data.product} />
            </div>
            <FoodAttribution attribution={lookup.data.attribution} />
          </>
        )}
        {!lookup.data && (
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
