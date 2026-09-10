import { cloneElement, type ComponentPropsWithRef, type ReactElement } from "react";

const baseClassName =
  "flex w-full items-center justify-center gap-2.5 bg-lime font-display text-22 font-bold tracking-[0.5px] text-bg italic transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50";

interface PrimaryActionProps extends ComponentPropsWithRef<"button"> {
  readonly size?: "default" | "compact";
  /** Render as this element (for example a router Link) instead of a button. */
  readonly render?: ReactElement<{ className?: string; children?: ReactElement }>;
}

/** Full-width lime call to action ("Component / Primary action"). Children: optional 23 px icon plus an uppercase label. */
export function PrimaryAction({
  render,
  children,
  size = "default",
  ...props
}: PrimaryActionProps) {
  const className = `${baseClassName} ${size === "compact" ? "h-[50px] rounded-10" : "h-14 rounded-14"}`;
  if (render) return cloneElement(render, { className }, children);
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}
