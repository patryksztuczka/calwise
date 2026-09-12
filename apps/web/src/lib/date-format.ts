import { parseLocalDate } from "@calwise/food-rules/log";

export function formatLongDate(value: string): string {
  const date = parseLocalDate(value);
  const day = date.getDate();
  const suffix = day >= 11 && day <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${day}${suffix} ${month}, ${date.getFullYear()}`;
}
