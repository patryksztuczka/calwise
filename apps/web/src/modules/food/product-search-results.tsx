import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@calwise/api/food-input-rules";
import type { ReactNode } from "react";
import { FoodAttribution, ProductResult, ProductSkeletons } from "./product-details";
import { LIMIT, type ProductSearchState } from "./use-product-search";

interface ProductSearchResultsProps {
  readonly state: ProductSearchState;
}

export function ProductSearchResults({ state }: ProductSearchResultsProps) {
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
            <button type="button" onClick={state.retry} className="min-h-11 text-lime">
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
      const capped = count === LIMIT;
      return (
        <ResultsSection
          count={`${capped ? `First ${LIMIT}` : count} ${count === 1 ? "food" : "foods"}`}
        >
          <ul key={state.query} className="flex flex-col gap-1">
            {state.data.products.map((product) => (
              <ProductResult key={product.barcode} product={product} />
            ))}
          </ul>
          {capped && (
            <p className="text-11 text-muted">
              Showing the first {LIMIT} matches. Refine your search to find more specific products.
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
