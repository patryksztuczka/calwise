import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { AppShell } from "./layouts/app-shell";

const TodayPage = lazy(() => import("./pages/today-page"));
const GreetingPage = lazy(() => import("./pages/greeting-page"));
const ComingSoonPage = lazy(() => import("./pages/coming-soon-page"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="greeting" element={<GreetingPage />} />
          <Route path="*" element={<ComingSoonPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
