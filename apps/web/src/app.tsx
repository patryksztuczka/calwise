import { lazy, Suspense } from "react";
import { TodayScreen } from "./modules/today/today-screen";

const FoodPrototype = lazy(() => import("./modules/food/food-prototype"));

export default function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/food") {
    return (
      <Suspense fallback={<p role="status">Loading food search…</p>}>
        <FoodPrototype />
      </Suspense>
    );
  }
  return <TodayScreen />;
}
