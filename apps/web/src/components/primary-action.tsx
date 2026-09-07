import { cloneElement, type ComponentPropsWithRef, type ReactElement } from "react";

const className =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-14 bg-lime font-display text-22 font-bold tracking-[0.5px] text-bg italic transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50";

interface PrimaryActionProps extends ComponentPropsWithRef<"button"> {
  /** Render as this element (for example a router Link) instead of a button. */
  readonly render?: ReactElement<{ className?: string; children?: ReactElement }>;
}

/** Full-width lime call to action ("Component / Primary action"). Children: optional 23 px icon plus an uppercase label. */
export function PrimaryAction({ render, children, ...props }: PrimaryActionProps) {
  if (render) return cloneElement(render, { className }, children);
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}
