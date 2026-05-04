-- F-6 / F-7 follow-up: store n8n webhook URLs + shared secret in a regular
-- table instead of database-level GUCs. Reason: ALTER DATABASE SET requires
-- superuser privilege which Supabase Studio's `postgres` role does not have
-- on modern projects (only supabase_admin can run it). Storing the same
-- data in a service-role-only table makes the runbook executable without
-- supabase_admin access and survives env rotations.

CREATE TABLE IF NOT EXISTS public.app_config (
    key         text        PRIMARY KEY,
    value       text        NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_config IS
    'Service-role-only key/value config for runtime params that must not live in source control. Used by notify_n8n_* and notify_critical_error trigger functions to read webhook URLs and the shared bearer secret without needing database-level GUCs (which require supabase_admin to set).';

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.app_config;
CREATE POLICY "Service role only" ON public.app_config
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- No grants to anon / authenticated. Trigger functions read via SECURITY DEFINER.

CREATE TRIGGER trg_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Seed the 6 n8n keys as empty strings so the rows exist; an operator runs the
-- runbook to fill in real URLs/secret post-deploy. Re-running this migration
-- is safe: ON CONFLICT DO NOTHING preserves whatever the operator has set.
INSERT INTO public.app_config (key, value) VALUES
    ('n8n.webhook.maintenance_url',      ''),
    ('n8n.webhook.payment_reminder_url', ''),
    ('n8n.webhook.lease_reminder_url',   ''),
    ('n8n.webhook.rent_payment_url',     ''),
    ('n8n.webhook.critical_error_url',   ''),
    ('n8n.webhook.secret',               '')
ON CONFLICT (key) DO NOTHING;
