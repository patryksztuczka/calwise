import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, CircleX, Plus, ScanBarcode, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { usePatchSearchParams } from "../lib/patch-search-params";
import { useTRPC } from "../lib/trpc";
import { DestinationControl } from "../modules/food-log/destination-picker";
import { useLogDestination } from "../modules/food-log/destination";
import { LoggingFooter, renderAddFoodForm } from "../modules/food-log/logging-session";
import { ProductResult } from "../modules/food/product-search-results";

interface MyFoodsNavigationState {
  readonly createdName?: string;
  readonly selectedProductId?: string;
}

export default function MyFoodsPage() {
  const trpc = useTRPC();
  const [params] = useSearchParams();
  const patchParams = usePatchSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = useLogDestination();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = params.get("q") ?? "";
  const term = query.trim();
  // SAFETY: router state is optional display state; missing properties fall back to undefined.
  const navigationState = (location.state ?? {}) as MyFoodsNavigationState;
  const [state] = useState(navigationState);
  useEffect(() => {
    if (location.state === null) return;
    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);
  const products = useInfiniteQuery(
    trpc.food.personalList.infiniteQueryOptions(term ? { query: term } : {}, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      retry: false,
      staleTime: 30_000,
    }),
  );
  const rows = products.data?.pages.flatMap((page) => page.products) ?? [];
  const sharedParams = new URLSearchParams();
  sharedParams.set("date", destination.date);
  if (destination.meal) sharedParams.set("meal", destination.meal);
  if (query) sharedParams.set("q", query);

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col gap-3">
      <header className="flex h-11 items-center gap-3.5">
        <IconButton render={<Link to={`/?date=${destination.date}`} aria-label="Back to today" />}>
          <ArrowLeft size={21} aria-hidden="true" />
        </IconButton>
        <h1 className="flex-1 font-display text-30 font-bold italic">ADD FOOD</h1>
        <IconButton render={<Link to={`/scan${location.search}`} aria-label="Scan barcode" />}>
          <ScanBarcode size={21} className="text-lime" aria-hidden="true" />
        </IconButton>
      </header>
      <DestinationControl destination={destination} onChoose={destination.setDestination} />
      {state.createdName && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-10 border border-success-border bg-success-soft p-3 text-12"
        >
          <CircleCheck size={20} className="shrink-0 text-lime" aria-hidden="true" />
          {state.createdName} saved to My foods. Nothing was added to your meals.
        </div>
      )}
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="my-foods-search" className="sr-only">
          Search My foods
        </label>
        <div className="flex h-[54px] items-center gap-3 rounded-12 border border-line bg-surface pl-4 focus-within:border-lime">
          <Search size={20} className="shrink-0 text-lime" aria-hidden="true" />
          <input
            ref={inputRef}
            id="my-foods-search"
            type="search"
            value={query}
            onChange={(event) => patchParams({ q: event.target.value || null })}
            maxLength={200}
            placeholder="Search My foods"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-15 outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Clear My foods search"
            disabled={!query}
            onClick={() => {
              patchParams({ q: null });
              inputRef.current?.focus();
            }}
            className="flex size-11 shrink-0 items-center justify-center text-muted disabled:invisible"
          >
            <CircleX size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
      <nav aria-label="Food collections" className="flex items-center gap-2">
        <Link
          to={`/log-food?${sharedParams}`}
          className="rounded-18 border border-line bg-surface px-5 py-2.5 text-11 text-muted"
        >
          All foods
        </Link>
        <span
          aria-current="page"
          className="rounded-18 bg-lime px-5 py-2.5 text-11 font-semibold text-bg"
        >
          My foods
        </span>
      </nav>
      <PrimaryAction
        size="compact"
        render={<Link to={`/create-product?${sharedParams}`} aria-label="Create product" />}
      >
        <Plus size={21} aria-hidden="true" /> CREATE PRODUCT
      </PrimaryAction>
      <section aria-labelledby="my-products-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="my-products-heading" className="text-11 font-bold tracking-[1px]">
            YOUR PRODUCTS
          </h2>
          {!products.isPending && !products.isError && (
            <span role="status" className="text-11 text-muted">
              {rows.length} {rows.length === 1 ? "food" : "foods"}
            </span>
          )}
        </div>
        {products.isPending && (
          <p role="status" className="py-10 text-center text-13 text-muted">
            Loading My foods…
          </p>
        )}
        {products.isError && (
          <div role="alert" className="flex flex-col items-start gap-3 py-6 text-13">
            <p className="text-danger">
              Could not load My foods. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void products.refetch()}
              className="min-h-11 text-lime"
            >
              Try again
            </button>
          </div>
        )}
        {!products.isPending && !products.isError && rows.length === 0 && (
          <p className="py-10 text-center text-13 leading-relaxed text-muted">
            {term
              ? "No personal products match this search."
              : "Your saved products will appear here. Create your first product to get started."}
          </p>
        )}
        {rows.length > 0 && (
          <ul className="flex flex-col gap-1">
            {rows.map((product) => (
              <ProductResult
                key={product.id}
                product={product}
                renderProduct={renderAddFoodForm}
                initiallyExpanded={product.id === state.selectedProductId}
              />
            ))}
          </ul>
        )}
        {products.hasNextPage && (
          <button
            type="button"
            disabled={products.isFetchingNextPage}
            onClick={() => void products.fetchNextPage()}
            className="min-h-12 rounded-10 border border-line bg-surface text-12 font-semibold text-lime disabled:opacity-50"
          >
            {products.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        )}
      </section>
      <LoggingFooter />
    </div>
  );
}
