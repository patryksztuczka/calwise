import type { ReactNode } from "react";
import { NavLink } from "react-router";

export interface TabBarItem {
  readonly to: string;
  readonly label: string;
  /** A 21 px lucide icon. */
  readonly icon: ReactNode;
}

interface TabBarProps {
  readonly items: readonly TabBarItem[];
  readonly label?: string;
}

/** Floating bottom navigation ("Component / Tab bar"): pill surface, equal-width tabs, lime highlight on the current route. */
export function TabBar({ items, label = "Main" }: TabBarProps) {
  return (
    <nav
      aria-label={label}
      className="flex h-16 w-full rounded-32 border border-line bg-surface-nav p-1.5 backdrop-blur-md"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-[3px] rounded-26 pt-2 font-body text-10 font-semibold transition-colors ${
              isActive ? "bg-accent-soft text-lime" : "text-muted hover:text-white"
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
