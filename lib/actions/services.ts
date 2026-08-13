"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DepositType } from "@/lib/generated/prisma/client";
import {
  serviceInputSchema,
  slugify,
  poundsToPence,
  type ServiceInput,
} from "@/lib/service-schemas";
import { detectImageMime, buildDataUrl } from "@/lib/appearance-schemas";

type ActionResult = { success: true } | { success: false; error: string };
type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Slug ──────────────────────────────────────────────────────────────────────

async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 2;
  for (;;) {
    const existing = await db.service.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter++}`;
  }
}

// ── Service CRUD ──────────────────────────────────────────────────────────────

export async function createService(data: ServiceInput): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = serviceInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const d = parsed.data;
  const pricePence = poundsToPence(d.pricePounds);
  if (pricePence <= 0) return { success: false, error: "Price must be greater than zero" };

  const slug = await generateUniqueSlug(d.name);

  let depositPence: number | null = null;
  let depositPct: number | null = null;
  if (d.depositType === DepositType.FIXED && d.depositPounds) {
    depositPence = poundsToPence(d.depositPounds);
  } else if (d.depositType === DepositType.PERCENTAGE && d.depositPercentage) {
    depositPct = d.depositPercentage;
  }

  const maxOrder = await db.service.aggregate({ _max: { displayOrder: true } });
  const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  await db.service.create({
    data: {
      name: d.name,
      slug,
      description: d.description || null,
      categoryId: d.categoryId || null,
      durationMins: d.durationMins,
      bufferMins: d.bufferMins,
      pricePence,
      depositType: d.depositType,
      depositPence,
      depositPercentage: depositPct,
      imageUrl: d.imageUrl || null,
      preparationNotes: d.preparationNotes || null,
      active: d.active,
      featured: d.featured,
      displayOrder,
      questions: {
        create: d.questions.map((q, qi) => ({
          label: q.label,
          questionType: q.questionType,
          required: q.required,
          displayOrder: qi,
          options: {
            create: q.options.map((o, oi) => ({
              label: o.label,
              displayOrder: oi,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  return { success: true };
}

export async function updateService(
  id: string,
  data: ServiceInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = serviceInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const existing = await db.service.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Service not found" };

  const d = parsed.data;
  const pricePence = poundsToPence(d.pricePounds);
  if (pricePence <= 0) return { success: false, error: "Price must be greater than zero" };

  // Only regenerate slug if name changed
  const newSlug =
    slugify(d.name) === slugify(existing.name)
      ? existing.slug
      : await generateUniqueSlug(d.name, id);

  let depositPence: number | null = null;
  let depositPct: number | null = null;
  if (d.depositType === DepositType.FIXED && d.depositPounds) {
    depositPence = poundsToPence(d.depositPounds);
  } else if (d.depositType === DepositType.PERCENTAGE && d.depositPercentage) {
    depositPct = d.depositPercentage;
  }

  // Replace all questions: cascade deletes options via onDelete: Cascade
  await db.serviceQuestion.deleteMany({ where: { serviceId: id } });

  await db.service.update({
    where: { id },
    data: {
      name: d.name,
      slug: newSlug,
      description: d.description || null,
      categoryId: d.categoryId || null,
      durationMins: d.durationMins,
      bufferMins: d.bufferMins,
      pricePence,
      depositType: d.depositType,
      depositPence,
      depositPercentage: depositPct,
      imageUrl: d.imageUrl || null,
      preparationNotes: d.preparationNotes || null,
      active: d.active,
      featured: d.featured,
      questions: {
        create: d.questions.map((q, qi) => ({
          label: q.label,
          questionType: q.questionType,
          required: q.required,
          displayOrder: qi,
          options: {
            create: q.options.map((o, oi) => ({
              label: o.label,
              displayOrder: oi,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}/edit`);
  revalidatePath("/services");
  revalidatePath(`/services/${newSlug}`);
  if (newSlug !== existing.slug) revalidatePath(`/services/${existing.slug}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const existing = await db.service.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Service not found" };

  try {
    await db.service.delete({ where: { id } });
  } catch (err: any) {
    // P2003 = foreign key constraint — appointments reference this service
    if (err?.code === "P2003") {
      return {
        success: false,
        error:
          "This service has booking history and cannot be deleted. Deactivate it instead.",
      };
    }
    throw err;
  }

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  return { success: true };
}

export async function setServiceActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  await db.service.update({ where: { id }, data: { active } });
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  return { success: true };
}

export async function setServiceFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  await db.service.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/services");
  revalidatePath("/");
  return { success: true };
}

// ── Service image ─────────────────────────────────────────────────────────────

export async function validateServiceImage(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };

  const limit = 2 * 1024 * 1024;
  if (file.size > limit) return { success: false, error: "Image must be 2 MB or smaller" };
  if (file.size === 0) return { success: false, error: "File is empty" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) return { success: false, error: "File must be a JPEG, PNG, or WebP image" };

  const base64 = Buffer.from(bytes).toString("base64");
  return { success: true, url: buildDataUrl(mime, base64) };
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function createCategory(data: {
  name: string;
  description?: string;
  active: boolean;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const name = data.name.trim();
  if (!name) return { success: false, error: "Category name is required" };
  if (name.length > 100) return { success: false, error: "Category name too long" };

  const maxOrder = await db.serviceCategory.aggregate({ _max: { displayOrder: true } });
  const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  try {
    await db.serviceCategory.create({
      data: {
        name,
        description: data.description?.trim() || null,
        active: data.active,
        displayOrder,
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { success: false, error: "A category with that name already exists" };
    }
    throw err;
  }

  revalidatePath("/admin/services/categories");
  revalidatePath("/admin/services/new");
  revalidatePath("/services");
  return { success: true };
}

export async function updateCategory(
  id: string,
  data: {
    name: string;
    description?: string;
    active: boolean;
    displayOrder: number;
  },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const name = data.name.trim();
  if (!name) return { success: false, error: "Category name is required" };

  try {
    await db.serviceCategory.update({
      where: { id },
      data: {
        name,
        description: data.description?.trim() || null,
        active: data.active,
        displayOrder: data.displayOrder,
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { success: false, error: "A category with that name already exists" };
    }
    throw err;
  }

  revalidatePath("/admin/services/categories");
  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  // onDelete: SetNull means services keep all data; categoryId becomes null
  await db.serviceCategory.delete({ where: { id } });

  revalidatePath("/admin/services/categories");
  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true };
}
