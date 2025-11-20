-- Add CHECK constraint to enforce valid lease_status values
-- Ensures lease_status can only be one of: 'DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'

-- First, verify existing data complies with the constraint
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Count any existing invalid lease_status values
    SELECT COUNT(*) INTO invalid_count
    FROM public.leases
    WHERE lease_status NOT IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % leases with invalid status values. Please fix these before applying the constraint.', invalid_count;
    END IF;
END $$;

-- Add the CHECK constraint only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'leases_lease_status_check'
        AND t.relname = 'leases'
        AND c.contype = 'c'  -- 'c' for check constraint
    ) THEN
        ALTER TABLE public.leases
        ADD CONSTRAINT leases_lease_status_check
        CHECK (lease_status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'));
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT leases_lease_status_check ON public.leases IS 'Enforces valid lease status values: DRAFT, ACTIVE, EXPIRED, TERMINATED';