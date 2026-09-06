import type { ComponentPropsWithRef } from "react";

export function Button({ className = "", ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      className={`rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
