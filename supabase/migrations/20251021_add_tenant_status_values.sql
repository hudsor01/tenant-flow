-- Add MOVED_OUT and ARCHIVED to existing TenantStatus enum if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TenantStatus' AND e.enumlabel = 'MOVED_OUT'
  ) THEN
    ALTER TYPE "TenantStatus" ADD VALUE 'MOVED_OUT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TenantStatus' AND e.enumlabel = 'ARCHIVED'
  ) THEN
    ALTER TYPE "TenantStatus" ADD VALUE 'ARCHIVED';
  END IF;
END $$;
