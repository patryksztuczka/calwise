import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleX, ScanBarcode, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { useTRPC } from "../lib/trpc";
import { FoodAttribution, ProductResult, ProductSkeletons } from "../modules/food/product-details";

export default function LogFoodPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = params.get("q") ?? "";
  const term = query.trim();
  const [debounced, setDebounced] = useState(term);
  const valid = term.length >= 2 && term.length <= 100 && /[\p{L}\p{N}]/u.test(term);
  const trpc = useTRPC();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const search = useQuery({
    ...trpc.food.search.queryOptions({ q: debounced, limit: 20 }),
    enabled: valid && debounced === term,
    staleTime: 60_000,
    retry: false,
  });
  const loading = valid && (debounced !== term || search.isPending);
  const data = valid && debounced === term ? search.data : undefined;

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
          setDebounced(term);
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
            maxLength={100}
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
          Search with at least 2 characters
        </p>
      </div>
      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="results-heading" className="text-11 font-bold tracking-[1px]">
            RESULTS
          </h2>
          <span role="status" className="text-11 text-muted">
            {data &&
              `${data.products.length === 20 ? "First 20" : data.products.length} ${data.products.length === 1 ? "food" : "foods"}`}
          </span>
        </div>
        {!valid && (
          <p className="py-10 text-center text-13 leading-relaxed text-muted">
            {term
              ? "Enter 2 to 100 characters with a letter or number."
              : "Find a food by name or brand, or scan its barcode."}
          </p>
        )}
        {loading && <ProductSkeletons />}
        {valid && debounced === term && search.isError && (
          <div role="alert" className="flex flex-col items-start gap-3 py-5 text-13">
            <p className="text-danger">
              Could not search products. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void search.refetch()}
              disabled={search.isFetching}
              className="min-h-11 text-lime disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}
        {data && (
          <>
            {data.products.length === 0 ? (
              <p className="py-10 text-center text-13 leading-relaxed text-muted">
                No products found. Try another name or brand, or scan a barcode.
              </p>
            ) : (
              <ul key={debounced} className="flex flex-col gap-1">
                {data.products.map((product) => (
                  <ProductResult key={product.barcode} product={product} />
                ))}
              </ul>
            )}
            {data.products.length === 20 && (
              <p className="text-11 text-muted">
                Showing the first 20 matches. Refine your search to find more specific products.
              </p>
            )}
            <FoodAttribution attribution={data.attribution} />
          </>
        )}
      </section>
    </div>
  );
}
