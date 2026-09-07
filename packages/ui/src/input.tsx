import type { ComponentPropsWithRef } from "react";

export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={`min-w-0 rounded-8 border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-lime aria-invalid:border-danger ${className}`}
      {...props}
    />
  );
}
