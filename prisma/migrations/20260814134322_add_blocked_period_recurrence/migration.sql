-- AlterTable
ALTER TABLE "BlockedPeriod" ADD COLUMN     "recurrence" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3);
