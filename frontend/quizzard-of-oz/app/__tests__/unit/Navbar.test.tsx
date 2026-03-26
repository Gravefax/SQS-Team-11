import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/app/Navbar";

describe("Navbar", () => {
  it("renders the brand name", () => {
    render(<Navbar />);
    expect(screen.getByText(/quizard of oz/i)).toBeInTheDocument();
  });

  it("renders the login button when not logged in", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("opens the login menu after clicking login", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(screen.getByRole("menu", { name: /login-menue/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /mit google anmelden/i })).toBeInTheDocument();
  });

  it("shows username after confirming login from menu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByRole("button", { name: /login/i }));
    await user.click(screen.getByRole("menuitem", { name: /mit google anmelden/i }));

    expect(screen.getByRole("button", { name: /dummyuser/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^login$/i })).not.toBeInTheDocument();
  });

  it("shows login button again after clicking username (logout)", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByRole("button", { name: /login/i }));
    await user.click(screen.getByRole("menuitem", { name: /mit google anmelden/i }));
    await user.click(screen.getByRole("button", { name: /dummyuser/i }));
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dummyuser/i })).not.toBeInTheDocument();
  });
});
