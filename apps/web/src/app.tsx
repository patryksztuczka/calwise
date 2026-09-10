import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { RequireAuth } from "./components/require-auth";
import { AppShell } from "./layouts/app-shell";
import { LoggingSession } from "./modules/food-log/logging-session";
import { AuthLayout } from "./layouts/auth-layout";

const ProfilePage = lazy(() => import("./pages/profile-page"));
const NutritionGoalsPage = lazy(() => import("./pages/nutrition-goals-page"));
const MealPage = lazy(() => import("./pages/meal-page"));
const EditFoodPage = lazy(() => import("./pages/edit-food-page"));
const TodayPage = lazy(() => import("./pages/today-page"));
const ScanBarcodePage = lazy(() => import("./pages/scan-barcode-page"));
const LogFoodPage = lazy(() => import("./pages/log-food-page"));
const GreetingPage = lazy(() => import("./pages/greeting-page"));
const ComingSoonPage = lazy(() => import("./pages/coming-soon-page"));
const SignInPage = lazy(() => import("./pages/sign-in-page"));
const SignUpPage = lazy(() => import("./pages/sign-up-page"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell showNavigation={false} />}>
            <Route element={<LoggingSession />}>
              <Route path="scan" element={<ScanBarcodePage />} />
              <Route path="log-food" element={<LogFoodPage />} />
            </Route>
            <Route path="profile/nutrition-goals" element={<NutritionGoalsPage />} />
            <Route path="meal/:meal" element={<MealPage />} />
            <Route path="food-entry/:id" element={<EditFoodPage />} />
          </Route>
        </Route>
        <Route element={<AppShell />}>
          {/* The greeting smoke test stays public so the end-to-end path can be checked without an account. */}
          <Route path="greeting" element={<GreetingPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<TodayPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<ComingSoonPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
