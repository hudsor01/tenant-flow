-- Add missing columns to User table to support native Supabase types
-- This eliminates the need for custom type extensions like AuthServiceauthUser

-- Add firstName and lastName to match what forms collect
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrate existing name data to firstName/lastName if they don't exist
UPDATE "users"
SET
  "firstName" = COALESCE("firstName", SPLIT_PART("name", ' ', 1)),
  "lastName" = COALESCE("lastName",
    CASE
      WHEN POSITION(' ' IN "name") > 0
      THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
      ELSE NULL
    END
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Update name column to be a generated column combining firstName and lastName
ALTER TABLE "users"
DROP COLUMN IF EXISTS "name",
ADD COLUMN "name" TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN "firstName" IS NOT NULL AND "lastName" IS NOT NULL THEN
      "firstName" || ' ' || "lastName"
    WHEN "firstName" IS NOT NULL THEN
      "firstName"
    WHEN "lastName" IS NOT NULL THEN
      "lastName"
    ELSE NULL
  END
) STORED;

-- Add lastLoginAt column to track user's last login timestamp
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;

-- Add orgId for future multi-tenancy support (using shorter name)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "orgId" UUID;

-- Add profileComplete as a generated column based on required fields
-- This eliminates the need to compute this in application code
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "profileComplete" BOOLEAN
GENERATED ALWAYS AS (
  CASE
    WHEN "firstName" IS NOT NULL AND LENGTH("firstName") > 0
     AND phone IS NOT NULL AND LENGTH(phone) > 0
    THEN true
    ELSE false
  END
) STORED;

-- Add index on orgId for future multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_user_org_id
ON "users"("orgId")
WHERE "orgId" IS NOT NULL;

-- Add index on lastLoginAt for activity queries
CREATE INDEX IF NOT EXISTS idx_user_last_login
ON "users"("lastLoginAt" DESC NULLS LAST);

-- Update lastLoginAt for existing users to their updatedAt time as a reasonable default
UPDATE "users"
SET "lastLoginAt" = "updatedAt"::TIMESTAMPTZ
WHERE "lastLoginAt" IS NULL;

COMMENT ON COLUMN "users"."lastLoginAt" IS 'Timestamp of user last successful login';
COMMENT ON COLUMN "users"."orgId" IS 'Organization ID for multi-tenancy (future feature)';
COMMENT ON COLUMN "users"."profileComplete" IS 'Generated column: true when user has both name and phone filled';