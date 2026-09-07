import type { ComponentPropsWithRef } from "react";

export function Button({ className = "", ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      className={`rounded-14 bg-lime px-4 py-3 font-display text-[22px] font-bold text-bg italic transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
