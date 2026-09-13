import type { LoggedUnit, NutritionBasis } from "@calwise/food-rules/log";
import type { inferOutput } from "@trpc/tanstack-react-query";
import type { ReactNode } from "react";
import type { useTRPC } from "../../lib/trpc";

export type FoodSearchResult = inferOutput<ReturnType<typeof useTRPC>["food"]["search"]>;
export type FoodBarcodeResult = inferOutput<ReturnType<typeof useTRPC>["food"]["barcode"]>;
export type PersonalListResult = inferOutput<ReturnType<typeof useTRPC>["food"]["personalList"]>;
export type CatalogProduct = FoodSearchResult["products"][number];
export type PersonalProduct = PersonalListResult["products"][number];
export type Product = CatalogProduct | PersonalProduct;
export type RenderProduct = (product: Product, done: () => void) => ReactNode;

export function isPersonalProduct(product: Product): product is PersonalProduct {
  return product.source === "personal";
}

export function productNutritionBasis(product: Product): NutritionBasis {
  if (!isPersonalProduct(product)) return product;
  return {
    energyKcal100g: product.energyKcal100,
    protein100g: product.protein100,
    carbohydrates100g: product.carbohydrates100,
    fat100g: product.fat100,
  };
}

export function productLockedUnit(product: Product): LoggedUnit | undefined {
  return isPersonalProduct(product) ? product.nutritionBasis : undefined;
}
