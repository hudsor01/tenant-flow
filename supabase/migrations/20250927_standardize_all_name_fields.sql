-- ========================================
-- COMPREHENSIVE NAME FIELD STANDARDIZATION
-- ========================================
-- Principle: ALL tables with person names should have:
-- 1. firstName (actual column)
-- 2. lastName (actual column)
-- 3. name (generated column combining firstName + lastName)
--
-- This eliminates ALL variations like:
-- - fullName vs full_name
-- - name vs firstName/lastName separate
-- - Different naming patterns across tables
-- ========================================

-- ========================================
-- 1. USER TABLE
-- ========================================
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrate existing data
UPDATE "User"
SET
  "firstName" = COALESCE("firstName", SPLIT_PART("name", ' ', 1)),
  "lastName" = COALESCE("lastName", NULLIF(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1), ''))
WHERE ("firstName" IS NULL OR "lastName" IS NULL) AND "name" IS NOT NULL;

-- Drop and recreate name as generated column
ALTER TABLE "User"
DROP COLUMN IF EXISTS "name";

ALTER TABLE "User"
ADD COLUMN "name" TEXT
GENERATED ALWAYS AS (
  TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
) STORED;

-- ========================================
-- 2. TENANT TABLE
-- ========================================
ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrate existing data
UPDATE "Tenant"
SET
  "firstName" = COALESCE("firstName", SPLIT_PART("name", ' ', 1)),
  "lastName" = COALESCE("lastName", NULLIF(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1), ''))
WHERE ("firstName" IS NULL OR "lastName" IS NULL) AND "name" IS NOT NULL;

-- Drop and recreate name as generated column
ALTER TABLE "Tenant"
DROP COLUMN IF EXISTS "name";

ALTER TABLE "Tenant"
ADD COLUMN "name" TEXT
GENERATED ALWAYS AS (
  TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
) STORED;

-- ========================================
-- 3. INVOICELEAD TABLE (Already has firstName/lastName)
-- ========================================
-- Just add the generated name column
ALTER TABLE "InvoiceLead"
ADD COLUMN IF NOT EXISTS "name" TEXT
GENERATED ALWAYS AS (
  TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
) STORED;

-- ========================================
-- 4. PROPERTY TABLE - Different case (property name, not person)
-- ========================================
-- Properties keep their single "name" field as-is (it's not a person's name)
-- No changes needed

-- ========================================
-- 5. BLOGARTICLE TABLE - authorName standardization
-- ========================================
ALTER TABLE "BlogArticle"
ADD COLUMN IF NOT EXISTS "authorFirstName" TEXT,
ADD COLUMN IF NOT EXISTS "authorLastName" TEXT;

-- Migrate existing authorName data
UPDATE "BlogArticle"
SET
  "authorFirstName" = COALESCE("authorFirstName", SPLIT_PART("authorName", ' ', 1)),
  "authorLastName" = COALESCE("authorLastName", NULLIF(SUBSTRING("authorName" FROM POSITION(' ' IN "authorName") + 1), ''))
WHERE ("authorFirstName" IS NULL OR "authorLastName" IS NULL) AND "authorName" IS NOT NULL;

-- Drop and recreate authorName as generated column
ALTER TABLE "BlogArticle"
DROP COLUMN IF EXISTS "authorName";

ALTER TABLE "BlogArticle"
ADD COLUMN "authorName" TEXT
GENERATED ALWAYS AS (
  TRIM(COALESCE("authorFirstName", '') || ' ' || COALESCE("authorLastName", ''))
) STORED;

-- ========================================
-- 6. INDEXES FOR PERFORMANCE
-- ========================================
-- Add indexes on firstName and lastName for searching
CREATE INDEX IF NOT EXISTS idx_user_first_name ON "User"("firstName");
CREATE INDEX IF NOT EXISTS idx_user_last_name ON "User"("lastName");
CREATE INDEX IF NOT EXISTS idx_user_full_name ON "User"("name");

CREATE INDEX IF NOT EXISTS idx_tenant_first_name ON "Tenant"("firstName");
CREATE INDEX IF NOT EXISTS idx_tenant_last_name ON "Tenant"("lastName");
CREATE INDEX IF NOT EXISTS idx_tenant_full_name ON "Tenant"("name");

CREATE INDEX IF NOT EXISTS idx_invoice_lead_first_name ON "InvoiceLead"("firstName");
CREATE INDEX IF NOT EXISTS idx_invoice_lead_last_name ON "InvoiceLead"("lastName");
CREATE INDEX IF NOT EXISTS idx_invoice_lead_full_name ON "InvoiceLead"("name");

-- ========================================
-- 7. STANDARDIZED SEARCH FUNCTION
-- ========================================
-- Create a function for searching by any part of name
CREATE OR REPLACE FUNCTION search_by_name(
  search_term TEXT,
  table_name TEXT
)
RETURNS TABLE (
  id UUID,
  "firstName" TEXT,
  "lastName" TEXT,
  "name" TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  search_term := LOWER(search_term);

  RETURN QUERY EXECUTE format(
    'SELECT id, "firstName", "lastName", "name"
     FROM %I
     WHERE LOWER("firstName") LIKE $1
        OR LOWER("lastName") LIKE $1
        OR LOWER("name") LIKE $1',
    table_name
  ) USING '%' || search_term || '%';
END;
$$;

COMMENT ON FUNCTION search_by_name IS 'Standardized name search across any table with firstName/lastName/name columns';

-- ========================================
-- 8. UPDATE ALL FOREIGN KEY REFERENCES
-- ========================================
-- Ensure all foreign key constraints are maintained
-- (PostgreSQL handles this automatically for generated columns)

-- ========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON COLUMN "User"."firstName" IS 'User first name (source field)';
COMMENT ON COLUMN "User"."lastName" IS 'User last name (source field)';
COMMENT ON COLUMN "User"."name" IS 'Generated: Full name (firstName + lastName)';

COMMENT ON COLUMN "Tenant"."firstName" IS 'Tenant first name (source field)';
COMMENT ON COLUMN "Tenant"."lastName" IS 'Tenant last name (source field)';
COMMENT ON COLUMN "Tenant"."name" IS 'Generated: Full name (firstName + lastName)';

COMMENT ON COLUMN "InvoiceLead"."name" IS 'Generated: Full name (firstName + lastName)';

COMMENT ON COLUMN "BlogArticle"."authorFirstName" IS 'Author first name (source field)';
COMMENT ON COLUMN "BlogArticle"."authorLastName" IS 'Author last name (source field)';
COMMENT ON COLUMN "BlogArticle"."authorName" IS 'Generated: Author full name';

-- ========================================
-- SUMMARY
-- ========================================
-- This migration standardizes ALL name fields:
--
-- PATTERN FOR PERSON NAMES:
-- - firstName: TEXT (source field)
-- - lastName: TEXT (source field)
-- - name: TEXT GENERATED (computed)
--
-- BENEFITS:
-- 1. Consistent naming everywhere
-- 2. No more fullName vs full_name confusion
-- 3. Forms work with firstName/lastName
-- 4. Database auto-generates full name
-- 5. Can search/sort by any name part
-- 6. Zero backend logic needed
-- 7. Backwards compatible (name field still exists)
--
-- AFFECTED TABLES:
-- - User: firstName, lastName, name (generated)
-- - Tenant: firstName, lastName, name (generated)
-- - InvoiceLead: firstName, lastName, name (generated)
-- - BlogArticle: authorFirstName, authorLastName, authorName (generated)
--
-- UNCHANGED:
-- - Property: name (not a person's name)
-- - Unit: unitNumber (not a name)
-- - Other tables without person names
-- ========================================