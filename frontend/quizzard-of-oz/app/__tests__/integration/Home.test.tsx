import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

// next/image is not available in jsdom — replace with a plain <img>
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

describe("Home page", () => {
  it("renders the getting-started heading", () => {
    render(<Home />);
    expect(
      screen.getByText(/to get started, edit the page\.tsx file/i)
    ).toBeInTheDocument();
  });

  it("renders a link to the documentation", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: /documentation/i })
    ).toBeInTheDocument();
  });

  it("renders the Next.js logo image", () => {
    render(<Home />);
    expect(screen.getByAltText(/next\.js logo/i)).toBeInTheDocument();
  });
});
