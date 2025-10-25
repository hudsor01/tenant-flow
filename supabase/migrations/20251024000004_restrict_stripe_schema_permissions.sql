-- Migration: Restrict Stripe Schema Foreign Table Permissions
-- Date: 2025-01-24
-- Description: Ensures Stripe foreign tables are only accessible via service_role (backend)

-- =====================================================
-- RESTRICT API ACCESS TO ALL STRIPE FOREIGN TABLES
-- =====================================================
-- The Stripe schema contains foreign data wrappers to Stripe API
-- These should NEVER be accessible to anon or authenticated users
-- Only service_role (backend) should access them

-- Get all foreign tables in stripe schema and revoke/grant permissions
DO $$
DECLARE
    ft_name text;
BEGIN
    -- Loop through all foreign tables in stripe schema
    FOR ft_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'stripe'
    LOOP
        -- Revoke all access from anon and authenticated
        EXECUTE format('REVOKE ALL ON stripe.%I FROM anon, authenticated', ft_name);
        
        -- Grant SELECT to service_role only
        EXECUTE format('GRANT SELECT ON stripe.%I TO service_role', ft_name);
        
        RAISE NOTICE 'Updated permissions for stripe.%', ft_name;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run to verify permissions:
-- SELECT 
--   n.nspname as schema,
--   c.relname as table,
--   r.rolname as role,
--   array_agg(p.privilege_type) as privileges
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- LEFT JOIN LATERAL unnest(c.relacl) acl ON true
-- LEFT JOIN pg_roles r ON r.oid = (acl).grantee
-- LEFT JOIN LATERAL unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p(privilege_type) ON has_table_privilege(r.oid, c.oid, p.privilege_type)
-- WHERE n.nspname = 'stripe'
-- GROUP BY n.nspname, c.relname, r.rolname
-- ORDER BY c.relname, r.rolname;
