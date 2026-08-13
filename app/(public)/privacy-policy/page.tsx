import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Privacy Policy — Pherall" };

export default function PrivacyPolicyPage() {
  return <PolicyPageContent type={PolicyType.PRIVACY_POLICY} />;
}
