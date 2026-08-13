-- Phase 6: Services Management
-- Adds slug to Service (for public /services/[slug] URLs)
-- Adds description and active to ServiceCategory

ALTER TABLE "ServiceCategory" ADD COLUMN "description" TEXT;
ALTER TABLE "ServiceCategory" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Service" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Back-fill slugs for any existing rows (dev DB has none, but safe to run)
UPDATE "Service"
  SET "slug" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
  WHERE "slug" = '';

-- Drop default now that back-fill is done, then add unique index
ALTER TABLE "Service" ALTER COLUMN "slug" DROP DEFAULT;
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
