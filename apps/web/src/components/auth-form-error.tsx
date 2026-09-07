/** Server-side sign-in or sign-up failure, announced to assistive technology. */
export function AuthFormError({ message }: { readonly message: string | null }) {
  if (message === null) return null;
  return (
    <p role="alert" data-testid="auth-error" className="font-body text-13 text-danger">
      {message}
    </p>
  );
}
