import type { Metadata } from "next";
import { PolicyType } from "@/lib/generated/prisma/client";
import { PolicyPageContent } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Booking Policy — Pherall" };

export default function BookingPolicyPage() {
  return <PolicyPageContent type={PolicyType.BOOKING_POLICY} />;
}
