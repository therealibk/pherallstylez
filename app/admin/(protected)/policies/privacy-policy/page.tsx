import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { PolicyForm } from "@/components/admin/cms/policy-form";

export const metadata: Metadata = { title: "Privacy Policy — Pherall Admin" };

export default async function PrivacyPolicyAdminPage() {
  const policy = await db.policy.findUnique({
    where: { type: PolicyType.PRIVACY_POLICY },
  });
  if (!policy) notFound();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Privacy Policy"
        description="Edit and publish your privacy policy. Saved versions are shown to clients during booking."
      />
      <PolicyForm policy={policy} />
    </div>
  );
}
