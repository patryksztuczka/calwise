import { Package } from "lucide-react";
import type { ReactNode } from "react";
import type { FoodSearchResult, Product } from "./food-types";

interface ProductIdentityProps {
  readonly product: Product;
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
