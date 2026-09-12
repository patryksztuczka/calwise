import { describe, expect, it } from "vite-plus/test";
import { formatLongDate } from "./date-format";

describe("formatLongDate", () => {
  it.each([
    ["2026-09-10", "10th September, 2026"],
    ["2026-06-01", "1st June, 2026"],
    ["2026-06-02", "2nd June, 2026"],
    ["2026-06-03", "3rd June, 2026"],
    ["2026-06-11", "11th June, 2026"],
    ["2026-06-12", "12th June, 2026"],
    ["2026-06-13", "13th June, 2026"],
    ["2026-06-21", "21st June, 2026"],
    ["2026-06-22", "22nd June, 2026"],
    ["2026-06-23", "23rd June, 2026"],
    ["2026-12-31", "31st December, 2026"],
  ])("formats %s as %s", (date, expected) => {
    expect(formatLongDate(date)).toBe(expected);
  });
});
