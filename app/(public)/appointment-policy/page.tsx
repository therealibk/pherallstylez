import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";
import { getPageSeo } from "@/lib/actions/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("appointment-policy");
  const title = seo.title?.trim() || "Appointment Policy — Pherall";
  const description = seo.description?.trim() || undefined;
  return { title, ...(description ? { description } : {}) };
}

export default function AppointmentPolicyPage() {
  return <PolicyPageContent type={PolicyType.APPOINTMENT_POLICY} />;
}
