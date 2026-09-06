import type { ComponentPropsWithRef } from "react";

export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={`min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400 aria-invalid:border-red-400 ${className}`}
      {...props}
    />
  );
}
