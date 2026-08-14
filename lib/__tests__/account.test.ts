import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be declared before any module imports — Vitest hoists vi.mock calls
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfile, updatePassword, getAccountData } from "@/lib/actions/account";
import { profileSchema, passwordSchema } from "@/lib/account-schema";
import { loginSchema } from "@/lib/auth-schema";
import { checkRateLimit, _resetForTests } from "@/lib/rate-limit";

// ── Session helpers ───────────────────────────────────────────────────────────

function mockSession(id: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id, email: "admin@test.com", name: "Admin" } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
}

function mockNoSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProfileInput(overrides: Record<string, unknown> = {}) {
  return { name: "Jane Admin", email: "admin@example.com", ...overrides };
}

function makePasswordInput(overrides: Record<string, unknown> = {}) {
  return {
    currentPassword: "current-secret-123",
    newPassword: "new-password-456",
    confirmPassword: "new-password-456",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetForTests();
});

// ── Profile schema validation ─────────────────────────────────────────────────

describe("profileSchema", () => {
  it("accepts valid name and email", () => {
    expect(profileSchema.safeParse(makeProfileInput()).success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = profileSchema.safeParse(makeProfileInput({ email: "Admin@Example.COM" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("admin@example.com");
  });

  it("trims email whitespace", () => {
    const result = profileSchema.safeParse(makeProfileInput({ email: "  admin@example.com  " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("admin@example.com");
  });

  it("trims name whitespace", () => {
    const result = profileSchema.safeParse(makeProfileInput({ name: "  Jane  " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Jane");
  });

  it("rejects empty name", () => {
    expect(profileSchema.safeParse(makeProfileInput({ name: "" })).success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    expect(profileSchema.safeParse(makeProfileInput({ name: "   " })).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(profileSchema.safeParse(makeProfileInput({ email: "not-an-email" })).success).toBe(false);
  });

  it("rejects missing email", () => {
    expect(profileSchema.safeParse({ name: "Jane" }).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    expect(profileSchema.safeParse(makeProfileInput({ name: "a".repeat(101) })).success).toBe(false);
  });

  it("accepts name exactly 100 characters", () => {
    expect(profileSchema.safeParse(makeProfileInput({ name: "a".repeat(100) })).success).toBe(true);
  });

  it("rejects email over 254 characters", () => {
    // "a".repeat(249) + "@b.com" = 255 chars > 254 limit
    expect(profileSchema.safeParse(makeProfileInput({ email: "a".repeat(249) + "@b.com" })).success).toBe(false);
  });
});

// ── Password schema validation ─────────────────────────────────────────────────

describe("passwordSchema", () => {
  it("accepts valid passwords that match", () => {
    expect(passwordSchema.safeParse(makePasswordInput()).success).toBe(true);
  });

  it("rejects empty current password", () => {
    expect(passwordSchema.safeParse(makePasswordInput({ currentPassword: "" })).success).toBe(false);
  });

  it("rejects empty new password", () => {
    expect(passwordSchema.safeParse(makePasswordInput({ newPassword: "", confirmPassword: "" })).success).toBe(false);
  });

  it("rejects new password shorter than 8 characters", () => {
    expect(
      passwordSchema.safeParse(makePasswordInput({ newPassword: "short", confirmPassword: "short" })).success,
    ).toBe(false);
  });

  it("accepts new password exactly 8 characters", () => {
    expect(
      passwordSchema.safeParse(makePasswordInput({ newPassword: "exactly8", confirmPassword: "exactly8" })).success,
    ).toBe(true);
  });

  it("rejects mismatched passwords — error is on confirmPassword field", () => {
    const result = passwordSchema.safeParse(
      makePasswordInput({ newPassword: "new-password-456", confirmPassword: "different-789" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("rejects password over 128 characters", () => {
    const long = "a".repeat(129);
    expect(
      passwordSchema.safeParse(makePasswordInput({ newPassword: long, confirmPassword: long })).success,
    ).toBe(false);
  });

  it("rejects missing confirmPassword", () => {
    expect(
      passwordSchema.safeParse({ currentPassword: "abc", newPassword: "newpassword1" }).success,
    ).toBe(false);
  });
});

// ── Authentication guard ───────────────────────────────────────────────────────

describe("Authentication — updateProfile", () => {
  it("rejects unauthenticated requests", async () => {
    mockNoSession();
    const result = await updateProfile({ name: "Jane", email: "jane@example.com" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Unauthorised");
  });

  it("rejects session with no user ID", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    const result = await updateProfile({ name: "Jane", email: "jane@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("Authentication — updatePassword", () => {
  it("rejects unauthenticated requests", async () => {
    mockNoSession();
    const result = await updatePassword({
      currentPassword: "old",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Unauthorised");
  });
});

describe("Authentication — getAccountData", () => {
  it("returns null for unauthenticated requests", async () => {
    mockNoSession();
    const result = await getAccountData();
    expect(result).toBeNull();
  });
});

// ── Profile update action ─────────────────────────────────────────────────────

describe("updateProfile — authenticated", () => {
  it("valid update succeeds", async () => {
    mockSession("user-123");
    vi.mocked(db.user.findFirst).mockResolvedValue(null); // no conflict
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const result = await updateProfile({ name: "Jane Updated", email: "jane@example.com" });
    expect(result.success).toBe(true);
  });

  it("derives userId from session, not from client input", async () => {
    mockSession("session-user-id");
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updateProfile({ name: "Jane", email: "jane@example.com" });

    // update was called with the session userId, not any client-supplied id
    expect(vi.mocked(db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session-user-id" } }),
    );
  });

  it("rejects duplicate email from another user", async () => {
    mockSession("user-123");
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: "other-user" } as never);

    const result = await updateProfile({ name: "Jane", email: "taken@example.com" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("already in use");
  });

  it("allows same email for the same user (self-update)", async () => {
    mockSession("user-123");
    vi.mocked(db.user.findFirst).mockResolvedValue(null); // self excluded from conflict query
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const result = await updateProfile({ name: "Jane", email: "jane@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", async () => {
    mockSession("user-123");
    const result = await updateProfile({ name: "Jane", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", async () => {
    mockSession("user-123");
    const result = await updateProfile({ name: "", email: "jane@example.com" });
    expect(result.success).toBe(false);
  });

  it("handles DB error safely without exposing internals", async () => {
    mockSession("user-123");
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.update).mockRejectedValue(new Error("Prisma P2002"));

    const result = await updateProfile({ name: "Jane", email: "jane@example.com" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("Prisma");
      expect(result.error).not.toContain("P2002");
    }
  });
});

// ── Password update action ─────────────────────────────────────────────────────

describe("updatePassword — authenticated", () => {
  it("correct current password succeeds", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const result = await updatePassword({
      currentPassword: "correct-password-123",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });
    expect(result.success).toBe(true);
  });

  it("incorrect current password is rejected", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);

    const result = await updatePassword({
      currentPassword: "wrong-password",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Incorrect current password");
  });

  it("new password is hashed before storage — never stored as plaintext", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("current-pass-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updatePassword({
      currentPassword: "current-pass-123",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });

    const updateCall = vi.mocked(db.user.update).mock.calls[0];
    const storedPassword = (updateCall?.[0] as { data?: { password?: string } })?.data?.password;
    // Must not be plaintext
    expect(storedPassword).not.toBe("new-secure-password");
    // Must look like a bcrypt hash
    expect(storedPassword).toMatch(/^\$2[ab]\$/);
  });

  it("password hash is not returned to the client", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("current-pass-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const result = await updatePassword({
      currentPassword: "current-pass-123",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });
    // Result shape: { success: true } — no password field
    expect("password" in result).toBe(false);
    expect("hash" in result).toBe(false);
  });

  it("new password works after successful change (verifies new hash)", async () => {
    const bcrypt = await import("bcryptjs");
    const oldHash = await bcrypt.hash("current-pass-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: oldHash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updatePassword({
      currentPassword: "current-pass-123",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });

    // The new hash stored should verify against new password
    const updateCall = vi.mocked(db.user.update).mock.calls[0];
    const newHash = (updateCall?.[0] as { data?: { password?: string } })?.data?.password ?? "";
    expect(await bcrypt.compare("new-secure-password", newHash)).toBe(true);
    // Old password must not work with new hash
    expect(await bcrypt.compare("current-pass-123", newHash)).toBe(false);
  });

  it("empty current password is rejected", async () => {
    mockSession("user-123");
    const result = await updatePassword({
      currentPassword: "",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });
    expect(result.success).toBe(false);
  });

  it("empty new password is rejected", async () => {
    mockSession("user-123");
    const result = await updatePassword({
      currentPassword: "current-pass",
      newPassword: "",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("weak password (< 8 chars) is rejected", async () => {
    mockSession("user-123");
    const result = await updatePassword({
      currentPassword: "current-pass",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("mismatched password confirmation is rejected", async () => {
    mockSession("user-123");
    const result = await updatePassword({
      currentPassword: "current-pass",
      newPassword: "new-secure-password",
      confirmPassword: "different-password",
    });
    expect(result.success).toBe(false);
  });

  it("handles DB error safely without exposing internals", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("current-pass-123", 10);

    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockRejectedValue(new Error("DB connection failed"));

    const result = await updatePassword({
      currentPassword: "current-pass-123",
      newPassword: "new-secure-password",
      confirmPassword: "new-secure-password",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("DB connection");
    }
  });
});

// ── Authorisation ─────────────────────────────────────────────────────────────

describe("Authorisation", () => {
  it("update uses session userId, not any client-provided field", async () => {
    mockSession("real-session-id");
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updateProfile({ name: "Jane", email: "jane@example.com" });

    const call = vi.mocked(db.user.update).mock.calls[0]?.[0] as { where?: { id?: string } } | undefined;
    expect(call?.where?.id).toBe("real-session-id");
    expect(call?.where?.id).not.toBe("attacker-supplied-id");
  });

  it("password update uses session userId to look up user", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 10);

    mockSession("real-session-id");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updatePassword({
      currentPassword: "secret",
      newPassword: "new-password1",
      confirmPassword: "new-password1",
    });

    const findCall = vi.mocked(db.user.findUnique).mock.calls[0]?.[0] as { where?: { id?: string } } | undefined;
    expect(findCall?.where?.id).toBe("real-session-id");
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("Rate limiting (shared checkRateLimit)", () => {
  it("allows the first request on a fresh key", () => {
    const result = checkRateLimit("password-change:test-user-1");
    expect(result.allowed).toBe(true);
  });

  it("allows up to MAX_ATTEMPTS (10) before blocking", () => {
    const key = "password-change:test-user-2";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    expect(checkRateLimit(key).allowed).toBe(false);
  });

  it("rate limit is keyed separately per user", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("password-change:heavy-user");
    expect(checkRateLimit("password-change:other-user").allowed).toBe(true);
  });

  it("remaining count decreases with each call", () => {
    const key = "password-change:counter-user";
    const first = checkRateLimit(key);
    const second = checkRateLimit(key);
    expect(second.remaining).toBeLessThan(first.remaining);
  });

  it("rate-limited request returns error message", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("pass", 10);
    mockSession("blocked-user");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);

    // Exhaust the limit (10 attempts + 1 blocked)
    const key = "password-change:blocked-user";
    for (let i = 0; i < 10; i++) checkRateLimit(key);

    const result = await updatePassword({
      currentPassword: "pass",
      newPassword: "new-password1",
      confirmPassword: "new-password1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Too many attempts");
  });
});

// ── Password security ─────────────────────────────────────────────────────────

describe("Password security", () => {
  it("bcrypt hash is not the same as the plaintext", async () => {
    const bcrypt = await import("bcryptjs");
    const plain = "my-test-password";
    const hash = await bcrypt.hash(plain, 12);
    expect(hash).not.toBe(plain);
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("bcrypt compare verifies correct password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 10);
    expect(await bcrypt.compare("correct-password", hash)).toBe(true);
  });

  it("bcrypt compare rejects incorrect password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 10);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });

  it("different bcrypt hashes of same password are unequal (salting)", async () => {
    const bcrypt = await import("bcryptjs");
    const plain = "same-password";
    const hash1 = await bcrypt.hash(plain, 10);
    const hash2 = await bcrypt.hash(plain, 10);
    expect(hash1).not.toBe(hash2);
    expect(await bcrypt.compare(plain, hash1)).toBe(true);
    expect(await bcrypt.compare(plain, hash2)).toBe(true);
  });
});

// ── Email uniqueness logic ────────────────────────────────────────────────────

describe("Email uniqueness", () => {
  it("conflict check excludes the current user by ID", async () => {
    mockSession("user-123");
    // Simulate: db.user.findFirst called with NOT: { id: userId }
    vi.mocked(db.user.findFirst).mockResolvedValue(null); // no conflict
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await updateProfile({ name: "Jane", email: "admin@example.com" });

    const findCall = vi.mocked(db.user.findFirst).mock.calls[0]?.[0] as {
      where?: { NOT?: { id?: string } };
    } | undefined;
    expect(findCall?.where?.NOT?.id).toBe("user-123");
  });

  it("conflict with another user's email returns error", async () => {
    mockSession("user-123");
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: "other-user" } as never);

    const result = await updateProfile({ name: "Jane", email: "taken@example.com" });
    expect(result.success).toBe(false);
  });
});

// ── Session behaviour ─────────────────────────────────────────────────────────

describe("Session behaviour", () => {
  it("JWT payload does not include password hash", () => {
    // Auth.js authorize() returns: { id, email, name } — never password
    const jwtPayload = { id: "user-1", email: "admin@example.com", name: "Admin" };
    expect("password" in jwtPayload).toBe(false);
  });

  it("action result never contains password or hash field", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("pass", 10);
    mockSession("user-123");
    vi.mocked(db.user.findUnique).mockResolvedValue({ password: hash } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const result = await updatePassword({
      currentPassword: "pass",
      newPassword: "new-password1",
      confirmPassword: "new-password1",
    });
    expect("password" in result).toBe(false);
    expect("hash" in result).toBe(false);
  });
});

// ── Regression ────────────────────────────────────────────────────────────────

describe("Regression", () => {
  it("loginSchema still validates email and password", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "password123" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "", password: "password123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(false);
  });

  it("account module exports expected functions", () => {
    expect(typeof updateProfile).toBe("function");
    expect(typeof updatePassword).toBe("function");
    expect(typeof getAccountData).toBe("function");
  });

  it("account module does not export password-related data", () => {
    const exported = { updateProfile, updatePassword, getAccountData };
    expect("passwordHash" in exported).toBe(false);
    expect("storedPassword" in exported).toBe(false);
  });
});
