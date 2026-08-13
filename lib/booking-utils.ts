/**
 * Pure, synchronous booking helpers.
 * No "use server" — safe to import in tests and from server action files.
 */
import { type QuestionType } from "@/lib/generated/prisma/client";

// ── Deposit ───────────────────────────────────────────────────────────────────

export function calculateDepositPence(service: {
  pricePence: number;
  depositType: string;
  depositPence: number | null;
  depositPercentage: number | null;
}): number {
  switch (service.depositType) {
    case "NONE":
      return 0;
    case "FIXED":
      return service.depositPence ?? 0;
    case "PERCENTAGE":
      return Math.round(
        (service.pricePence * (service.depositPercentage ?? 0)) / 100,
      );
    case "FULL":
      return service.pricePence;
    default:
      return 0;
  }
}

// ── Advisory lock key ─────────────────────────────────────────────────────────

export function makeLockKey(dateStr: string): number {
  // "2024-01-15" → 20240115 — safe 53-bit JS integer, used as pg bigint lock key
  return parseInt(dateStr.replace(/-/g, ""), 10);
}

// ── Answer validation ─────────────────────────────────────────────────────────

type LoadedQuestion = {
  id: string;
  label: string;
  questionType: QuestionType;
  required: boolean;
  options: { id: string; label: string }[];
};

type AnswerInput = { questionId: string; questionLabel: string; answer: string };

/** Returns null if valid, or an error message. */
export function validateAnswers(
  questions: LoadedQuestion[],
  answers: AnswerInput[],
): string | null {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  for (const q of questions) {
    const a = answerMap.get(q.id);

    if (q.required) {
      if (!a || !a.answer.trim()) {
        return `Please answer: "${q.label}"`;
      }
    }

    if (!a) continue;

    const validOptionLabels = q.options.map((o) => o.label);

    if (q.questionType === "SELECT" || q.questionType === "RADIO") {
      if (!validOptionLabels.includes(a.answer)) {
        return `Invalid option selected for: "${q.label}"`;
      }
    }

    if (q.questionType === "CHECKBOX") {
      let selected: unknown;
      try {
        selected = JSON.parse(a.answer);
      } catch {
        return `Invalid answer format for: "${q.label}"`;
      }
      if (!Array.isArray(selected)) {
        return `Invalid answer format for: "${q.label}"`;
      }
      if (q.required && (selected as string[]).length === 0) {
        return `Please select at least one option for: "${q.label}"`;
      }
      for (const sel of selected as string[]) {
        if (!validOptionLabels.includes(sel)) {
          return `Invalid option selected for: "${q.label}"`;
        }
      }
    }
  }

  // Ensure no answers reference unknown questions
  const questionIds = new Set(questions.map((q) => q.id));
  for (const a of answers) {
    if (!questionIds.has(a.questionId)) {
      return "Answer references an unknown question";
    }
  }

  return null;
}
