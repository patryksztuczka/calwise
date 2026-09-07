import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthField } from "../components/auth-field";
import { AuthFormError } from "../components/auth-form-error";
import { PrimaryAction } from "../components/primary-action";
import { authClient } from "../lib/auth-client";

/** "Calwise · Auth · Sign in": email + password, then on to Today. */
export default function SignInPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Could not sign in.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <>
      <header className="flex flex-col gap-3 pt-[54px] pb-8">
        <h1 className="font-display text-60 leading-[0.98] font-bold text-white italic">
          WELCOME
          <br />
          BACK.
        </h1>
        <p className="font-body text-14 leading-normal text-muted">
          Your goals. Your progress. Right here.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <AuthField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <div className="flex h-7 items-center justify-end">
          <button
            type="button"
            disabled
            title="Password recovery is not available yet"
            className="font-body text-13 font-medium text-lime disabled:opacity-60"
          >
            Forgot password?
          </button>
        </div>
        <AuthFormError message={error} />
        <PrimaryAction type="submit" disabled={submitting}>
          SIGN IN
        </PrimaryAction>
      </form>

      <p className="flex justify-center gap-1.5 py-[26px] font-body text-13 text-muted">
        New to Calwise?
        <Link to="/sign-up" className="font-semibold text-lime">
          Sign up
        </Link>
      </p>
    </>
  );
}
