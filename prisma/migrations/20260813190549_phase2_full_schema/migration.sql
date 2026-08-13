-- CreateEnum
CREATE TYPE "ContentSection" AS ENUM ('HOMEPAGE', 'ABOUT', 'CONTACT');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('PRIVACY_POLICY', 'TERMS_AND_CONDITIONS', 'BOOKING_POLICY', 'APPOINTMENT_POLICY', 'CANCELLATION_POLICY', 'REFUND_POLICY');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE', 'FULL');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'RADIO', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentEventType" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REFUND_ISSUED', 'REMINDER_SENT', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'DEPOSIT_PAID', 'PAID_IN_FULL', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL', 'REMAINDER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMATION', 'PAYMENT_CONFIRMATION', 'APPOINTMENT_REMINDER', 'CANCELLATION_CONFIRMATION', 'RESCHEDULE_CONFIRMATION', 'REFUND_CONFIRMATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "facebookUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" TEXT NOT NULL,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 90,
    "defaultBufferMins" INTEGER NOT NULL DEFAULT 0,
    "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "reschedulingDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "customerCanCancel" BOOLEAN NOT NULL DEFAULT true,
    "customerCanReschedule" BOOLEAN NOT NULL DEFAULT true,
    "depositRequired" BOOLEAN NOT NULL DEFAULT true,
    "paymentHoldMins" INTEGER NOT NULL DEFAULT 15,
    "reminderHours" INTEGER[] DEFAULT ARRAY[48, 24]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL,
    "section" "ContentSection" NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "policyContent" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMins" INTEGER NOT NULL,
    "bufferMins" INTEGER NOT NULL DEFAULT 0,
    "pricePence" INTEGER NOT NULL,
    "depositType" "DepositType" NOT NULL DEFAULT 'NONE',
    "depositPence" INTEGER,
    "depositPercentage" INTEGER,
    "imageUrl" TEXT,
    "preparationNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceQuestion" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedPeriod" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentToken" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "durationMins" INTEGER NOT NULL,
    "bufferMins" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "depositPence" INTEGER NOT NULL,
    "notes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAnswer" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionLabel" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "AppointmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "eventType" "AppointmentEventType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentType" "PaymentType" NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "stripeRefundId" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" "NotificationType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "reminderOffsetHours" INTEGER,
    "sentAt" TIMESTAMP(3),
    "resendMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_section_key" ON "SiteContent"("section");

-- CreateIndex
CREATE INDEX "Faq_published_displayOrder_idx" ON "Faq"("published", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_type_key" ON "Policy"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_appointmentId_policyType_key" ON "PolicyAcceptance"("appointmentId", "policyType");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- CreateIndex
CREATE INDEX "Service_featured_idx" ON "Service"("featured");

-- CreateIndex
CREATE INDEX "ServiceQuestion_serviceId_idx" ON "ServiceQuestion"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceQuestionOption_questionId_idx" ON "ServiceQuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_dayOfWeek_active_idx" ON "AvailabilityRule"("dayOfWeek", "active");

-- CreateIndex
CREATE INDEX "BlockedPeriod_startAt_endAt_idx" ON "BlockedPeriod"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentToken_tokenHash_key" ON "AppointmentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AppointmentToken_appointmentId_idx" ON "AppointmentToken"("appointmentId");

-- CreateIndex
CREATE INDEX "Appointment_startAt_idx" ON "Appointment"("startAt");

-- CreateIndex
CREATE INDEX "Appointment_endAt_idx" ON "Appointment"("endAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX "Appointment_holdExpiresAt_idx" ON "Appointment"("holdExpiresAt");

-- CreateIndex
CREATE INDEX "AppointmentAnswer_appointmentId_idx" ON "AppointmentAnswer"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentAnswer_appointmentId_questionId_key" ON "AppointmentAnswer"("appointmentId", "questionId");

-- CreateIndex
CREATE INDEX "AppointmentEvent_appointmentId_createdAt_idx" ON "AppointmentEvent"("appointmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_idx" ON "Payment"("appointmentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_stripePaymentIntentId_idx" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_deduplicationKey_key" ON "NotificationLog"("deduplicationKey");

-- CreateIndex
CREATE INDEX "NotificationLog_appointmentId_idx" ON "NotificationLog"("appointmentId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_processed_createdAt_idx" ON "StripeWebhookEvent"("processed", "createdAt");

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_policyType_fkey" FOREIGN KEY ("policyType") REFERENCES "Policy"("type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuestion" ADD CONSTRAINT "ServiceQuestion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuestionOption" ADD CONSTRAINT "ServiceQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ServiceQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentToken" ADD CONSTRAINT "AppointmentToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAnswer" ADD CONSTRAINT "AppointmentAnswer_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAnswer" ADD CONSTRAINT "AppointmentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ServiceQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
