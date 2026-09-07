import {
  Apple,
  ChartPie,
  ChevronRight,
  NotebookText,
  Plus,
  TrendingUp,
  UserRound,
  Utensils,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { energySummary, mockToday } from "./mock-today";
import "./today.css";

const number = new Intl.NumberFormat("en-US");
const mealIcons = [Zap, Utensils, Apple];

function useCounterReveal() {
  const [progress, setProgress] = useState(() =>
    globalThis.matchMedia?.("(prefers-reduced-motion: no-preference)").matches ? 0 : 1,
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const duration = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--counter-reveal-duration"),
    );
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      setProgress(1 - (1 - elapsed) ** 3);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    }
    function finish() {
      if (preference.matches) {
        cancelAnimationFrame(frame);
        setProgress(1);
      }
    }
    frame = requestAnimationFrame(tick);
    preference.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", finish);
    };
  }, []);
  return progress;
}

function CalorieGauge({ consumed, goal }: { consumed: number; goal: number }) {
  const summary = energySummary(consumed, goal);
  return (
    <div className={`calorie-gauge ${summary.overGoal ? "is-over" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 142 142" fill="none">
        {Array.from({ length: 40 }, (_, index) => {
          const start = ((130 + index * 7) * Math.PI) / 180;
          const end = start + (4.7 * Math.PI) / 180;
          return (
            <path
              key={index}
              d={`M ${71 + 63.5 * Math.cos(start)} ${71 + 63.5 * Math.sin(start)} A 63.5 63.5 0 0 1 ${71 + 63.5 * Math.cos(end)} ${71 + 63.5 * Math.sin(end)}`}
              stroke={
                index < Math.round(summary.progress * 40)
                  ? "currentColor"
                  : "var(--color-gauge-empty)"
              }
              strokeWidth="9"
            />
          );
        })}
      </svg>
      <div className="gauge-label">
        <strong>{number.format(summary.difference)}</strong>
        <span>Kcal {summary.overGoal ? "over" : "left"}</span>
      </div>
    </div>
  );
}

export function TodayScreen() {
  const consumed = mockToday.meals.reduce((total, meal) => total + meal.calories, 0);
  const summary = energySummary(consumed, mockToday.calorieGoal);
  const reveal = useCounterReveal();
  const animatedCalories = Math.round(consumed * reveal);
  return (
    <div className="today-screen">
      <header className="today-header">
        <h1 className="today-wordmark">
          Calwise<span className="sr-only"> Today</span>
        </h1>
        <button
          className="profile-button"
          disabled
          aria-label="Profile, coming soon"
          title="Profile is not available in this prototype"
        >
          <UserRound size={21} aria-hidden="true" />
        </button>
      </header>
      <main className="today-main">
        <section className="energy-summary" aria-label="Daily calories">
          <div className="today-date">
            <h2>Today</h2>
            <time dateTime={mockToday.date}>Mon, Jun 15</time>
          </div>
          <div className="energy-values" aria-hidden="true">
            <div className="calories-eaten">
              <strong>{number.format(animatedCalories)}</strong>
              <span>Kcal eaten</span>
            </div>
            <CalorieGauge consumed={animatedCalories} goal={mockToday.calorieGoal} />
          </div>
          <p className="sr-only">
            {number.format(consumed)} kilocalories eaten. {summary.difference} kilocalories left.
          </p>
          <div className="goal-caption">
            <span>{summary.percent}% of your daily goal</span>
            <span>Goal&nbsp; {number.format(mockToday.calorieGoal)} kcal</span>
          </div>
        </section>

        <section className="macro-counters" aria-label="Macronutrients">
          {mockToday.macros.map((macro) => (
            <div className="macro-counter" key={macro.name}>
              <h2>{macro.name}</h2>
              <div className="macro-values">
                <strong>{macro.consumed}g</strong>
                <span>/ {macro.goal}</span>
              </div>
              <progress
                value={macro.consumed}
                max={macro.goal}
                aria-label={`${macro.name}: ${macro.consumed} of ${macro.goal} grams`}
              />
            </div>
          ))}
        </section>

        <section className="today-meals" aria-labelledby="meals-heading">
          <div className="meals-heading">
            <h2 id="meals-heading">Your meals</h2>
            <span>{mockToday.meals.length} logged</span>
          </div>
          <div className="meal-list">
            {mockToday.meals.map((meal, index) => {
              const Icon = mealIcons[index] ?? Utensils;
              return (
                <details className="meal-row" key={meal.id}>
                  <summary>
                    <Icon className="meal-icon" size={25} aria-hidden="true" />
                    <span className="meal-description">
                      <strong>{meal.name}</strong>
                      <span>{meal.foods}</span>
                    </span>
                    <span className="meal-energy">
                      <strong>{meal.calories}</strong>
                      <span>kcal</span>
                    </span>
                    <ChevronRight className="meal-chevron" size={16} aria-hidden="true" />
                  </summary>
                  <div className="meal-expanded">
                    <p>{meal.foods}</p>
                    <p>Mock meal · {meal.calories} kcal. Portion editing is not available yet.</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
        <a className="log-food" href="/food">
          <Plus size={23} aria-hidden="true" />
          <span>Log food</span>
        </a>
      </main>
      <nav className="today-nav" aria-label="Main navigation">
        <a href="/" aria-current="page">
          <ChartPie size={21} aria-hidden="true" />
          <span>Today</span>
        </a>
        <button disabled title="Diary is coming soon">
          <NotebookText size={21} aria-hidden="true" />
          <span>
            Diary<span className="sr-only">, coming soon</span>
          </span>
        </button>
        <button disabled title="Trends are coming soon">
          <TrendingUp size={21} aria-hidden="true" />
          <span>
            Trends<span className="sr-only">, coming soon</span>
          </span>
        </button>
      </nav>
    </div>
  );
}
