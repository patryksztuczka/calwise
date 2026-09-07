import { cloneElement, type ComponentPropsWithRef, type ReactElement, type ReactNode } from "react";

interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  /** Render as this element, such as a router Link, instead of a button. */
  readonly render?: ReactElement<{ className?: string; children?: ReactNode }>;
}

/** 44 px round icon control ("Component / Icon button"). Pass a 21 px lucide icon as the child. */
export function IconButton({ render, children, className = "", ...props }: IconButtonProps) {
  const classes = `inline-flex size-11 shrink-0 items-center justify-center rounded-22 border border-line text-white transition-colors hover:bg-surface active:bg-surface disabled:opacity-50 ${className}`;
  if (render) return cloneElement(render, { className: classes }, children);
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
