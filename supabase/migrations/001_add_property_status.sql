-- Add Property.status column and enum wiring
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PropertyStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE','INACTIVE','UNDER_CONTRACT','SOLD');
  END IF;
END $$;

ALTER TABLE "public"."property"
  ADD COLUMN IF NOT EXISTS "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE';

COMMENT ON COLUMN "public"."property"."status" IS 'Overall lifecycle status of the property';
