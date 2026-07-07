-- MAINT-08: the add-expense dialog collects a Description but expenses had no
-- column for it (silent data loss). Add a nullable description column; additive
-- and backward-compatible. RLS is table-level (owner-scoped via the
-- maintenance_request join), so the new column inherits the existing policies.
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.expenses.description IS 'Optional free-text description of the expense (entered in the add-expense dialog).';
