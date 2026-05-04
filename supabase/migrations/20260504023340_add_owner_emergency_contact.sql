-- F-3: Owner emergency contact columns.
-- The audit found the emergency contact UI exists for tenants only; owners
-- have no way to record their own. Mirrors the columns already present on
-- public.tenants so the schema is consistent across roles.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS emergency_contact_name        text,
    ADD COLUMN IF NOT EXISTS emergency_contact_phone       text,
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

COMMENT ON COLUMN public.users.emergency_contact_name IS
    'Owner-supplied emergency contact full name. Optional. Settable from the Settings → General page.';
COMMENT ON COLUMN public.users.emergency_contact_phone IS
    'Owner-supplied emergency contact phone number. Optional. Settable from the Settings → General page.';
COMMENT ON COLUMN public.users.emergency_contact_relationship IS
    'Free-form description of the relationship (e.g. "Spouse", "Parent"). Optional.';
