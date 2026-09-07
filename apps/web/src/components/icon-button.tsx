import type { ComponentPropsWithRef } from "react";

/** 44 px round icon control ("Component / Icon button"). Pass a 21 px lucide icon as the child. */
export function IconButton({ className = "", ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-22 border border-line text-white transition-colors hover:bg-surface active:bg-surface disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
