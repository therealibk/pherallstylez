/**
 * Client-safe Zod schemas for the public booking flow.
 * No Prisma imports — safe to use in client components.
 */
import { z } from "zod";

export const customerDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  phone: z.string().min(7, "Phone number is required").max(30),
  notes: z.string().max(1000).optional(),
});
export type CustomerDetailsInput = z.infer<typeof customerDetailsSchema>;

export const questionAnswerSchema = z.object({
  questionId: z.string().min(1),
  questionLabel: z.string().max(500),
  answer: z.string().max(2000),
});
export type QuestionAnswerInput = z.infer<typeof questionAnswerSchema>;

export const policyAcceptanceInputSchema = z.object({
  policyType: z.string().min(1).max(50),
  accepted: z.literal(true, { error: "You must accept this policy" }),
});
export type PolicyAcceptanceInput = z.infer<typeof policyAcceptanceInputSchema>;

export const bookingRequestSchema = z.object({
  serviceSlug: z.string().min(1).max(80),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  timeStr: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  customer: customerDetailsSchema,
  answers: z.array(questionAnswerSchema).max(50),
  policies: z.array(policyAcceptanceInputSchema).max(20),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
