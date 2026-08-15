import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";
import { getPageSeo } from "@/lib/actions/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("terms-and-conditions");
  const title = seo.title?.trim() || "Terms & Conditions — Pherall";
  const description = seo.description?.trim() || undefined;
  return { title, ...(description ? { description } : {}) };
}

export default function TermsAndConditionsPage() {
  return <PolicyPageContent type={PolicyType.TERMS_AND_CONDITIONS} />;
}
