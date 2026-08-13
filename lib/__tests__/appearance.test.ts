import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  appearanceColorsSchema,
  appearanceDataSchema,
  parseAppearanceData,
  detectImageMime,
  ALLOWED_FONTS,
  DEFAULT_COLORS,
  buildDataUrl,
} from "@/lib/appearance-schemas";

// ── Colour validation ──────────────────────────────────────────────────────────

describe("appearanceColorsSchema", () => {
  it("accepts valid 6-digit hex colours", () => {
    const result = appearanceColorsSchema.safeParse({
      "--primary": "#c8a882",
      "--secondary": "#f5f0eb",
      "--accent": "#a67c52",
      "--background": "#ffffff",
      "--foreground": "#1a1a1a",
      "--button": "#c8a882",
      "--button-foreground": "#ffffff",
    });
    expect(result.success).toBe(true);
  });

  it("accepts uppercase hex colours", () => {
    const result = appearanceColorsSchema.safeParse({
      "--primary": "#C8A882",
      "--secondary": "#F5F0EB",
      "--accent": "#A67C52",
      "--background": "#FFFFFF",
      "--foreground": "#1A1A1A",
      "--button": "#C8A882",
      "--button-foreground": "#FFFFFF",
    });
    expect(result.success).toBe(true);
  });

  it("rejects 3-digit shorthand hex", () => {
    const result = appearanceColorsSchema.safeParse({
      "--primary": "#abc",
      "--secondary": "#f5f5f5",
      "--accent": "#f5f5f5",
      "--background": "#ffffff",
      "--foreground": "#1a1a1a",
      "--button": "#1a1a1a",
      "--button-foreground": "#ffffff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects values without # prefix", () => {
    const result = appearanceColorsSchema.safeParse({
      "--primary": "c8a882",
      "--secondary": "#f5f5f5",
      "--accent": "#f5f5f5",
      "--background": "#ffffff",
      "--foreground": "#1a1a1a",
      "--button": "#1a1a1a",
      "--button-foreground": "#ffffff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects CSS injection attempts", () => {
    const result = appearanceColorsSchema.safeParse({
      "--primary": "#123456; --secondary: red",
      "--secondary": "#f5f5f5",
      "--accent": "#f5f5f5",
      "--background": "#ffffff",
      "--foreground": "#1a1a1a",
      "--button": "#1a1a1a",
      "--button-foreground": "#ffffff",
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults when object is empty", () => {
    const result = appearanceColorsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["--primary"]).toBe(DEFAULT_COLORS["--primary"]);
      expect(result.data["--background"]).toBe(DEFAULT_COLORS["--background"]);
    }
  });
});

// ── Font validation ────────────────────────────────────────────────────────────

describe("appearanceDataSchema — font", () => {
  it("accepts all allowed font keys", () => {
    for (const font of ALLOWED_FONTS) {
      const result = appearanceDataSchema.safeParse({ font });
      expect(result.success).toBe(true);
    }
  });

  it("rejects arbitrary font names", () => {
    const result = appearanceDataSchema.safeParse({ font: "Times New Roman" });
    expect(result.success).toBe(false);
  });

  it("rejects empty font string", () => {
    const result = appearanceDataSchema.safeParse({ font: "" });
    expect(result.success).toBe(false);
  });

  it("defaults to geist when font is omitted", () => {
    const result = appearanceDataSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.font).toBe("geist");
  });
});

// ── parseAppearanceData helper ─────────────────────────────────────────────────

describe("parseAppearanceData", () => {
  it("returns defaults for null input", () => {
    const data = parseAppearanceData(null);
    expect(data.font).toBe("geist");
    expect(data.colors["--background"]).toBe(DEFAULT_COLORS["--background"]);
    expect(data.faviconUrl).toBe("");
  });

  it("returns defaults for empty object", () => {
    const data = parseAppearanceData({});
    expect(data.font).toBe("geist");
  });

  it("preserves saved colour values", () => {
    const raw = {
      colors: {
        "--primary": "#c8a882",
        "--secondary": "#f5f0eb",
        "--accent": "#a67c52",
        "--background": "#fffdf9",
        "--foreground": "#1a1a1a",
        "--button": "#c8a882",
        "--button-foreground": "#ffffff",
      },
      font: "playfair",
      faviconUrl: "",
    };
    const data = parseAppearanceData(raw);
    expect(data.colors["--primary"]).toBe("#c8a882");
    expect(data.font).toBe("playfair");
  });

  it("falls back to defaults when colours contain invalid values", () => {
    const raw = { colors: { "--primary": "not-a-hex" }, font: "geist" };
    const data = parseAppearanceData(raw);
    // Should not throw; falls back to full defaults
    expect(data.font).toBe("geist");
  });
});

// ── Image magic byte detection ─────────────────────────────────────────────────

describe("detectImageMime", () => {
  it("detects JPEG by magic bytes", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectImageMime(bytes)).toBe("image/jpeg");
  });

  it("detects PNG by magic bytes", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMime(bytes)).toBe("image/png");
  });

  it("detects WebP by magic bytes", () => {
    const bytes = new Uint8Array([
      // RIFF
      0x52, 0x49, 0x46, 0x46,
      // file size (4 bytes, arbitrary)
      0x00, 0x00, 0x00, 0x00,
      // WEBP
      0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageMime(bytes)).toBe("image/webp");
  });

  it("returns null for PDF (not an allowed image type)", () => {
    // PDF magic bytes: %PDF
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    expect(detectImageMime(bytes)).toBeNull();
  });

  it("returns null for executable (ELF binary)", () => {
    const bytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    expect(detectImageMime(bytes)).toBeNull();
  });

  it("returns null for empty byte array", () => {
    expect(detectImageMime(new Uint8Array([]))).toBeNull();
  });

  it("returns null for truncated buffer that cannot be identified", () => {
    // Only 2 bytes — can't match any signature
    expect(detectImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

// ── buildDataUrl ───────────────────────────────────────────────────────────────

describe("buildDataUrl", () => {
  it("builds a valid data URL", () => {
    const url = buildDataUrl("image/jpeg", "abc123");
    expect(url).toBe("data:image/jpeg;base64,abc123");
  });

  it("builds a PNG data URL", () => {
    const url = buildDataUrl("image/png", "xyz==");
    expect(url).toBe("data:image/png;base64,xyz==");
  });
});

// ── Server action auth guard ───────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    businessSettings: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    siteContent: { findUnique: vi.fn(), upsert: vi.fn() },
    faq: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: -1 } }),
    },
    policy: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("appearance server actions — auth guard", () => {
  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue(null as any);
  });

  it("saveAppearanceSettings returns Unauthorised when not logged in", async () => {
    const { saveAppearanceSettings } = await import("@/lib/actions/appearance");
    const result = await saveAppearanceSettings({
      colors: {
        "--primary": "#1a1a1a",
        "--secondary": "#f5f5f5",
        "--accent": "#f5f5f5",
        "--background": "#ffffff",
        "--foreground": "#1a1a1a",
        "--button": "#1a1a1a",
        "--button-foreground": "#ffffff",
      },
      font: "geist",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("uploadLogoImage returns Unauthorised when not logged in", async () => {
    const { uploadLogoImage } = await import("@/lib/actions/appearance");
    const formData = new FormData();
    const result = await uploadLogoImage(formData);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("uploadFaviconImage returns Unauthorised when not logged in", async () => {
    const { uploadFaviconImage } = await import("@/lib/actions/appearance");
    const formData = new FormData();
    const result = await uploadFaviconImage(formData);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("uploadCmsImage returns Unauthorised when not logged in", async () => {
    const { uploadCmsImage } = await import("@/lib/actions/appearance");
    const formData = new FormData();
    const result = await uploadCmsImage(formData, "hero");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });
});
