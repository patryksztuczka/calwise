import type { AppRouter } from "@calwise/api/trpc";
import type { ParsedNutritionLabel } from "../src/modules/scanner/nutrition-label-parser.ts";
import {
  expect,
  test as base,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { apiUrl } from "./urls.ts";

export const password = "correct horse battery";
export const logDate = "2026-01-02";

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PersonalProduct = RouterOutputs["food"]["personalCreate"]["product"];
export type PersonalCreateResult = RouterOutputs["food"]["personalCreate"];
export type PersonalListResult = RouterOutputs["food"]["personalList"];
export type PersonalGetResult = RouterOutputs["food"]["personalGet"];
export type FoodEntry = RouterOutputs["foodLog"]["day"][number];
export type PersonalBarcodeResult = Extract<
  RouterOutputs["food"]["barcode"],
  { readonly source: "personal" }
>;
export type CatalogBarcodeResult = Extract<
  RouterOutputs["food"]["barcode"],
  { readonly source: "catalog" }
>;
type PersonalListInput = RouterInputs["food"]["personalList"];

type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;
interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

/** A transport bag kept separate from router contracts so tests can send invalid requests. */
export type InvalidRpcInput = JsonObject;

export async function signUp(page: Page, label = "personal-product") {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`${label}-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
}

export function query(request: APIRequestContext, procedure: string, input: InvalidRpcInput) {
  return request.get(`${apiUrl}/trpc/${procedure}`, {
    params: { input: JSON.stringify(input) },
  });
}

export function mutate(request: APIRequestContext, procedure: string, input: InvalidRpcInput) {
  return request.post(`${apiUrl}/trpc/${procedure}`, { data: input });
}

export async function data<T = unknown>(response: APIResponse): Promise<T> {
  expect(response.ok(), await response.text()).toBe(true);
  const body: unknown = await response.json();
  // SAFETY: Successful tRPC responses have a result.data envelope. Callers choose an inferred router output.
  return (body as { result: { data: T } }).result.data;
}

export function productInput(overrides: InvalidRpcInput = {}) {
  return {
    requestId: crypto.randomUUID(),
    name: `Test product ${crypto.randomUUID()}`,
    nutritionBasis: "g",
    energyKcal100: 123.456789,
    protein100: 10.125,
    carbohydrates100: 20.25,
    fat100: 3.5,
    ...overrides,
  };
}

export function createPersonal(request: APIRequestContext, overrides: InvalidRpcInput = {}) {
  return mutate(request, "food.personalCreate", productInput(overrides));
}

export async function collectPages(
  request: APIRequestContext,
  input: Pick<PersonalListInput, "query"> = {},
  cursor?: string,
  collected: PersonalProduct[] = [],
): Promise<PersonalProduct[]> {
  const listInput = cursor ? { ...input, cursor } : input;
  const page = await data<PersonalListResult>(await query(request, "food.personalList", listInput));
  const products = [...collected, ...page.products];
  return page.nextCursor ? collectPages(request, input, page.nextCursor, products) : products;
}

interface BarcodeScannerFixture {
  readonly capture: (code: string) => Promise<void>;
}

interface NutritionScannerFixture {
  readonly denyCamera: () => Promise<void>;
  readonly setReading: (reading: ParsedNutritionLabel) => Promise<void>;
}

declare global {
  interface Window {
    calwiseTestCaptureBarcode?: (code: string) => void;
    calwiseTestDenyCamera?: () => void;
    calwiseTestSetNutritionReading?: (reading: ParsedNutritionLabel) => void;
  }
}

export const test = base.extend<{
  readonly barcodeScanner: BarcodeScannerFixture;
  readonly nutritionScanner: NutritionScannerFixture;
}>({
  barcodeScanner: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        let capturedCode: string | undefined;
        let denyCamera = false;
        window.calwiseTestCaptureBarcode = (code) => {
          capturedCode = code;
        };
        window.calwiseTestDenyCamera = () => {
          denyCamera = true;
        };
        let nutritionReading: ParsedNutritionLabel = {
          basis: "ml",
          canPrefill: true,
          issues: [],
          values: {
            energyKcal100: "40",
            protein100: "0",
            carbohydrates100: "9.5",
            fat100: "0",
            sugars100: "9.5",
          },
        };
        window.calwiseTestSetNutritionReading = (reading) => {
          nutritionReading = reading;
        };
        window.calwiseTestNutritionRecognize = () => nutritionReading;

        class TestBarcodeDetector {
          private initialized = false;

          static async getSupportedFormats() {
            return ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];
          }

          async detect(_image: ImageData) {
            if (!this.initialized) {
              this.initialized = true;
              return [];
            }
            const code = capturedCode;
            capturedCode = undefined;
            return code ? [{ rawValue: code }] : [];
          }
        }

        class TestTrack extends EventTarget {
          stop() {}
          getCapabilities() {
            return {};
          }
          async applyConstraints() {}
        }

        const track = new TestTrack();
        const stream = {
          getTracks: () => [track],
          getVideoTracks: () => [track],
        };
        Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
        Object.defineProperty(navigator, "mediaDevices", {
          configurable: true,
          value: {
            getUserMedia: async () => {
              if (denyCamera) throw new DOMException("denied in browser test", "NotAllowedError");
              return stream;
            },
          },
        });
        Object.defineProperty(window, "BarcodeDetector", {
          configurable: true,
          value: TestBarcodeDetector,
        });
        Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
          configurable: true,
          value: () => {},
        });
        Object.defineProperties(HTMLMediaElement.prototype, {
          srcObject: {
            configurable: true,
            get() {
              return stream;
            },
            set() {},
          },
          readyState: {
            configurable: true,
            get() {
              return HTMLMediaElement.HAVE_CURRENT_DATA;
            },
          },
          play: { configurable: true, value: async () => {} },
          pause: { configurable: true, value: () => {} },
        });
        Object.defineProperties(HTMLVideoElement.prototype, {
          videoWidth: {
            configurable: true,
            get() {
              return 640;
            },
          },
          videoHeight: {
            configurable: true,
            get() {
              return 360;
            },
          },
        });
      });
      await use({
        capture: async (code) => {
          await page.evaluate((value) => {
            const capture = window.calwiseTestCaptureBarcode;
            if (!capture) throw new Error("Barcode scanner fixture was not installed");
            capture(value);
          }, code);
        },
      });
    },
    { auto: true },
  ],
  nutritionScanner: [
    async ({ page }, use) => {
      await use({
        denyCamera: async () => {
          await page.evaluate(() => {
            const deny = window.calwiseTestDenyCamera;
            if (!deny) throw new Error("Nutrition scanner fixture was not installed");
            deny();
          });
        },
        setReading: async (reading) => {
          await page.evaluate((nextReading) => {
            const setReading = window.calwiseTestSetNutritionReading;
            if (!setReading) throw new Error("Nutrition scanner fixture was not installed");
            setReading(nextReading);
          }, reading);
        },
      });
    },
    { auto: true },
  ],
});

export { expect };
