import { describe, it, expect } from "vitest";

describe("Phase 1 — test environment", () => {
  it("vitest is configured correctly", () => {
    expect(true).toBe(true);
  });

  it("can perform basic assertions", () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });
});
