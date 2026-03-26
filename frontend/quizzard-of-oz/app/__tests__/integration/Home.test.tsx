import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Home page", () => {
  it("renders the Quizard of Oz heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /quizard of oz/i })
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Home />);
    expect(
      screen.getByText(/stelle dein wissen auf die probe/i)
    ).toBeInTheDocument();
  });

  it("renders all three game mode buttons", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /\branked\b/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unranked/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /übung/i })).toBeInTheDocument();
  });

  it("Ranked button shows login hint", () => {
    render(<Home />);
    expect(screen.getByText(/login erforderlich/i)).toBeInTheDocument();
  });

  it("Unranked button shows free play info", () => {
    render(<Home />);
    expect(screen.getByText(/frei spielen/i)).toBeInTheDocument();
  });

  it("Übung button shows training mode info", () => {
    render(<Home />);
    expect(screen.getByText(/trainingsmodus/i)).toBeInTheDocument();
  });
});
