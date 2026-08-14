import { z } from "zod";

// ── URL safety ────────────────────────────────────────────────────────────────

const SAFE_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SAFE_PROTOCOLS.has(u.protocol);
  } catch {
    // Relative URLs (no protocol) — allow
    return url.startsWith("/") || url.startsWith("#");
  }
}

// ── TipTap JSON types ─────────────────────────────────────────────────────────

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

export interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}

// ── Detection ─────────────────────────────────────────────────────────────────

export function isRichTextJson(content: string): boolean {
  if (!content.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(content);
    return (
      parsed !== null &&
      typeof parsed === "object" &&
      parsed.type === "doc" &&
      Array.isArray(parsed.content)
    );
  } catch {
    return false;
  }
}

export function parseRichText(content: string): TipTapDoc | null {
  if (!isRichTextJson(content)) return null;
  try {
    return JSON.parse(content) as TipTapDoc;
  } catch {
    return null;
  }
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const markSchema: z.ZodType<TipTapMark> = z.lazy(() =>
  z.object({
    type: z.string().max(50),
    attrs: z.record(z.string(), z.unknown()).optional(),
  }),
);

const nodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.object({
    type: z.string().max(50),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).max(500).optional(),
    marks: z.array(markSchema).max(20).optional(),
    text: z.string().max(50_000).optional(),
  }),
);

export const richTextDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(nodeSchema).max(500),
});

/** Extracts plain text from either a plain string or a TipTap JSON string. */
export function plainTextFromRichText(content: string): string {
  if (!isRichTextJson(content)) return content;
  try {
    const doc = JSON.parse(content) as TipTapDoc;
    const parts: string[] = [];
    function extract(node: TipTapNode) {
      if (node.type === "text") parts.push(node.text ?? "");
      else if (node.content) node.content.forEach(extract);
    }
    doc.content.forEach(extract);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return content;
  }
}

/** Accepts plain text strings OR serialised TipTap JSON. */
export const richTextFieldSchema = z
  .string()
  .max(200_000)
  .refine(
    (val) => {
      if (!isRichTextJson(val)) return true;
      const parsed = JSON.parse(val);
      return richTextDocSchema.safeParse(parsed).success;
    },
    { message: "Invalid rich text content" },
  );
