-- Add slug to ServiceCategory (nullable, unique)
ALTER TABLE "ServiceCategory" ADD COLUMN "slug" TEXT;

-- Backfill existing rows: slugify the name
UPDATE "ServiceCategory"
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'));

-- Add unique constraint
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- Create PageSeo model
CREATE TABLE "PageSeo" (
    "id"          TEXT NOT NULL,
    "page"        TEXT NOT NULL,
    "title"       TEXT,
    "description" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageSeo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageSeo_page_key" ON "PageSeo"("page");
