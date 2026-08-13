import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { PolicyForm } from "@/components/admin/cms/policy-form";

export const metadata: Metadata = {
  title: "Terms & Conditions — Pherall Admin",
};

export default async function TermsAndConditionsAdminPage() {
  const policy = await db.policy.findUnique({
    where: { type: PolicyType.TERMS_AND_CONDITIONS },
  });
  if (!policy) notFound();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Terms & Conditions"
        description="Edit and publish your terms and conditions."
      />
      <PolicyForm policy={policy} />
    </div>
  );
}
