import { test, expect } from "@playwright/test";

// Correct answers for the 10 static backend questions (in order)
const CORRECT_ANSWERS = [
  "Paris",
  "8",
  "1989",
  "Goethe",
  "Au",
  "6",
  "Jupiter",
  "Portugiesisch",
  "206",
  "1912",
];

const TOTAL_QUESTIONS = CORRECT_ANSWERS.length;

test.describe("Practice Quiz", () => {
  test("navigates from landing page to Übungsmodus", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /übung/i }).click();
    await expect(page).toHaveURL(/trainings-modus/);
    await expect(
      page.getByRole("heading", { name: /übungsmodus/i })
    ).toBeVisible();
  });

  test("shows first question after starting quiz", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("completes full quiz with all correct answers and shows perfect score", async ({
    page,
  }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      await expect(
        page.getByText(new RegExp(`frage ${i + 1} / ${TOTAL_QUESTIONS}`, "i"))
      ).toBeVisible({ timeout: 5000 });

      await page
        .getByRole("button", { name: CORRECT_ANSWERS[i], exact: true })
        .click();

      await expect(page.getByText(/✓ Richtig!/)).toBeVisible({ timeout: 5000 });

      const isLastQuestion = i === TOTAL_QUESTIONS - 1;
      const nextButton = page.getByRole("button", {
        name: isLastQuestion ? /ergebnis anzeigen/i : /nächste frage/i,
      });
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      await nextButton.click();
    }

    await expect(
      page.getByText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`)
    ).toBeVisible();
    await expect(page.getByText(/perfekt/i)).toBeVisible();
  });

  test("shows wrong feedback when answer is incorrect", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });

    // Click a wrong answer (London instead of Paris)
    await page.getByRole("button", { name: "London", exact: true }).click();

    await expect(
      page.getByText(/✗ Falsch – richtig wäre: Paris/)
    ).toBeVisible({ timeout: 5000 });
  });

  test("can restart quiz from result screen", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      await expect(
        page.getByText(new RegExp(`frage ${i + 1} / ${TOTAL_QUESTIONS}`, "i"))
      ).toBeVisible({ timeout: 5000 });
      await page
        .getByRole("button", { name: CORRECT_ANSWERS[i], exact: true })
        .click();
      const isLastQuestion = i === TOTAL_QUESTIONS - 1;
      const nextButton = page.getByRole("button", {
        name: isLastQuestion ? /ergebnis anzeigen/i : /nächste frage/i,
      });
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      await nextButton.click();
    }

    await page.getByRole("button", { name: /nochmal spielen/i }).click();

    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("back button navigates to landing page", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /zurück zur startseite/i }).click();
    await expect(page).toHaveURL("/");
  });
});
