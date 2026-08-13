import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Appointment Policy — Pherall" };

export default function AppointmentPolicyPage() {
  return <PolicyPageContent type={PolicyType.APPOINTMENT_POLICY} />;
}
