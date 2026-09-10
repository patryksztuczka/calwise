import type { ReactNode } from "react";
import type { inferOutput } from "@trpc/tanstack-react-query";
import type { useTRPC } from "../../lib/trpc";

export type FoodSearchResult = inferOutput<ReturnType<typeof useTRPC>["food"]["search"]>;
export type FoodBarcodeResult = inferOutput<ReturnType<typeof useTRPC>["food"]["barcode"]>;
export type Product = FoodSearchResult["products"][number];
export type RenderProduct = (product: Product, done: () => void) => ReactNode;
