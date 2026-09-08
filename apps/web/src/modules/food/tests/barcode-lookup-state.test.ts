import { expect, it } from "vite-plus/test";
import { deriveLookupState } from "../barcode-lookup-state";
import { barcodeResult } from "./food-fixtures";

it("reports an invalid barcode instead of waiting on its disabled query", () => {
  expect(
    deriveLookupState(false, { status: "pending", data: undefined, errorCode: undefined }),
  ).toEqual({ status: "invalid" });
});

it("invalid input takes priority over cached product data", () => {
  expect(
    deriveLookupState(false, { status: "success", data: barcodeResult, errorCode: undefined }),
  ).toEqual({ status: "invalid" });
});

it("waits for a first response to a valid barcode", () => {
  expect(
    deriveLookupState(true, {
      status: "pending",
      data: undefined,
      errorCode: undefined,
    }),
  ).toEqual({ status: "loading" });
});

it("shows the matched product without changing its leading-zero barcode", () => {
  expect(
    deriveLookupState(true, {
      status: "success",
      data: barcodeResult,
      errorCode: undefined,
    }),
  ).toEqual({ status: "found", data: barcodeResult });
});

it("distinguishes a missing barcode from a request failure", () => {
  expect(
    deriveLookupState(true, {
      status: "error",
      data: undefined,
      errorCode: "NOT_FOUND",
    }),
  ).toEqual({ status: "missing" });
});

it.each(["INTERNAL_SERVER_ERROR", undefined])(
  "reports request failures with error code %s",
  (errorCode) => {
    expect(deriveLookupState(true, { status: "error", data: undefined, errorCode })).toEqual({
      status: "failed",
    });
  },
);

it.each(["NOT_FOUND", "INTERNAL_SERVER_ERROR", undefined])(
  "keeps cached product details after a failed refresh with code %s",
  (errorCode) => {
    expect(deriveLookupState(true, { status: "error", data: barcodeResult, errorCode })).toEqual({
      status: "found",
      data: barcodeResult,
    });
  },
);
