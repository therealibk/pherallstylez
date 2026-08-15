"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { type PageKey, ALL_PAGE_KEYS, PAGE_PATHS } from "@/lib/page-seo-config";

export type { PageKey };

async function requireAdmin(): Promise<true | { success: false; error: string }> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

export type ActionResult = { success: true } | { success: false; error: string };

const seoSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(320).optional(),
});

export async function getAllPageSeo(): Promise<
  Record<PageKey, { title: string | null; description: string | null }>
> {
  const rows = await db.pageSeo.findMany();
  const byPage = Object.fromEntries(rows.map((r) => [r.page, r]));

  return Object.fromEntries(
    ALL_PAGE_KEYS.map((k) => [
      k,
      { title: byPage[k]?.title ?? null, description: byPage[k]?.description ?? null },
    ]),
  ) as Record<PageKey, { title: string | null; description: string | null }>;
}

export async function getPageSeo(
  page: PageKey,
): Promise<{ title: string | null; description: string | null }> {
  const row = await db.pageSeo.findUnique({ where: { page } });
  return { title: row?.title ?? null, description: row?.description ?? null };
}

export async function savePageSeo(
  page: PageKey,
  data: { title: string; description: string },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = seoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await db.pageSeo.upsert({
    where: { page },
    create: {
      page,
      title: parsed.data.title?.trim() || null,
      description: parsed.data.description?.trim() || null,
    },
    update: {
      title: parsed.data.title?.trim() || null,
      description: parsed.data.description?.trim() || null,
    },
  });

  for (const path of PAGE_PATHS[page] ?? []) {
    revalidatePath(path);
  }
  revalidatePath("/admin/settings/seo");
  return { success: true };
}
