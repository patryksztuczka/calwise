import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@calwise/food-rules";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { nutritionFormat as number } from "../../lib/number-format";
import { AddFoodForm } from "../food-log/logging-session";
import type { Product } from "./food-types";
import { FoodAttribution, ProductIdentity, ProductNutrition } from "./product-details";
import type { ProductSearchState } from "./product-search-state";

interface ProductSearchResultsProps {
  readonly state: ProductSearchState;
  readonly onRetry: () => void;
  readonly logging?: boolean;
}

export function ProductSearchResults({
  state,
  onRetry,
  logging = false,
}: ProductSearchResultsProps) {
  switch (state.status) {
    case "idle":
      return (
        <ResultsSection>
          <SearchMessage>Find a food by name or brand, or scan its barcode.</SearchMessage>
        </ResultsSection>
      );
    case "invalid":
      return (
        <ResultsSection>
          <SearchMessage>
            Enter {SEARCH_MIN_LENGTH} to {SEARCH_MAX_LENGTH} characters with a letter or number.
          </SearchMessage>
        </ResultsSection>
      );
    case "loading":
      return (
        <ResultsSection>
          <ProductSkeletons />
        </ResultsSection>
      );
    case "failed":
      return (
        <ResultsSection>
          <div role="alert" className="flex flex-col items-start gap-3 py-5 text-13">
            <p className="text-danger">
              Could not search products. Check your connection and try again.
            </p>
            <button type="button" onClick={onRetry} className="min-h-11 text-lime">
              Try again
            </button>
          </div>
        </ResultsSection>
      );
    case "empty":
      return (
        <ResultsSection count="0 foods">
          <SearchMessage>
            No products found. Try another name or brand, or scan a barcode.
          </SearchMessage>
          <FoodAttribution attribution={state.attribution} />
        </ResultsSection>
      );
    case "results": {
      const count = state.data.products.length;
      return (
        <ResultsSection count={`${count} ${count === 1 ? "food" : "foods"}`}>
          <ul className="flex flex-col gap-1">
            {state.data.products.map((product) => (
              <ProductResult key={product.barcode} product={product} logging={logging} />
            ))}
          </ul>
          {state.capped && (
            <p className="text-11 text-muted">
              More matches may be available. Refine your search to find more specific products.
            </p>
          )}
          <FoodAttribution attribution={state.data.attribution} />
        </ResultsSection>
      );
    }
  }
}

interface ResultsSectionProps {
  readonly count?: string;
  readonly children: ReactNode;
}

function ResultsSection({ count, children }: ResultsSectionProps) {
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="results-heading" className="text-11 font-bold tracking-[1px]">
          RESULTS
        </h2>
        <span role="status" className="text-11 text-muted">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function SearchMessage({ children }: { readonly children: ReactNode }) {
  return <p className="py-10 text-center text-13 leading-relaxed text-muted">{children}</p>;
}

function ProductResult({
  product,
  logging,
}: {
  readonly product: Product;
  readonly logging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <li className={expanded ? "rounded-12 border border-line bg-surface" : "border-b border-line"}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded(!expanded)}
        className={`flex min-h-[84px] w-full items-center gap-3.5 py-3 text-left ${expanded ? "px-3" : ""}`}
      >
        <ProductIdentity product={product}>
          {!expanded && (
            <span className="text-11 text-muted">
              {number.format(product.energyKcal100g)} kcal · 100 g / ml
            </span>
          )}
        </ProductIdentity>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-22 border border-line">
          {expanded ? (
            <ChevronUp size={21} className="text-muted" aria-hidden="true" />
          ) : logging ? (
            <Plus size={21} className="text-lime" aria-hidden="true" />
          ) : (
            <ChevronDown size={21} className="text-lime" aria-hidden="true" />
          )}
        </span>
      </button>
      <div id={detailsId} hidden={!expanded} className="px-4 pb-4">
        {logging ? (
          expanded && <AddFoodForm product={product} onAdded={() => setExpanded(false)} />
        ) : (
          <ProductNutrition product={product} />
        )}
      </div>
    </li>
  );
}

function ProductSkeletons() {
  return (
    <div role="status" aria-label="Searching products">
      <span className="sr-only">Searching products...</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex h-[84px] items-center gap-3.5 border-b border-line">
            <span className="size-[42px] shrink-0 rounded-8 bg-skeleton" />
            <div className="flex flex-1 flex-col gap-2.5">
              <span className="h-3.5 w-3/4 rounded-8 bg-skeleton" />
              <span className="h-2.5 w-3/5 rounded-8 bg-skeleton" />
              <span className="h-2 w-1/3 rounded-8 bg-skeleton" />
            </div>
            <span className="size-11 rounded-22 bg-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
