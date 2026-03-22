import { describe, it, expect } from "vitest";
import { formatScore } from "@/app/lib/formatScore";

describe("formatScore", () => {
  it("returns 100% when all answers are correct", () => {
    expect(formatScore(10, 10)).toBe("100%");
  });

  it("returns 0% when no answers are correct", () => {
    expect(formatScore(0, 10)).toBe("0%");
  });

  it("rounds to the nearest percent", () => {
    expect(formatScore(1, 3)).toBe("33%");
  });

  it("returns 0% when total is zero", () => {
    expect(formatScore(0, 0)).toBe("0%");
  });
});
