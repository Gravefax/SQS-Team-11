import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RankedPage from "@/app/ranked-modus/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/stores/authStore", () => ({
  default: () => null,
}));

vi.mock("@/app/components/Queue", () => ({
  default: ({ ranked }: { ranked: boolean }) => (
    <div data-testid="queue">Queue (ranked={String(ranked)})</div>
  ),
}));

vi.mock("@/app/components/login-button/LoginButton", () => ({
  default: () => <div data-testid="login-btn">Login</div>,
}));

describe("RankedPage Tests", () => {
  it("renders the page", () => {
    render(<RankedPage />);
    expect(screen.getByTestId("login-btn")).toBeInTheDocument();
  });

  it("shows login button when not authenticated", () => {
    render(<RankedPage />);
    const loginBtn = screen.getByTestId("login-btn");
    expect(loginBtn).toBeInTheDocument();
  });

  it("displays ranked theme", () => {
    const { container } = render(<RankedPage />);
    const html = container.innerHTML;
    expect(html).toContain("255,60,20");
  });

  it("has responsive layout", () => {
    const { container } = render(<RankedPage />);
    const mainDiv = container.querySelector("[class*='min-h']");
    expect(mainDiv).toBeInTheDocument();
  });

  it("includes animations in styles", () => {
    const { container } = render(<RankedPage />);
    expect(container.innerHTML).toMatch(/shieldPulse|cardReveal|animation/i);
  });
});
