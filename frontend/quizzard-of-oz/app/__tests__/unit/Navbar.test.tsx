import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/app/Navbar";

describe("Navbar", () => {
  it("renders the brand name", () => {
    render(<Navbar />);
    expect(screen.getByText(/quizard of oz/i)).toBeInTheDocument();
  });

  it("renders the login button", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("login button is clickable without throwing", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    const btn = screen.getByRole("button", { name: /login/i });
    await user.click(btn);
    expect(btn).toBeInTheDocument();
  });
});
