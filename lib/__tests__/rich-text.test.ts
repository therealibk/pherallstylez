import { describe, it, expect } from "vitest";
import {
  isSafeUrl,
  isRichTextJson,
  parseRichText,
  plainTextFromRichText,
  richTextFieldSchema,
} from "@/lib/rich-text";

// ── isSafeUrl ─────────────────────────────────────────────────────────────────

describe("isSafeUrl", () => {
  it("allows https", () => expect(isSafeUrl("https://example.com")).toBe(true));
  it("allows http", () => expect(isSafeUrl("http://example.com")).toBe(true));
  it("allows mailto", () => expect(isSafeUrl("mailto:hello@example.com")).toBe(true));
  it("allows tel", () => expect(isSafeUrl("tel:+442012345678")).toBe(true));
  it("allows root-relative paths", () => expect(isSafeUrl("/about")).toBe(true));
  it("allows hash links", () => expect(isSafeUrl("#section")).toBe(true));
  it("blocks javascript:", () => expect(isSafeUrl("javascript:alert(1)")).toBe(false));
  it("blocks data:", () => expect(isSafeUrl("data:text/html,<h1>x</h1>")).toBe(false));
  it("blocks vbscript:", () => expect(isSafeUrl("vbscript:MsgBox(1)")).toBe(false));
});

// ── isRichTextJson ────────────────────────────────────────────────────────────

const validDoc = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
});

const emptyDoc = JSON.stringify({ type: "doc", content: [] });

describe("isRichTextJson", () => {
  it("returns true for a valid TipTap doc", () => {
    expect(isRichTextJson(validDoc)).toBe(true);
  });

  it("returns true for an empty doc", () => {
    expect(isRichTextJson(emptyDoc)).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isRichTextJson("Hello world")).toBe(false);
  });

  it("returns false for other JSON", () => {
    expect(isRichTextJson(JSON.stringify({ foo: "bar" }))).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRichTextJson("")).toBe(false);
  });

  it("returns false for broken JSON", () => {
    expect(isRichTextJson("{broken")).toBe(false);
  });
});

// ── parseRichText ─────────────────────────────────────────────────────────────

describe("parseRichText", () => {
  it("parses a valid doc", () => {
    const result = parseRichText(validDoc);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("doc");
  });

  it("returns null for plain text", () => {
    expect(parseRichText("hello")).toBeNull();
  });
});

// ── plainTextFromRichText ─────────────────────────────────────────────────────

describe("plainTextFromRichText", () => {
  it("returns plain text unchanged", () => {
    expect(plainTextFromRichText("Hello world")).toBe("Hello world");
  });

  it("extracts text from a TipTap doc", () => {
    expect(plainTextFromRichText(validDoc)).toBe("Hello");
  });

  it("extracts text from nested marks", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold ", marks: [{ type: "bold" }] },
            { type: "text", text: "and italic", marks: [{ type: "italic" }] },
          ],
        },
      ],
    });
    expect(plainTextFromRichText(doc)).toBe("Bold  and italic".replace(/\s+/g, " "));
  });

  it("returns empty doc as empty string", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(plainTextFromRichText(doc).trim()).toBe("");
  });
});

// ── richTextFieldSchema ───────────────────────────────────────────────────────

describe("richTextFieldSchema", () => {
  it("accepts plain text", () => {
    expect(richTextFieldSchema.safeParse("Hello world").success).toBe(true);
  });

  it("accepts valid TipTap JSON string", () => {
    expect(richTextFieldSchema.safeParse(validDoc).success).toBe(true);
  });

  it("accepts empty string", () => {
    expect(richTextFieldSchema.safeParse("").success).toBe(true);
  });

  it("rejects a string exceeding max length", () => {
    const huge = "x".repeat(200_001);
    expect(richTextFieldSchema.safeParse(huge).success).toBe(false);
  });

  it("rejects a TipTap doc with too many nodes (>500)", () => {
    const bigDoc = JSON.stringify({
      type: "doc",
      content: Array.from({ length: 501 }, () => ({ type: "paragraph" })),
    });
    expect(richTextFieldSchema.safeParse(bigDoc).success).toBe(false);
  });
});
