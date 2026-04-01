import { test, expect, Page } from "@playwright/test";

const googleLoginLocator =
  "iframe[title*='Google'], div[role='button'][aria-label*='Google']";

async function mockLoggedInSession(page: Page) {
  await page.route("**/auth/google/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "user@example.com",
        username: "DummyUser",
        expires_at: 9999999999,
      }),
    });
  });
}

test.describe("Navbar Auth Menü", () => {
  test("zeigt LoginButton im ausgeloggten Zustand", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(googleLoginLocator)).toHaveCount(1);
  });

  test("versteckt LoginButton und zeigt User-Menü im eingeloggten Zustand", async ({ page }) => {
    await mockLoggedInSession(page);

    await page.goto("/");

    await expect(page.getByRole("button", { name: /dummyuser/i })).toBeVisible();
    await expect(page.locator(googleLoginLocator)).toHaveCount(0);
  });

  test("öffnet und schließt das User-Menü", async ({ page }) => {
    await mockLoggedInSession(page);
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /dummyuser/i });

    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /einstellungen/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /einstellungen/i })).toBeHidden();

    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

    await page.getByText(/quizzard of oz/i).first().click();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeHidden();
  });

  test("meldet über Menüpunkt Abmelden ab", async ({ page }) => {
    await mockLoggedInSession(page);

    let logoutCalls = 0;
    await page.route("**/auth/logout", async (route) => {
      logoutCalls += 1;
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/");

    await page.getByRole("button", { name: /dummyuser/i }).click();
    await page.getByRole("menuitem", { name: /abmelden/i }).click();

    await expect.poll(() => logoutCalls).toBe(1);
    await expect(page.getByRole("button", { name: /dummyuser/i })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toHaveCount(0);
  });
});


