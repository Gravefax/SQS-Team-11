import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows the Quizard of Oz heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /quizard of oz/i })
    ).toBeVisible();
  });

  test("page title is set correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/quizard of oz/i);
  });

  test("navbar shows the brand name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/quizard of oz/i).first()).toBeVisible();
  });

  test("navbar shows the login button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
  });

  test("shows the subtitle", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/stelle dein wissen auf die probe/i)
    ).toBeVisible();
  });

  test("shows all three game mode buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /ranked/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /unranked/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /übung/i })).toBeVisible();
  });

  test("Ranked button is prominent above the other two", async ({ page }) => {
    await page.goto("/");
    const ranked = page.getByRole("button", { name: /ranked/i });
    const unranked = page.getByRole("button", { name: /unranked/i });
    const rankedBox = await ranked.boundingBox();
    const unrankedBox = await unranked.boundingBox();
    expect(rankedBox!.y).toBeLessThan(unrankedBox!.y);
  });
});
