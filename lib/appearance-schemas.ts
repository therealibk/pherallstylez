import { z } from "zod";

// ── Font registry ──────────────────────────────────────────────────────────────

export const ALLOWED_FONTS = ["geist", "inter", "playfair", "lora", "cormorant"] as const;
export type FontKey = (typeof ALLOWED_FONTS)[number];

export const FONT_LABELS: Record<FontKey, string> = {
  geist: "Geist Sans",
  inter: "Inter",
  playfair: "Playfair Display",
  lora: "Lora",
  cormorant: "Cormorant Garamond",
};

// CSS variable name for each font key (declared via next/font on <html>)
export const FONT_VAR_NAMES: Record<FontKey, string> = {
  geist: "--font-geist-sans",
  inter: "--font-inter",
  playfair: "--font-playfair",
  lora: "--font-lora",
  cormorant: "--font-cormorant",
};

// ── Colour variables ───────────────────────────────────────────────────────────

export const COLOR_VAR_NAMES = [
  "--primary",
  "--secondary",
  "--accent",
  "--background",
  "--foreground",
  "--button",
  "--button-foreground",
  "--admin-sidebar",
] as const;

export type ColorVarName = (typeof COLOR_VAR_NAMES)[number];

export const COLOR_LABELS: Record<ColorVarName, string> = {
  "--primary": "Primary",
  "--secondary": "Secondary",
  "--accent": "Accent",
  "--background": "Background",
  "--foreground": "Foreground (text)",
  "--button": "Button background",
  "--button-foreground": "Button text",
  "--admin-sidebar": "Admin sidebar",
};

// Defaults that approximate the current globals.css OKLCH values in hex
export const DEFAULT_COLORS: Record<ColorVarName, string> = {
  "--primary": "#2d2d2d",
  "--secondary": "#f5f5f5",
  "--accent": "#f5f5f5",
  "--background": "#ffffff",
  "--foreground": "#1a1a1a",
  "--button": "#1a1a1a",
  "--button-foreground": "#ffffff",
  "--admin-sidebar": "#1a1a1a",
};

// Public-site colour vars (applied in public layout)
export const PUBLIC_COLOR_VAR_NAMES = COLOR_VAR_NAMES.filter(
  (v) => v !== "--admin-sidebar",
) as Exclude<ColorVarName, "--admin-sidebar">[];

// ── Zod schemas ────────────────────────────────────────────────────────────────

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour (e.g. #c8a882)");

export const appearanceColorsSchema = z.object({
  "--primary": hexColorSchema.default(DEFAULT_COLORS["--primary"]),
  "--secondary": hexColorSchema.default(DEFAULT_COLORS["--secondary"]),
  "--accent": hexColorSchema.default(DEFAULT_COLORS["--accent"]),
  "--background": hexColorSchema.default(DEFAULT_COLORS["--background"]),
  "--foreground": hexColorSchema.default(DEFAULT_COLORS["--foreground"]),
  "--button": hexColorSchema.default(DEFAULT_COLORS["--button"]),
  "--button-foreground": hexColorSchema.default(DEFAULT_COLORS["--button-foreground"]),
  "--admin-sidebar": hexColorSchema.default(DEFAULT_COLORS["--admin-sidebar"]),
});

export type AppearanceColors = z.infer<typeof appearanceColorsSchema>;

export const appearanceDataSchema = z.object({
  colors: appearanceColorsSchema.default({ ...DEFAULT_COLORS }),
  font: z.enum(ALLOWED_FONTS).default("geist"),
  faviconUrl: z.string().default(""),
});

export type AppearanceData = z.infer<typeof appearanceDataSchema>;

export function parseAppearanceData(raw: unknown): AppearanceData {
  // pg may return Json fields as a raw string rather than a parsed object
  const data = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
  const result = appearanceDataSchema.safeParse(data);
  return result.success
    ? result.data
    : {
        colors: { ...DEFAULT_COLORS },
        font: "geist",
        faviconUrl: "",
      };
}

// ── Image validation ───────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const IMAGE_SIZE_LIMITS = {
  logo: 512 * 1024,       // 512 KB
  favicon: 256 * 1024,    // 256 KB
  hero: 2 * 1024 * 1024,  // 2 MB
  about: 2 * 1024 * 1024, // 2 MB
} as const;

export type ImageUploadType = keyof typeof IMAGE_SIZE_LIMITS;

// Detects MIME type by inspecting magic bytes — never trusts client-reported MIME.
export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  // WebP: RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export function buildDataUrl(mime: AllowedImageMime, base64: string): string {
  return `data:${mime};base64,${base64}`;
}
