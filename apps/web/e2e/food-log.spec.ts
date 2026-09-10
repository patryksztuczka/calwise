import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiUrl } from "./urls.ts";

async function signUp(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`food-log-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill("correct horse battery");
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
}
interface LogRequest {
  readonly id?: string;
  readonly barcode?: string;
  readonly amount?: number | string;
  readonly unit?: string;
  readonly date?: string;
  readonly meal?: string;
}
const mutate = (
  request: APIRequestContext,
  method: "add" | "update" | "remove",
  input: LogRequest,
) => request.post(`${apiUrl}/trpc/foodLog.${method}`, { data: input });
const query = (request: APIRequestContext, method: "day" | "entry", input: LogRequest) =>
  request.get(`${apiUrl}/trpc/foodLog.${method}`, { params: { input: JSON.stringify(input) } });

test("logs, reloads, edits, moves, undoes and removes food through the designed flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page);
  await page.getByRole("button", { name: /Lunch/ }).click();
  await page.getByRole("link", { name: "ADD FOOD", exact: true }).click();
  await page.getByRole("searchbox").fill("zolty ser");
  await page.getByRole("button", { name: /Żółty ser testowy/ }).click();
  await expect(page.getByLabel("AMOUNT", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "ADD TO LUNCH" })).toBeDisabled();
  await page.getByLabel("AMOUNT", { exact: true }).fill("150");
  await expect(page.getByText("525", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ADD TO LUNCH" }).click();
  await expect(page.getByText("Żółty ser testowy added", { exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("zolty ser");
  await page.getByRole("link", { name: "DONE · 1 FOODS ADDED" }).click();
  await expect(page.getByText("1 entry", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: /Żółty ser testowy/ }).click();
  await page.getByLabel("AMOUNT", { exact: true }).fill("50.5");
  await page.getByRole("combobox", { name: "UNIT", exact: true }).selectOption("ml");
  await expect(page.getByText("176.8", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "SAVE CHANGES" }).click();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Move to…" }).click();
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await page.getByRole("button", { name: "Change log date" }).click();
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const pastDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
  await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await page.getByRole("button", { name: pastDate, exact: true }).click();
  await page.getByRole("button", { name: /^USE / }).click();
  await page.getByRole("button", { name: "USE DINNER" }).click();
  await expect(page.getByText(`Moved to Dinner · ${pastDate}`, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Move undone", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("AMOUNT", { exact: true })).toHaveValue("50.5");
  await expect(page.getByRole("combobox", { name: "UNIT", exact: true })).toHaveValue("ml");
  await page.getByRole("button", { name: "Remove food", exact: true }).click();
  await page.getByRole("button", { name: "Confirm removal" }).click();
  await expect(page.getByText("No food logged yet.", { exact: true })).toBeVisible();
});

test("changing the overview date preserves unrelated search params", async ({ page }) => {
  await signUp(page);
  await page.goto("/?date=2026-01-02&keep=value");
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(page).toHaveURL(/date=2026-01-01/);
  await expect(page).toHaveURL(/keep=value/);
});

test("requires a meal, keeps duplicate additions separate and undoes only one", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("link", { name: "LOG FOOD", exact: true }).click();
  await page.getByRole("button", { name: /ADDING TO Choose meal/ }).click();
  await page.getByRole("button", { name: "Snacks", exact: true }).click();
  await page.getByRole("button", { name: "USE SNACKS" }).click();
  await expect(page).toHaveURL(/meal=snacks/);
  await page.getByRole("searchbox").fill("zolty ser");
  await expect(page).toHaveURL(/meal=snacks/);
  async function addSnack(amount: string) {
    await page.getByRole("button", { name: /Żółty ser testowy/ }).click();
    await page.getByLabel("AMOUNT", { exact: true }).fill(amount);
    await page.getByRole("button", { name: "ADD TO SNACKS" }).click();
    await expect(page.getByRole("button", { name: /Żółty ser testowy/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  await addSnack("100");
  await addSnack("50");
  await expect(page.getByRole("link", { name: "DONE · 2 FOODS ADDED" })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("link", { name: "DONE · 1 FOODS ADDED" }).click();
  await expect(page.getByText("350 kcal · 100 g", { exact: true })).toBeVisible();
  await expect(page.getByText("1 entry", { exact: true })).toBeVisible();
});

test("validates log mutations, isolates accounts, and makes retries idempotent in D1", async ({
  page,
  request,
}) => {
  const input = {
    id: crypto.randomUUID(),
    barcode: "0000000000001",
    amount: 100,
    unit: "g",
    date: "2026-01-02",
    meal: "lunch",
  };
  expect((await mutate(request, "add", input)).status()).toBe(401);
  await signUp(page);
  const owner = page.request;
  await Promise.all(
    [
      { amount: 0 },
      { amount: -1 },
      { amount: Number.MAX_VALUE },
      { amount: "100" },
      { unit: "container" },
      { date: "2026-02-30" },
      { date: "2999-01-01" },
      { meal: "brunch" },
    ].map(async (patch) => {
      expect((await mutate(owner, "add", { ...input, ...patch })).status()).toBe(400);
    }),
  );
  expect((await mutate(owner, "add", { ...input, barcode: "9999999999999" })).status()).toBe(404);
  const added = await mutate(owner, "add", input);
  expect(added.ok()).toBe(true);
  expect(await added.json()).toMatchObject({
    result: { data: { id: input.id, name: "Żółty ser testowy", energyKcal100g: 350 } },
  });
  expect((await mutate(owner, "add", input)).ok()).toBe(true);
  const reused = await mutate(owner, "add", { ...input, amount: 200 });
  expect(reused.ok()).toBe(true);
  expect(await reused.json()).toMatchObject({ result: { data: { id: input.id, amount: 100 } } });
  const day = await (await query(owner, "day", { date: input.date })).json();
  expect(day.result.data).toHaveLength(1);
  expect(day.result.data[0]).not.toHaveProperty("userId");
  const second = { ...input, id: crypto.randomUUID() };
  expect((await mutate(owner, "add", second)).ok()).toBe(true);
  expect((await (await query(owner, "day", { date: input.date })).json()).result.data).toHaveLength(
    2,
  );
  expect(
    (
      await mutate(owner, "update", {
        ...input,
        date: "2026-01-03",
        meal: "dinner",
        amount: 250,
        unit: "ml",
      })
    ).ok(),
  ).toBe(true);
  const moved = await (await query(owner, "entry", { id: input.id })).json();
  expect(moved.result.data).toMatchObject({
    amount: 250,
    unit: "ml",
    date: "2026-01-03",
    meal: "dinner",
    energyKcal100g: 350,
  });
  const ownerCookies = await page.context().cookies();
  await page.context().clearCookies();
  await signUp(page);
  expect((await query(page.request, "entry", { id: input.id })).status()).toBe(404);
  expect((await mutate(page.request, "update", input)).status()).toBe(404);
  await mutate(page.request, "remove", { id: input.id });
  expect(
    (await (await query(page.request, "day", { date: input.date })).json()).result.data,
  ).toEqual([]);
  await page.context().clearCookies();
  await page.context().addCookies(ownerCookies);
  expect((await query(page.request, "entry", { id: input.id })).ok()).toBe(true);
});
