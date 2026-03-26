import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandingPage from "@/app/components/LandingPage";

describe("LandingPage", () => {
  it("renders the main heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /quizard of oz/i })
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/stelle dein wissen auf die probe/i)
    ).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/das ultimative quiz-erlebnis/i)
    ).toBeInTheDocument();
  });

  it("renders the Ranked button", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /\branked\b/i })
    ).toBeInTheDocument();
  });

  it("renders the Unranked button", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /unranked/i })
    ).toBeInTheDocument();
  });

  it("renders the Übung button", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /übung/i })
    ).toBeInTheDocument();
  });

  it("renders exactly 3 game mode buttons", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("Ranked button is clickable", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    await user.click(screen.getByRole("button", { name: /\branked\b/i }));
  });

  it("Unranked button is clickable", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    await user.click(screen.getByRole("button", { name: /unranked/i }));
  });

  it("Übung button is clickable", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    await user.click(screen.getByRole("button", { name: /übung/i }));
  });
});
