import { Outlet } from "react-router";

/** Phone-sized frame for the sign-in and sign-up screens: wordmark on top, no tab bar. */
export function AuthLayout() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col bg-bg sm:my-6 sm:h-[min(884px,100dvh-48px)] sm:rounded-36 sm:border sm:border-line">
      <main className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <p className="font-display text-30 leading-none font-bold tracking-[1px] text-lime italic">
          CALWISE
        </p>
        <Outlet />
      </main>
    </div>
  );
}
