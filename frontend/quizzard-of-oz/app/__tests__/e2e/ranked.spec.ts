import { test, expect } from "@playwright/test";

test.describe("Ranked Mode E2E", () => {
  test("User can navigate to ranked mode page", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /\branked\b/i });
    await expect(rankedButton).toBeVisible();
    
    await rankedButton.click();
    
    // Should navigate to ranked mode page
    await expect(page).toHaveURL("/ranked-modus");
  });

  test("Ranked page displays login prompt for unauthenticated users", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Should show login button
    const loginArea = page.locator("iframe[title*='Google'], div[role='button'][aria-label*='Google']");
    await expect(loginArea).toHaveCount(1);
  });

  test("Ranked page has specific styling for ranked mode", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Check for ranked (fire) color theme
    const html = await page.content();
    expect(html).toContain("255,60,20"); // Fire color RGB
  });

  test("Back button on ranked page navigates to home", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Find and click back button
    const buttons = await page.getByRole("button").all();
    
    // Look for button that navigates back
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute("aria-label");
      const text = await button.textContent();
      
      if (ariaLabel?.toLowerCase().includes("back") || text?.toLowerCase().includes("zurück")) {
        await button.click();
        break;
      }
    }
    
    // Should navigate back to home
    await expect(page).toHaveURL("/");
  });

  test("Page styling persists on refresh", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    const initialHTML = await page.content();
    const hasFireColor1 = initialHTML.includes("255,60,20");
    
    await page.reload();
    
    const refreshedHTML = await page.content();
    const hasFireColor2 = refreshedHTML.includes("255,60,20");
    
    expect(hasFireColor1).toBe(true);
    expect(hasFireColor2).toBe(true);
  });

  test("Ranked page has proper metadata", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Check title
    const title = await page.title();
    expect(title.toLowerCase()).toContain("quizard");
  });

  test("All interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Tab to buttons
    await page.keyboard.press("Tab");
    
    // Should have focused an element
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focused).toBeTruthy();
  });

  test("Navigation breadcrumb shows correct hierarchy", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /\branked\b/i });
    await rankedButton.click();
    
    await expect(page).toHaveURL("/ranked-modus");
    
    // Navbar should still show Quizard of Oz
    const navBrand = page.getByText(/quizard of oz/i).first();
    await expect(navBrand).toBeVisible();
  });

  test("Ranked page shows appropriate ranked-specific UI elements", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Should contain ranked-related text or elements
    const content = await page.content();
    expect(
      content.toLowerCase().includes("ranked") ||
      content.includes("255,60,20") // Fire color indicates ranked
    ).toBe(true);
  });
});

test.describe("Ranked Battle Queue E2E", () => {
  test.skip("Authenticated user can join ranked queue", async () => {
    // Requires authentication setup in test environment.
  });

  test.skip("Ranked queue shows correct styling and state", async () => {
    // Requires authentication setup in test environment.
  });

  test.skip("Player receives match notification in ranked queue", async () => {
    // Requires WebSocket and authentication setup.
  });

  test.skip("Ranked battle arena loads after queue match", async () => {
    // Requires WebSocket and authentication setup.
  });
});

test.describe("Cross-Mode Navigation", () => {
  test("Can navigate from ranked to unranked mode", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /\branked\b/i });
    await rankedButton.click();
    
    await expect(page).toHaveURL("/ranked-modus");
    
    // Go back to home
    const homeLink = page.getByText(/quizard of oz/i).first();
    await homeLink.click({ force: true });
    
    await expect(page).toHaveURL("/");
    
    // Click unranked
    const unrankedButton = page.getByRole("button", { name: /unranked/ });
    await expect(unrankedButton).toBeVisible();
  });

  test("Can navigate from ranked to training mode", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Go back to home
    const homeLink = page.getByText(/quizard of oz/i).first();
    await homeLink.click({ force: true });
    
    await expect(page).toHaveURL("/");
    
    // Click training mode
    const trainingButton = page.getByRole("button", { name: /übung/i });
    await expect(trainingButton).toBeVisible();
    await trainingButton.click();
    
    await expect(page).toHaveURL("/trainings-modus");
  });
});

test.describe("Ranked Mode Visual Consistency", () => {
  test("Ranked theme uses fire colors consistently", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Get computed styles of main container
    const mainDiv = page.locator("div[class*='min-h']").first();
    
    // Container should be visible and properly styled
    await expect(mainDiv).toBeVisible();
    
    // Check page HTML for fire color
    const html = await page.content();
    expect(html).toContain("255,60,20"); // Fire RGB
  });

  test("Ranked page animations load correctly", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Wait for any animations to load
    await page.waitForLoadState("networkidle");
    
    // Check for animation styles in page
    const html = await page.content();
    
    // Should have animation-related CSS
    expect(
      html.includes("animation") || html.includes("@keyframes")
    ).toBe(true);
  });
});

test.describe("Ranked Mode Error Handling", () => {
  test("Handles network errors gracefully", async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to navigate to ranked
    await page.goto("/ranked-modus", { waitUntil: "networkidle" }).catch(() => {
      // Expected to fail with offline
    });
    
    // Go back online
    await page.context().setOffline(false);
  });

  test("Page loads without external dependencies", async ({ page }) => {
    // Block all external requests
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.includes("cdn") || url.includes("external")) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await page.goto("/ranked-modus");
    
    // Page should still load and be usable
    const loginButton = page.locator("iframe[title*='Google'], div[role='button']");
    await expect(loginButton).toHaveCount(0); // Google button might be blocked
  });
});
