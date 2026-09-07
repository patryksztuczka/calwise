import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentPropsWithRef } from "react";

interface AuthFieldProps extends Omit<ComponentPropsWithRef<"input">, "id" | "type"> {
  readonly label: string;
  readonly type: "email" | "password";
}

/** Labelled text input on a surface ("Component / Auth field"); password fields get a show/hide toggle. */
export function AuthField({ label, type, className = "", ...props }: AuthFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <label htmlFor={id} className="font-body text-13 font-medium text-white">
        {label}
      </label>
      <div className="flex h-14 items-center gap-3 rounded-12 border border-line bg-surface px-4 focus-within:border-lime">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className="min-w-0 flex-1 bg-transparent font-body text-14 text-white outline-none placeholder:text-muted"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
            className="shrink-0 text-muted transition-colors hover:text-white"
          >
            {revealed ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
