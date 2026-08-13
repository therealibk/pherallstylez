"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { faqInputSchema, type FaqInput } from "@/lib/cms-schemas";

type ActionResult = { success: true } | { success: false; error: string };

type FaqActionResult =
  | { success: true; faq: { id: string; question: string; answer: string; displayOrder: number; published: boolean } }
  | { success: false; error: string };

async function requireAdmin(): Promise<true | { success: false; error: string }> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

function revalidateFaq() {
  revalidatePath("/admin/content/faq");
  revalidatePath("/faq");
}

export async function createFaq(data: FaqInput): Promise<FaqActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  const parsed = faqInputSchema.safeParse(data);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: first ?? "Invalid FAQ data" };
  }

  const maxOrder = await db.faq.aggregate({ _max: { displayOrder: true } });
  const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  const faq = await db.faq.create({
    data: {
      question: parsed.data.question,
      answer: parsed.data.answer,
      published: parsed.data.published,
      displayOrder: nextOrder,
    },
    select: { id: true, question: true, answer: true, displayOrder: true, published: true },
  });

  revalidateFaq();
  return { success: true, faq };
}

export async function updateFaq(id: string, data: FaqInput): Promise<FaqActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid FAQ ID" };
  }

  const parsed = faqInputSchema.safeParse(data);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: first ?? "Invalid FAQ data" };
  }

  const existing = await db.faq.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "FAQ not found" };

  const faq = await db.faq.update({
    where: { id },
    data: {
      question: parsed.data.question,
      answer: parsed.data.answer,
      published: parsed.data.published,
    },
    select: { id: true, question: true, answer: true, displayOrder: true, published: true },
  });

  revalidateFaq();
  return { success: true, faq };
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid FAQ ID" };
  }

  const existing = await db.faq.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "FAQ not found" };

  await db.faq.delete({ where: { id } });

  revalidateFaq();
  return { success: true };
}

export async function toggleFaqPublished(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid FAQ ID" };
  }

  const existing = await db.faq.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "FAQ not found" };

  await db.faq.update({
    where: { id },
    data: { published },
  });

  revalidateFaq();
  return { success: true };
}

export async function reorderFaqs(orderedIds: string[]): Promise<ActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return { success: false, error: "Invalid order data" };
  }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.faq.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );

  revalidateFaq();
  return { success: true };
}
