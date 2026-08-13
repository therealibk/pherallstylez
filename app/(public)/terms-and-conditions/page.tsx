import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Terms & Conditions — Pherall" };

export default function TermsAndConditionsPage() {
  return <PolicyPageContent type={PolicyType.TERMS_AND_CONDITIONS} />;
}
