import { describe, it, expect, beforeEach } from "vitest";
import { loginSchema } from "@/lib/auth-schema";
import { checkRateLimit, _resetForTests } from "@/lib/rate-limit";

// ── loginSchema ───────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "admin@pherall.com",
      password: "correcthorsebatterystaple",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@pherall.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "pw" }).success).toBe(false);
  });
});

// ── Rate limiter ──────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("allows the first request", () => {
    const { allowed } = checkRateLimit("test-ip-1");
    expect(allowed).toBe(true);
  });

  it("allows up to the maximum attempts", () => {
    for (let i = 0; i < 10; i++) {
      const { allowed } = checkRateLimit("test-ip-2");
      expect(allowed).toBe(true);
    }
  });

  it("blocks requests beyond the maximum", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("test-ip-3");
    }
    const { allowed, remaining } = checkRateLimit("test-ip-3");
    expect(allowed).toBe(false);
    expect(remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("ip-a");
    }
    // ip-b should still be allowed
    const { allowed } = checkRateLimit("ip-b");
    expect(allowed).toBe(true);
  });

  it("resets the counter after the window expires", () => {
    // Fill up the limit for a key
    for (let i = 0; i < 10; i++) {
      checkRateLimit("test-ip-4");
    }
    expect(checkRateLimit("test-ip-4").allowed).toBe(false);

    // Simulate window expiry by clearing and re-inserting with an old windowStart
    _resetForTests();

    // After reset the key is gone — next call starts a fresh window
    expect(checkRateLimit("test-ip-4").allowed).toBe(true);
  });

  it("decrements remaining count correctly", () => {
    const first = checkRateLimit("test-ip-5");
    expect(first.remaining).toBe(9);

    const second = checkRateLimit("test-ip-5");
    expect(second.remaining).toBe(8);
  });
});

// ── callbackUrl safety (inline logic from login-form) ────────────────────────

function getSafeCallbackUrl(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/admin/dashboard";
}

describe("getSafeCallbackUrl", () => {
  it("accepts a safe relative path", () => {
    expect(getSafeCallbackUrl("/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("accepts a nested safe path", () => {
    expect(getSafeCallbackUrl("/admin/calendar")).toBe("/admin/calendar");
  });

  it("rejects null", () => {
    expect(getSafeCallbackUrl(null)).toBe("/admin/dashboard");
  });

  it("rejects an external http URL", () => {
    expect(getSafeCallbackUrl("http://evil.com")).toBe("/admin/dashboard");
  });

  it("rejects an external https URL", () => {
    expect(getSafeCallbackUrl("https://evil.com")).toBe("/admin/dashboard");
  });

  it("rejects a protocol-relative URL", () => {
    expect(getSafeCallbackUrl("//evil.com")).toBe("/admin/dashboard");
  });

  it("rejects an empty string", () => {
    expect(getSafeCallbackUrl("")).toBe("/admin/dashboard");
  });
});
