import { z } from "zod";
import { DepositType, QuestionType } from "@/lib/generated/prisma/client";

// Re-export format utilities (defined in service-format-utils.ts, no Prisma dep)
export {
  slugify,
  penceToPounds,
  poundsToPence,
  formatGBP,
  formatDuration,
  requiresOptions,
  MULTI_CHOICE_TYPES,
  QUESTION_TYPE_LABELS,
  DEPOSIT_TYPE_LABELS,
  DEPOSIT_TYPE,
  QUESTION_TYPE,
} from "@/lib/service-format-utils";
export type {
  DepositTypeValue,
  QuestionTypeValue,
} from "@/lib/service-format-utils";

// ── Zod schemas (server-side only; uses Prisma enums) ─────────────────────────

export const serviceCategoryInputSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(500).default(""),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type ServiceCategoryInput = z.infer<typeof serviceCategoryInputSchema>;

export const serviceQuestionOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Option label is required").max(200),
  displayOrder: z.number().int().min(0).default(0),
});
export type ServiceQuestionOptionInput = z.infer<typeof serviceQuestionOptionSchema>;

export const serviceQuestionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Question label is required").max(500),
  questionType: z.nativeEnum(QuestionType),
  required: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  options: z.array(serviceQuestionOptionSchema).default([]),
});
export type ServiceQuestionInput = z.infer<typeof serviceQuestionSchema>;

const poundsField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 80 or 80.00)");

export const serviceInputSchema = z.object({
  name: z.string().min(1, "Service name is required").max(200),
  description: z.string().max(2000).default(""),
  categoryId: z.string().nullable().default(null),
  durationMins: z
    .number()
    .int()
    .min(5, "Minimum duration is 5 minutes")
    .max(480, "Maximum duration is 8 hours"),
  bufferMins: z.number().int().min(0).max(120).default(0),
  pricePounds: poundsField,
  depositType: z.nativeEnum(DepositType).default(DepositType.NONE),
  depositPounds: z.string().optional(),
  depositPercentage: z
    .number()
    .int()
    .min(1, "Deposit must be at least 1%")
    .max(100, "Deposit cannot exceed 100%")
    .optional(),
  imageUrl: z.string().default(""),
  preparationNotes: z.string().max(2000).default(""),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  questions: z.array(serviceQuestionSchema).default([]),
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;
