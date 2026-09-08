import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@calwise/food-rules";
import { ArrowLeft, CircleX, ScanBarcode, Search } from "lucide-react";
import { useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { ProductSearchResults } from "../modules/food/product-search-results";
import { useProductSearch } from "../modules/food/use-product-search";

export default function LogFoodPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = params.get("q") ?? "";
  const term = query.trim();
  const { state, flush, retry } = useProductSearch(term);

  function updateQuery(value: string) {
    setParams(value ? { q: value } : {}, { replace: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex h-11 items-center gap-3.5">
        <IconButton render={<Link to="/" aria-label="Back to today" />}>
          <ArrowLeft size={21} aria-hidden="true" />
        </IconButton>
        <h1 className="flex-1 font-display text-30 font-bold italic">SEARCH FOOD</h1>
        <IconButton render={<Link to={`/scan${location.search}`} aria-label="Scan barcode" />}>
          <ScanBarcode size={21} className="text-lime" aria-hidden="true" />
        </IconButton>
      </header>
      <p className="text-12 text-muted">
        Explore products and nutrition. Nothing is added to your meals.
      </p>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          flush();
        }}
      >
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <div className="flex h-[54px] items-center gap-3 rounded-12 border border-line bg-surface pl-4 focus-within:border-lime">
          <Search size={20} className="shrink-0 text-lime" aria-hidden="true" />
          <input
            ref={inputRef}
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Search by name or brand"
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby="search-hint"
            className="min-w-0 flex-1 bg-transparent text-15 outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Clear search"
            disabled={!query}
            onClick={() => {
              updateQuery("");
              inputRef.current?.focus();
            }}
            className="flex size-11 shrink-0 items-center justify-center text-muted disabled:invisible"
          >
            <CircleX size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-18 bg-lime px-6 py-2.5 text-11 font-semibold text-bg">
          All foods
        </span>
        <p id="search-hint" className="text-10 text-muted">
          Search with at least {SEARCH_MIN_LENGTH} characters
        </p>
      </div>
      {/* A new search collapses any expanded product rows. */}
      <ProductSearchResults key={term} state={state} onRetry={retry} />
    </div>
  );
}
