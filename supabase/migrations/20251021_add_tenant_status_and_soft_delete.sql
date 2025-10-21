-- Create TenantStatus enum if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TenantStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "TenantStatus" AS ENUM (
      'ACTIVE',
      'INACTIVE',
      'MOVED_OUT',
      'EVICTED',
      'PENDING',
      'ARCHIVED'
    );
  END IF;
END $$;

-- Add status column with default ACTIVE
ALTER TABLE "public"."tenant"
  ADD COLUMN IF NOT EXISTS "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';

-- Add move-out tracking fields
ALTER TABLE "public"."tenant"
  ADD COLUMN IF NOT EXISTS "move_out_date" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "move_out_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_status ON "public"."tenant"("status");
CREATE INDEX IF NOT EXISTS idx_tenant_archived_at ON "public"."tenant"("archived_at");
