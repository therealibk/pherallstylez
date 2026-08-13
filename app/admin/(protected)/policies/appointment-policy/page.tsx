import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { PolicyForm } from "@/components/admin/cms/policy-form";

export const metadata: Metadata = {
  title: "Appointment Policy — Pherall Admin",
};

export default async function AppointmentPolicyAdminPage() {
  const policy = await db.policy.findUnique({
    where: { type: PolicyType.APPOINTMENT_POLICY },
  });
  if (!policy) notFound();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Appointment Policy"
        description="Edit and publish your appointment policy."
      />
      <PolicyForm policy={policy} />
    </div>
  );
}
