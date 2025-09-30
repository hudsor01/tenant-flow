-- CRITICAL SECURITY FIX: Function Search Path Mutable Vulnerability (CVE-2018-1058)
-- 
-- ISSUE: All 46 database functions have mutable search_path settings
-- RISK: SQL injection attacks through schema manipulation/poisoning
-- SEVERITY: CRITICAL for production security
-- 
-- FIX: Set immutable search_path on all functions to prevent schema injection attacks

-- GENERATED ALTER STATEMENTS with exact function signatures from database:

-- Core functions
ALTER FUNCTION public.get_dashboard_stats(user_id_param uuid) SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_stats(user_id_param text) SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at() SET search_path = 'public';

-- Property management functions
ALTER FUNCTION public.create_property(p_user_id uuid, p_name text, p_address text, p_type text, p_description text) SET search_path = 'public';
ALTER FUNCTION public.update_property(p_user_id uuid, p_property_id uuid, p_name text, p_address text, p_type text, p_description text) SET search_path = 'public';
ALTER FUNCTION public.update_property(p_user_id uuid, p_property_id uuid, p_name text, p_address text, p_description text) SET search_path = 'public';
ALTER FUNCTION public.delete_property(p_user_id uuid, p_property_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_property_by_id(p_user_id uuid, p_property_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_property_stats(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_property_units(p_user_id uuid, p_property_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_properties(p_user_id uuid, p_search text, p_limit integer, p_offset integer) SET search_path = 'public';

-- Tenant management functions
ALTER FUNCTION public.create_tenant(p_user_id uuid, p_name text, p_email text, p_phone text, p_emergency_contact text) SET search_path = 'public';
ALTER FUNCTION public.update_tenant(p_user_id uuid, p_tenant_id uuid, p_name text, p_email text, p_phone text, p_emergency_contact text) SET search_path = 'public';
ALTER FUNCTION public.delete_tenant(p_user_id uuid, p_tenant_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_tenant_by_id(p_user_id uuid, p_tenant_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_tenant_stats(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_tenants(p_user_id uuid, p_search text, p_invitation_status text, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) SET search_path = 'public';
ALTER FUNCTION public.send_tenant_invitation(p_user_id uuid, p_tenant_id uuid) SET search_path = 'public';
ALTER FUNCTION public.resend_tenant_invitation(p_user_id uuid, p_tenant_id uuid) SET search_path = 'public';

-- Unit management functions
ALTER FUNCTION public.create_unit(p_user_id uuid, p_property_id uuid, p_unit_number text, p_bedrooms integer, p_bathrooms integer, p_square_feet integer, p_rent numeric, p_status text) SET search_path = 'public';
ALTER FUNCTION public.create_unit(p_user_id uuid, p_property_id uuid, p_unit_number text, p_bedrooms integer, p_bathrooms integer, p_square_feet integer, p_rent numeric) SET search_path = 'public';
ALTER FUNCTION public.update_unit(p_user_id uuid, p_unit_id uuid, p_unit_number text, p_bedrooms integer, p_bathrooms integer, p_square_feet integer, p_rent numeric, p_status text) SET search_path = 'public';
ALTER FUNCTION public.delete_unit(p_user_id uuid, p_unit_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_unit_by_id(p_user_id uuid, p_unit_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_unit_stats(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_units(p_user_id uuid, p_property_id uuid, p_status text, p_search text, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) SET search_path = 'public';

-- Lease management functions
ALTER FUNCTION public.create_lease(p_user_id uuid, p_tenant_id uuid, p_unit_id uuid, p_start_date date, p_end_date date, p_rentamount numeric, p_security_deposit numeric, p_payment_frequency text, p_status text) SET search_path = 'public';
ALTER FUNCTION public.update_lease(p_user_id uuid, p_lease_id uuid, p_start_date date, p_end_date date, p_rentamount numeric, p_security_deposit numeric, p_payment_frequency text, p_status text) SET search_path = 'public';
ALTER FUNCTION public.delete_lease(p_user_id uuid, p_lease_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_lease_by_id(p_user_id uuid, p_lease_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_lease_stats(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_leases(p_user_id uuid, p_tenant_id uuid, p_unit_id uuid, p_property_id uuid, p_status text, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) SET search_path = 'public';
ALTER FUNCTION public.get_expiring_leases(p_user_id uuid, p_days integer) SET search_path = 'public';
ALTER FUNCTION public.terminate_lease(p_user_id uuid, p_lease_id uuid, p_reason text) SET search_path = 'public';
ALTER FUNCTION public.renew_lease(p_user_id uuid, p_lease_id uuid, p_new_end_date date) SET search_path = 'public';

-- Maintenance management functions
ALTER FUNCTION public.create_maintenance(p_user_id uuid, p_unit_id uuid, p_title text, p_description text, p_priority text, p_category text, p_scheduled_date timestamp without time zone, p_estimated_cost numeric) SET search_path = 'public';
ALTER FUNCTION public.update_maintenance(p_user_id uuid, p_maintenance_id uuid, p_title text, p_description text, p_priority text, p_category text, p_status text, p_scheduled_date timestamp without time zone, p_completed_date timestamp without time zone, p_estimated_cost numeric, p_actual_cost numeric, p_notes text) SET search_path = 'public';
ALTER FUNCTION public.delete_maintenance(p_user_id uuid, p_maintenance_id uuid) SET search_path = 'public';
ALTER FUNCTION public.cancel_maintenance(p_user_id uuid, p_maintenance_id uuid, p_reason text) SET search_path = 'public';
ALTER FUNCTION public.complete_maintenance(p_user_id uuid, p_maintenance_id uuid, p_actual_cost numeric, p_notes text) SET search_path = 'public';
ALTER FUNCTION public.get_maintenance_by_id(p_user_id uuid, p_maintenance_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_maintenance_stats(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_maintenance(p_user_id uuid, p_unit_id uuid, p_property_id uuid, p_priority text, p_category text, p_status text, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) SET search_path = 'public';
ALTER FUNCTION public.get_urgent_maintenance(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_overdue_maintenance(p_user_id uuid) SET search_path = 'public';

-- Notification functions - MAXIMUM SECURITY (empty search_path prevents all schema poisoning)
ALTER FUNCTION public.broadcast_notification_change() SET search_path = '';
ALTER FUNCTION public.cleanup_old_notifications(days_to_keep integer) SET search_path = '';
ALTER FUNCTION public.get_unread_notification_count(user_id text) SET search_path = '';
ALTER FUNCTION public.mark_all_notifications_read(user_id text) SET search_path = '';

-- Stripe functions - public schema needed for FDW access
ALTER FUNCTION public.execute_stripe_fdw_query(sql_query text) SET search_path = 'public';
ALTER FUNCTION public.get_stripe_customer_by_id(customer_id text) SET search_path = 'public';
ALTER FUNCTION public.get_stripe_customers(limit_count integer) SET search_path = 'public';
-- REMOVED: ALTER statements for get_stripe_payment_intents and get_stripe_prices
-- These RPC functions have been replaced with direct table queries in the billing repository
ALTER FUNCTION public.get_stripe_products(active_only boolean, limit_count integer) SET search_path = 'public';
ALTER FUNCTION public.get_stripe_subscription_analytics() SET search_path = 'public';
ALTER FUNCTION public.get_stripe_subscriptions(customer_id text, limit_count integer) SET search_path = 'public';

-- Add comments for security documentation
COMMENT ON FUNCTION public.get_dashboard_stats(user_id_param uuid) IS 
  'SECURITY: Fixed search_path to prevent schema injection attacks (CVE-2018-1058)';

COMMENT ON FUNCTION public.broadcast_notification_change() IS 
  'SECURITY: Empty search_path for maximum security - prevents all schema injection attacks';

COMMENT ON FUNCTION public.cleanup_old_notifications(days_to_keep integer) IS 
  'SECURITY: Empty search_path for maximum security on system maintenance functions';

-- Verification query - run this after migration to confirm fix
-- SELECT proname, pronamespace::regnamespace as schema, prosrc 
-- FROM pg_proc 
-- WHERE proname LIKE '%tenant%' OR proname LIKE '%property%' OR proname LIKE '%unit%'
-- ORDER BY proname;