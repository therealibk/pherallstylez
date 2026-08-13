import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Cancellation Policy — Pherall" };

export default function CancellationPolicyPage() {
  return <PolicyPageContent type={PolicyType.CANCELLATION_POLICY} />;
}
