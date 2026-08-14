-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "stripePublishableKey" TEXT,
ADD COLUMN     "stripeSecretKey" TEXT,
ADD COLUMN     "stripeWebhookSecret" TEXT;
