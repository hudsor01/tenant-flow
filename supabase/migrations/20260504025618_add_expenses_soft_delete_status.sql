-- F-2: Add soft-delete status column to expenses to match the pattern used by
-- properties, units, leases, and tenants. Existing rows backfill to 'active'.
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Constrain to known states. 'active' is the only meaningful state today; the
-- 'inactive' state is the soft-delete sentinel matching properties/units/etc.
ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_status_check CHECK (status IN ('active', 'inactive'));

-- Helps the list query (.neq('status', 'inactive')) avoid scanning inactive rows.
CREATE INDEX IF NOT EXISTS idx_expenses_status_active
    ON public.expenses (id)
    WHERE status = 'active';

COMMENT ON COLUMN public.expenses.status IS
    'Soft-delete sentinel matching properties/units/leases/tenants. ''active'' is the default; ''inactive'' indicates the row is soft-deleted and should be filtered out of list views.';
