import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Refund Policy — Pherall" };

export default function RefundPolicyPage() {
  return <PolicyPageContent type={PolicyType.REFUND_POLICY} />;
}
