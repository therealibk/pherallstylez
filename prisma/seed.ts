import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient, PolicyType, ContentSection } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // ── Admin user ──────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, password: hashedPassword, name: "Admin" },
  });
  console.log(`✓ Admin user: ${user.email} (${user.id})`);

  // ── BusinessSettings ────────────────────────────────────────────────────────
  // Single-row table — use a fixed sentinel ID so upsert works without a unique field
  const BUSINESS_SETTINGS_ID = "business-settings-singleton";
  const biz = await prisma.businessSettings.upsert({
    where: { id: BUSINESS_SETTINGS_ID },
    update: {},
    create: {
      id: BUSINESS_SETTINGS_ID,
      businessName: "Pherall",
      ownerName: "Pherall",
      email: adminEmail,
      currency: "GBP",
      timezone: "Europe/London",
    },
  });
  console.log(`✓ BusinessSettings: ${biz.businessName}`);

  // ── BookingSettings ─────────────────────────────────────────────────────────
  const BOOKING_SETTINGS_ID = "booking-settings-singleton";
  const booking = await prisma.bookingSettings.upsert({
    where: { id: BOOKING_SETTINGS_ID },
    update: {},
    create: {
      id: BOOKING_SETTINGS_ID,
      minNoticeHours: 24,
      maxAdvanceDays: 90,
      defaultBufferMins: 0,
      cancellationDeadlineHours: 24,
      reschedulingDeadlineHours: 24,
      customerCanCancel: true,
      customerCanReschedule: true,
      depositRequired: true,
      paymentHoldMins: 15,
      reminderHours: [48, 24],
    },
  });
  console.log(`✓ BookingSettings (paymentHoldMins: ${booking.paymentHoldMins})`);

  // ── Policies ─────────────────────────────────────────────────────────────────
  // Six policy types — created unpublished with empty content, version 1
  const policySeeds: { type: PolicyType; title: string }[] = [
    { type: PolicyType.PRIVACY_POLICY, title: "Privacy Policy" },
    { type: PolicyType.TERMS_AND_CONDITIONS, title: "Terms & Conditions" },
    { type: PolicyType.BOOKING_POLICY, title: "Booking Policy" },
    { type: PolicyType.APPOINTMENT_POLICY, title: "Appointment Policy" },
    { type: PolicyType.CANCELLATION_POLICY, title: "Cancellation Policy" },
    { type: PolicyType.REFUND_POLICY, title: "Refund Policy" },
  ];

  for (const seed of policySeeds) {
    const policy = await prisma.policy.upsert({
      where: { type: seed.type },
      update: {},
      create: {
        type: seed.type,
        title: seed.title,
        content: "",
        version: 1,
        published: false,
      },
    });
    console.log(`✓ Policy: ${policy.title} (v${policy.version})`);
  }

  // ── SiteContent ──────────────────────────────────────────────────────────────
  // Three sections — created with empty data objects
  const contentSeeds: { section: ContentSection }[] = [
    { section: ContentSection.HOMEPAGE },
    { section: ContentSection.ABOUT },
    { section: ContentSection.CONTACT },
  ];

  for (const seed of contentSeeds) {
    const content = await prisma.siteContent.upsert({
      where: { section: seed.section },
      update: {},
      create: {
        section: seed.section,
        data: {},
      },
    });
    console.log(`✓ SiteContent: ${content.section}`);
  }

  await prisma.$disconnect();
  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
