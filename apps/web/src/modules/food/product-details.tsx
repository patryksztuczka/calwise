import { Package } from "lucide-react";
import type { ReactNode } from "react";
import { nutritionFormat as number } from "../../lib/number-format";
import type { FoodSearchResult, Product } from "./food-types";

interface ProductProps {
  readonly product: Product;
}

interface ProductIdentityProps extends ProductProps {
  readonly children?: ReactNode;
}

export function ProductIdentity({ product, children }: ProductIdentityProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3.5">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-10 bg-surface text-muted">
        <Package size={20} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-14 font-semibold break-words">{product.name}</span>
        <span className="text-11 text-muted">
          {[product.brands, product.packageQuantity].filter(Boolean).join(" · ") || "Packaged food"}
        </span>
        {children}
      </span>
    </span>
  );
}

export function ProductNutrition({ product }: ProductProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-10 font-semibold tracking-[1px] text-muted">NUTRITION PER 100 G / ML</p>
      <dl className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-2">
        <div className="border-r border-line pr-2">
          <dt className="text-9 text-muted">KCAL</dt>
          <dd className="font-display text-30 font-semibold text-lime">
            {number.format(product.energyKcal100g)}
          </dd>
        </div>
        {(
          [
            ["PROTEIN", product.protein100g],
            ["CARBS", product.carbohydrates100g],
            ["FAT", product.fat100g],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-8 tracking-[0.6px] text-muted">{label}</dt>
            <dd className="mt-1 text-12 font-semibold">{number.format(value)} g</dd>
          </div>
        ))}
      </dl>
      <dl className="divide-y divide-line text-12">
        {(
          [
            ["Saturated fat", product.saturatedFat100g],
            ["Sugars", product.sugars100g],
            ["Fiber", product.fiber100g],
            ["Salt", product.salt100g],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-muted">{label}</dt>
            <dd>{value === null ? "Not available" : `${number.format(value)} g`}</dd>
          </div>
        ))}
      </dl>
      <p className="text-11 leading-relaxed text-muted">
        Values are per 100 g or 100 ml as supplied by Open Food Facts, not per serving. Check the
        packaging for the basis.
      </p>
      {product.servingSize && (
        <p className="text-11 text-muted">Serving size on label: {product.servingSize}</p>
      )}
      <p className="text-11 break-all text-muted">
        Barcode: <span className="font-mono select-all">{product.barcode}</span>
      </p>
      <a
        href={product.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-11 text-lime underline underline-offset-4"
      >
        View product on Open Food Facts
      </a>
    </div>
  );
}

interface FoodAttributionProps {
  readonly attribution: FoodSearchResult["attribution"];
}

export function FoodAttribution({ attribution }: FoodAttributionProps) {
  return (
    <p className="text-10 leading-relaxed text-muted">
      Data:{" "}
      <a
        href={attribution.url}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4"
      >
        {attribution.name}
      </a>{" "}
      · {attribution.license}
    </p>
  );
}
