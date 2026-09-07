import { expect, test, type Page } from "@playwright/test";

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const password = "correct horse battery";

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
}

test("sends anonymous visitors from Today to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "WELCOME BACK." })).toBeVisible();
});

test("creates an account without verification and opens Today", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("KCAL EATEN", { exact: true })).toBeVisible();
});

test("signs in with an existing account and keeps the session across reloads", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await context.clearCookies();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "SIGN IN" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
});

test("rejects a wrong password and stays on sign in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByRole("textbox", { name: "Password" }).fill("not the password");
  await page.getByRole("button", { name: "SIGN IN" }).click();
  await expect(page.getByTestId("auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("toggles password visibility", async ({ page }) => {
  await page.goto("/sign-in");
  const field = page.getByRole("textbox", { name: "Password" });
  await expect(field).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
});
