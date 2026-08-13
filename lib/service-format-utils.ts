// Pure formatting utilities and enum-like constants.
// No Prisma imports — safe to import from client components.

// ── Enum-like constants (same string values as Prisma enums) ──────────────────

export const DEPOSIT_TYPE = {
  NONE: "NONE",
  FIXED: "FIXED",
  PERCENTAGE: "PERCENTAGE",
  FULL: "FULL",
} as const;
export type DepositTypeValue = (typeof DEPOSIT_TYPE)[keyof typeof DEPOSIT_TYPE];

export const QUESTION_TYPE = {
  TEXT: "TEXT",
  TEXTAREA: "TEXTAREA",
  SELECT: "SELECT",
  RADIO: "RADIO",
  CHECKBOX: "CHECKBOX",
} as const;
export type QuestionTypeValue = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

// ── Slug ──────────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.substring(0, 80) || "service";
}

// ── Price helpers ─────────────────────────────────────────────────────────────

export function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function poundsToPence(pounds: string): number {
  const n = parseFloat(pounds);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}min`;
}

// ── Client-safe form types ────────────────────────────────────────────────────
// Structurally equivalent to the Zod-derived types in service-schemas.ts
// but with no Prisma dependency — safe to use in client components.

export interface ServiceQuestionOptionInput {
  id?: string;
  label: string;
  displayOrder: number;
}

export interface ServiceQuestionInput {
  id?: string;
  label: string;
  questionType: QuestionTypeValue;
  required: boolean;
  displayOrder: number;
  options: ServiceQuestionOptionInput[];
}

// ── Labels and helpers ────────────────────────────────────────────────────────

export const MULTI_CHOICE_TYPES: QuestionTypeValue[] = [
  QUESTION_TYPE.SELECT,
  QUESTION_TYPE.RADIO,
  QUESTION_TYPE.CHECKBOX,
];

export function requiresOptions(type: QuestionTypeValue): boolean {
  return MULTI_CHOICE_TYPES.includes(type);
}

export const QUESTION_TYPE_LABELS: Record<QuestionTypeValue, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  SELECT: "Dropdown select",
  RADIO: "Radio buttons",
  CHECKBOX: "Checkboxes",
};

export const DEPOSIT_TYPE_LABELS: Record<DepositTypeValue, string> = {
  NONE: "No deposit",
  FIXED: "Fixed amount",
  PERCENTAGE: "Percentage",
  FULL: "Full payment upfront",
};
