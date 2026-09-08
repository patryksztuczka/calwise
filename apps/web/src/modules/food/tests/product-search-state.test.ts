import { expect, it } from "vite-plus/test";
import { deriveProductSearchState } from "../product-search-state";
import { searchResult } from "./food-fixtures";

const input = { term: "ser", valid: true, settled: true, limit: 20 };

it("keeps an empty search idle rather than showing a pending request", () => {
  expect(
    deriveProductSearchState(
      { ...input, term: "", valid: false, settled: false },
      { status: "pending", data: undefined },
    ),
  ).toEqual({ status: "idle" });
});

it("clearing the input hides previously cached results", () => {
  expect(
    deriveProductSearchState(
      { ...input, term: "", valid: false, settled: false },
      { status: "success", data: searchResult },
    ),
  ).toEqual({ status: "idle" });
});

it("honors caller-decided invalidity before showing cached data", () => {
  expect(
    deriveProductSearchState({ ...input, valid: false }, { status: "success", data: searchResult }),
  ).toEqual({ status: "invalid" });
});

it("does not revalidate input accepted by the caller", () => {
  expect(
    deriveProductSearchState({ ...input, term: "a" }, { status: "success", data: searchResult }),
  ).toEqual({ status: "results", data: searchResult, capped: false });
});

it.each(["success", "error"] as const)(
  "hides the previous query's %s while new input is unsettled",
  (status) => {
    expect(
      deriveProductSearchState(
        { ...input, term: "yogurt", settled: false },
        { status, data: searchResult },
      ),
    ).toEqual({ status: "loading" });
  },
);

it("shows loading while a settled query awaits its first response", () => {
  expect(deriveProductSearchState(input, { status: "pending", data: undefined })).toEqual({
    status: "loading",
  });
});

it("shows a failure when a settled query has no cached results", () => {
  expect(deriveProductSearchState(input, { status: "error", data: undefined })).toEqual({
    status: "failed",
  });
});

it.each(["success", "error"] as const)(
  "keeps product data visible when the query status is %s",
  (status) => {
    expect(deriveProductSearchState(input, { status, data: searchResult })).toEqual({
      status: "results",
      data: searchResult,
      capped: false,
    });
  },
);

it.each([1, 7, 20])("derives the cap from the request limit of %s", (limit) => {
  const data = {
    ...searchResult,
    products: Array.from({ length: limit }, () => searchResult.products[0]!),
  };
  expect(deriveProductSearchState({ ...input, limit }, { status: "success", data })).toEqual({
    status: "results",
    data,
    capped: true,
  });
  expect(
    deriveProductSearchState({ ...input, limit: limit + 1 }, { status: "success", data }),
  ).toEqual({
    status: "results",
    data,
    capped: false,
  });
});

it.each(["success", "error"] as const)(
  "keeps an empty result and attribution when the query status is %s",
  (status) => {
    const data = { ...searchResult, products: [] };
    expect(deriveProductSearchState(input, { status, data })).toEqual({
      status: "empty",
      attribution: searchResult.attribution,
    });
  },
);
