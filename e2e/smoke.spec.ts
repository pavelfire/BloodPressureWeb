import { expect, test } from "@playwright/test";

test("renders auth screen for unauthenticated user", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});
