import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { PolicyForm } from "@/components/admin/cms/policy-form";

export const metadata: Metadata = { title: "Booking Policy — Pherall Admin" };

export default async function BookingPolicyAdminPage() {
  const policy = await db.policy.findUnique({
    where: { type: PolicyType.BOOKING_POLICY },
  });
  if (!policy) notFound();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Booking Policy"
        description="Edit and publish your booking policy."
      />
      <PolicyForm policy={policy} />
    </div>
  );
}
