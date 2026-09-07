import { ChartPie, NotebookText, TrendingUp } from "lucide-react";
import { Outlet } from "react-router";
import { TabBar, type TabBarItem } from "../components/tab-bar";

const tabs: readonly TabBarItem[] = [
  { to: "/", label: "Today", icon: <ChartPie size={21} aria-hidden="true" /> },
  { to: "/diary", label: "Diary", icon: <NotebookText size={21} aria-hidden="true" /> },
  { to: "/trends", label: "Trends", icon: <TrendingUp size={21} aria-hidden="true" /> },
];

interface AppShellProps {
  readonly showNavigation?: boolean;
}

/** Phone-sized screen frame. Focused tasks such as scanning omit the tab bar. */
export function AppShell({ showNavigation = true }: AppShellProps) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col bg-bg sm:my-6 sm:h-[min(884px,100dvh-48px)] sm:rounded-36 sm:border sm:border-line">
      <main
        className={`flex flex-1 flex-col overflow-y-auto px-5 pt-[max(16px,env(safe-area-inset-top))] ${showNavigation ? "pb-[calc(100px+env(safe-area-inset-bottom))]" : "pb-[calc(24px+env(safe-area-inset-bottom))]"}`}
      >
        <Outlet />
      </main>
      {showNavigation && (
        <div className="absolute inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))]">
          <TabBar items={tabs} />
        </div>
      )}
    </div>
  );
}
