import { expect, it } from "vite-plus/test";
import { deriveProductSearchState } from "../product-search-state";
import { searchResult } from "./food-fixtures";

it("keeps an empty search idle rather than showing a pending request", () => {
  expect(deriveProductSearchState("", false, { status: "pending", data: undefined })).toEqual({
    status: "idle",
  });
});

it("clearing the input hides previously cached results", () => {
  expect(deriveProductSearchState("", false, { status: "success", data: searchResult })).toEqual({
    status: "idle",
  });
});

it.each(["a", "***", "x".repeat(101)])(
  "rejects invalid input before showing cached data: %s",
  (term) => {
    expect(deriveProductSearchState(term, true, { status: "success", data: searchResult })).toEqual(
      { status: "invalid" },
    );
  },
);

it.each(["success", "error"] as const)(
  "hides the previous query's %s while new input is unsettled",
  (status) => {
    expect(deriveProductSearchState("yogurt", false, { status, data: searchResult })).toEqual({
      status: "loading",
    });
  },
);

it("shows loading while a settled query awaits its first response", () => {
  expect(deriveProductSearchState("ser", true, { status: "pending", data: undefined })).toEqual({
    status: "loading",
  });
});

it("shows a failure when a settled query has no cached results", () => {
  expect(deriveProductSearchState("ser", true, { status: "error", data: undefined })).toEqual({
    status: "failed",
  });
});

it.each(["success", "error"] as const)(
  "keeps product data visible when the query status is %s",
  (status) => {
    expect(deriveProductSearchState("Żółty", true, { status, data: searchResult })).toEqual({
      status: "results",
      data: searchResult,
    });
  },
);

it.each(["success", "error"] as const)(
  "keeps an empty result and attribution when the query status is %s",
  (status) => {
    const data = { ...searchResult, products: [] };
    expect(deriveProductSearchState("missing food", true, { status, data })).toEqual({
      status: "empty",
      attribution: searchResult.attribution,
    });
  },
);
