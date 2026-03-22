import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and shows the getting-started heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /to get started/i })
    ).toBeVisible();
  });

  test("has a working Documentation link", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /documentation/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /nextjs\.org\/docs/);
  });

  test("page title is set", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/create next app/i);
  });
});
