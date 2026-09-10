import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./icon-button";

export function BottomSheet({
  title,
  onClose,
  children,
  closeLabel = "Close",
  pending = false,
}: {
  readonly title: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly closeLabel?: string;
  readonly pending?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-20 border border-line bg-bg p-5 pb-[max(24px,env(safe-area-inset-bottom))] text-white backdrop:bg-bg/80 sm:bottom-6 sm:rounded-b-36"
    >
      <div className="mx-auto mb-5 h-1 w-10 rounded-2 bg-line" aria-hidden="true" />
      <header className="mb-5 flex items-center gap-3">
        <h2
          id={heading}
          className="flex flex-1 items-center gap-3 font-display text-24 font-bold italic"
        >
          {title}
        </h2>
        <IconButton aria-label={closeLabel} onClick={onClose} disabled={pending}>
          <X size={21} aria-hidden="true" />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
