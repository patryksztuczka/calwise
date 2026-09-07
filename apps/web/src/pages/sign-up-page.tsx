import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthField } from "../components/auth-field";
import { AuthFormError } from "../components/auth-form-error";
import { PrimaryAction } from "../components/primary-action";
import { authClient } from "../lib/auth-client";

/** "Calwise · Auth · Sign up": email + password create a usable account at once; no verification step. */
export default function SignUpPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setSubmitting(true);
    setError(null);
    const result = await authClient.signUp.email({
      email,
      password: String(form.get("password")),
      // The design collects no name; Better Auth requires one, so start from the address.
      name: email.split("@")[0] ?? email,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Could not create the account.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <>
      <header className="flex flex-col gap-3 pt-[38px] pb-7">
        <h1 className="font-display text-60 leading-[0.98] font-bold text-white italic">
          MAKE IT
          <br />
          YOUR DAY.
        </h1>
        <p className="font-body text-14 leading-normal text-muted">
          Create an account to track food and progress.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
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
          autoComplete="new-password"
          placeholder="Create a password"
          minLength={8}
          required
        />
        <AuthFormError message={error} />
        <PrimaryAction type="submit" disabled={submitting}>
          CREATE ACCOUNT
        </PrimaryAction>
      </form>

      <p className="flex justify-center gap-1.5 py-[26px] font-body text-13 text-muted">
        Already have an account?
        <Link to="/sign-in" className="font-semibold text-lime">
          Sign in
        </Link>
      </p>

      <footer className="mt-auto flex flex-col items-center gap-1 pt-4 font-body text-12">
        <p className="font-medium text-muted">By creating an account, you agree to our</p>
        <p className="flex gap-[5px] text-white">
          <span>Terms of service</span>
          <span className="text-muted">and</span>
          <span>Privacy policy</span>
        </p>
      </footer>
    </>
  );
}
