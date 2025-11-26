-- ============================================================================
-- COMPREHENSIVE RLS SIMPLIFICATION
-- ============================================================================
-- This migration completely rewrites all RLS policies to use a simple,
-- consistent approach based on user_type and direct table relationships.
--
-- DESIGN PHILOSOPHY:
-- - Use user_type from users table (OWNER, TENANT, etc.)
-- - Use direct relationships through property_owners and tenants tables
-- - NO JWT custom claims (except user_type in app_metadata)
-- - NO complex helper functions
-- - Consistent pattern across all tables
--
-- PATTERN:
-- - OWNERs: Check property_owner_id matches their property_owners.id
-- - TENANTs: Check tenant_id or through lease_tenants relationship
-- - SERVICE_ROLE: Full access for backend operations
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Simple Helper Functions
-- ============================================================================

-- Drop existing complex functions
DROP FUNCTION IF EXISTS public.user_is_property_owner(uuid);
DROP FUNCTION IF EXISTS public.user_is_tenant(uuid);

-- Get current user's property_owner_id (returns NULL if not an owner)
CREATE OR REPLACE FUNCTION public.get_current_property_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.property_owners WHERE user_id = auth.uid();
$$;

-- Get current user's tenant_id (returns NULL if not a tenant)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid();
$$;

-- Get current user's user_type
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT user_type FROM public.users WHERE id = auth.uid();
$$;

-- Grant permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_current_property_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_type() TO authenticated;

-- ============================================================================
-- STEP 2: Drop ALL Existing RLS Policies (Clean Slate)
-- ============================================================================

-- properties
DROP POLICY IF EXISTS "properties_access" ON public.properties;
DROP POLICY IF EXISTS "properties_service_role_access" ON public.properties;
DROP POLICY IF EXISTS "property_owners_delete_own_properties" ON public.properties;
DROP POLICY IF EXISTS "property_owners_insert_own_properties" ON public.properties;
DROP POLICY IF EXISTS "property_owners_manage_properties" ON public.properties;
DROP POLICY IF EXISTS "property_owners_select_own_properties" ON public.properties;
DROP POLICY IF EXISTS "property_owners_update_own_properties" ON public.properties;

-- units
DROP POLICY IF EXISTS "units_service_role_access" ON public.units;
DROP POLICY IF EXISTS "property_owners_manage_units" ON public.units;
DROP POLICY IF EXISTS "Property owners can delete units for their properties" ON public.units;
DROP POLICY IF EXISTS "Property owners can insert units for their properties" ON public.units;
DROP POLICY IF EXISTS "Property owners can select units for their properties" ON public.units;
DROP POLICY IF EXISTS "Property owners can update units for their properties" ON public.units;
DROP POLICY IF EXISTS "Service role full access to units" ON public.units;
DROP POLICY IF EXISTS "Tenants can select units they rent" ON public.units;

-- leases
DROP POLICY IF EXISTS "lease_owner_delete" ON public.leases;
DROP POLICY IF EXISTS "lease_owner_insert" ON public.leases;
DROP POLICY IF EXISTS "lease_owner_select" ON public.leases;
DROP POLICY IF EXISTS "lease_owner_update" ON public.leases;
DROP POLICY IF EXISTS "lease_service_role_access" ON public.leases;
DROP POLICY IF EXISTS "lease_tenant_select" ON public.leases;
DROP POLICY IF EXISTS "property_owners_manage_leases" ON public.leases;
DROP POLICY IF EXISTS "tenants_manage_leases" ON public.leases;

-- property_owners
DROP POLICY IF EXISTS "Property owners can delete own record" ON public.property_owners;
DROP POLICY IF EXISTS "Property owners can insert own record" ON public.property_owners;
DROP POLICY IF EXISTS "Property owners can select own record" ON public.property_owners;
DROP POLICY IF EXISTS "Property owners can update own record" ON public.property_owners;
DROP POLICY IF EXISTS "Service role full access to property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Allow auth admin to read property_owners" ON public.property_owners;

-- tenants
DROP POLICY IF EXISTS "Service role full access to tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can delete own record" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can insert own record" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can select own record" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can update own record" ON public.tenants;
DROP POLICY IF EXISTS "Property owners can select tenants for their properties" ON public.tenants;

-- users
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
DROP POLICY IF EXISTS "Users can select own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Allow auth admin to read users" ON public.users;

-- maintenance_requests
DROP POLICY IF EXISTS "Property owners full access to property maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Service role full access to maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can insert own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can select own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can update own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "property_owners_manage_maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "tenants_access_maintenance" ON public.maintenance_requests;

-- lease_tenants
DROP POLICY IF EXISTS "Property owners can delete lease tenants for their properties" ON public.lease_tenants;
DROP POLICY IF EXISTS "Property owners can insert lease tenants for their properties" ON public.lease_tenants;
DROP POLICY IF EXISTS "Property owners can select lease tenants for their properties" ON public.lease_tenants;
DROP POLICY IF EXISTS "Property owners can update lease tenants for their properties" ON public.lease_tenants;
DROP POLICY IF EXISTS "Service role full access to lease tenants" ON public.lease_tenants;
DROP POLICY IF EXISTS "Tenants can select own lease tenants" ON public.lease_tenants;

-- payment_methods
DROP POLICY IF EXISTS "Service role full access to payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenants can delete own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenants can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenants can select own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenants can update own payment methods" ON public.payment_methods;

-- rent_payments
DROP POLICY IF EXISTS "Property owners can select rent payments for their properties" ON public.rent_payments;
DROP POLICY IF EXISTS "Service role full access to rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can insert own rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can select own rent payments" ON public.rent_payments;

-- documents
DROP POLICY IF EXISTS "Property owners can delete documents for their entities" ON public.documents;
DROP POLICY IF EXISTS "Property owners can insert documents for their entities" ON public.documents;
DROP POLICY IF EXISTS "Property owners can select documents for their entities" ON public.documents;
DROP POLICY IF EXISTS "Service role full access to documents" ON public.documents;
DROP POLICY IF EXISTS "Tenants can select documents for their leases" ON public.documents;
DROP POLICY IF EXISTS "Tenants can select documents for their maintenance requests" ON public.documents;

-- expenses
DROP POLICY IF EXISTS "Property owners can delete expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Property owners can insert expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Property owners can select expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Property owners can update expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Service role full access to expenses" ON public.expenses;

-- payment_schedules
DROP POLICY IF EXISTS "Property owners can select payment schedules for their properties" ON public.payment_schedules;
DROP POLICY IF EXISTS "Service role full access to payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Tenants can select own payment schedules" ON public.payment_schedules;

-- payment_transactions
DROP POLICY IF EXISTS "Property owners can select payment transactions for their properties" ON public.payment_transactions;
DROP POLICY IF EXISTS "Service role full access to payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Tenants can select own payment transactions" ON public.payment_transactions;

-- property_images
DROP POLICY IF EXISTS "Property owners can delete images for their properties" ON public.property_images;
DROP POLICY IF EXISTS "Property owners can insert images for their properties" ON public.property_images;
DROP POLICY IF EXISTS "Property owners can select images for their properties" ON public.property_images;
DROP POLICY IF EXISTS "Property owners can update images for their properties" ON public.property_images;
DROP POLICY IF EXISTS "Service role full access to property images" ON public.property_images;

-- tenant_invitations
DROP POLICY IF EXISTS "Property owners can delete tenant invitations for their properties" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can insert tenant invitations for their properties" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can select tenant invitations for their properties" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can update tenant invitations for their properties" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Service role full access to tenant invitations" ON public.tenant_invitations;

-- notifications
DROP POLICY IF EXISTS "Service role full access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- notification_logs
DROP POLICY IF EXISTS "Service role full access to notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can select own notification logs" ON public.notification_logs;

-- activity
DROP POLICY IF EXISTS "Service role full access to activity" ON public.activity;
DROP POLICY IF EXISTS "Users can select own activity" ON public.activity;

-- user_preferences
DROP POLICY IF EXISTS "Service role full access to user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can select own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

-- user_access_log
DROP POLICY IF EXISTS "Service role full access to user access log" ON public.user_access_log;

-- user_feature_access
DROP POLICY IF EXISTS "Service role full access to user feature access" ON public.user_feature_access;
DROP POLICY IF EXISTS "Users can select own feature access" ON public.user_feature_access;

-- reports
DROP POLICY IF EXISTS "Property owners can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Property owners can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Property owners can select own reports" ON public.reports;
DROP POLICY IF EXISTS "Property owners can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Service role full access to reports" ON public.reports;

-- report_runs
DROP POLICY IF EXISTS "Property owners can select own report runs" ON public.report_runs;
DROP POLICY IF EXISTS "Service role full access to report runs" ON public.report_runs;

-- subscriptions
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can select own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow auth admin to read subscriptions" ON public.subscriptions;

-- security_audit_log
DROP POLICY IF EXISTS "Service role full access to security audit log" ON public.security_audit_log;

-- webhook_events
DROP POLICY IF EXISTS "Service role full access to webhook events" ON public.webhook_events;

-- webhook_attempts
DROP POLICY IF EXISTS "Service role full access to webhook attempts" ON public.webhook_attempts;

-- webhook_metrics
DROP POLICY IF EXISTS "Service role full access to webhook metrics" ON public.webhook_metrics;

-- rent_due
DROP POLICY IF EXISTS "Property owners can select rent due for their properties" ON public.rent_due;
DROP POLICY IF EXISTS "Service role full access to rent due" ON public.rent_due;
DROP POLICY IF EXISTS "Tenants can select own rent due" ON public.rent_due;

-- ============================================================================
-- STEP 3: Create New Simplified RLS Policies
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_service_role"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_auth_admin_select"
  ON public.users FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- ============================================================================
-- PROPERTY_OWNERS TABLE
-- ============================================================================
CREATE POLICY "property_owners_select_own"
  ON public.property_owners FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "property_owners_insert_own"
  ON public.property_owners FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "property_owners_update_own"
  ON public.property_owners FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "property_owners_delete_own"
  ON public.property_owners FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "property_owners_service_role"
  ON public.property_owners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "property_owners_auth_admin_select"
  ON public.property_owners FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================
CREATE POLICY "tenants_select_own"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    -- Property owners can see tenants in their properties
    EXISTS (
      SELECT 1 FROM public.lease_tenants lt
      JOIN public.leases l ON lt.lease_id = l.id
      WHERE lt.tenant_id = tenants.id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "tenants_insert_own"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenants_update_own"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenants_delete_own"
  ON public.tenants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tenants_service_role"
  ON public.tenants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================
CREATE POLICY "properties_select_owner"
  ON public.properties FOR SELECT
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "properties_insert_owner"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "properties_update_owner"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "properties_delete_owner"
  ON public.properties FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "properties_service_role"
  ON public.properties FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UNITS TABLE
-- ============================================================================
CREATE POLICY "units_select"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id() OR
    -- Tenants can see units they rent
    EXISTS (
      SELECT 1 FROM public.leases l
      JOIN public.lease_tenants lt ON l.id = lt.lease_id
      WHERE l.unit_id = units.id
        AND lt.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "units_insert_owner"
  ON public.units FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "units_update_owner"
  ON public.units FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "units_delete_owner"
  ON public.units FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "units_service_role"
  ON public.units FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- LEASES TABLE
-- ============================================================================
CREATE POLICY "leases_select"
  ON public.leases FOR SELECT
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id() OR
    -- Tenants can see their own leases
    EXISTS (
      SELECT 1 FROM public.lease_tenants lt
      WHERE lt.lease_id = leases.id
        AND lt.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "leases_insert_owner"
  ON public.leases FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "leases_update_owner"
  ON public.leases FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "leases_delete_owner"
  ON public.leases FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "leases_service_role"
  ON public.leases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- LEASE_TENANTS TABLE
-- ============================================================================
CREATE POLICY "lease_tenants_select"
  ON public.lease_tenants FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id() OR
    -- Property owners can see lease tenants for their leases
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_tenants.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "lease_tenants_insert_owner"
  ON public.lease_tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_tenants.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "lease_tenants_update_owner"
  ON public.lease_tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_tenants.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_tenants.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "lease_tenants_delete_owner"
  ON public.lease_tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_tenants.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "lease_tenants_service_role"
  ON public.lease_tenants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MAINTENANCE_REQUESTS TABLE
-- ============================================================================
CREATE POLICY "maintenance_requests_select"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "maintenance_requests_insert_tenant"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "maintenance_requests_update"
  ON public.maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    property_owner_id = get_current_property_owner_id() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "maintenance_requests_delete_owner"
  ON public.maintenance_requests FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "maintenance_requests_service_role"
  ON public.maintenance_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT_METHODS TABLE
-- ============================================================================
CREATE POLICY "payment_methods_select_tenant"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "payment_methods_insert_tenant"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "payment_methods_update_tenant"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "payment_methods_delete_tenant"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "payment_methods_service_role"
  ON public.payment_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RENT_PAYMENTS TABLE
-- ============================================================================
CREATE POLICY "rent_payments_select"
  ON public.rent_payments FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id() OR
    -- Property owners can see payments for their leases
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = rent_payments.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "rent_payments_insert_tenant"
  ON public.rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "rent_payments_service_role"
  ON public.rent_payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    -- Property owners can see documents for their properties
    (entity_type = 'property' AND entity_id IN (
      SELECT id FROM public.properties WHERE property_owner_id = get_current_property_owner_id()
    )) OR
    -- Property owners can see documents for their maintenance requests
    (entity_type = 'maintenance_request' AND entity_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_owner_id = get_current_property_owner_id()
    )) OR
    -- Tenants can see documents for their leases
    (entity_type = 'lease' AND entity_id IN (
      SELECT lease_id FROM public.lease_tenants WHERE tenant_id = get_current_tenant_id()
    )) OR
    -- Tenants can see documents for their maintenance requests
    (entity_type = 'maintenance_request' AND entity_id IN (
      SELECT id FROM public.maintenance_requests WHERE tenant_id = get_current_tenant_id()
    ))
  );

CREATE POLICY "documents_insert_owner"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (entity_type = 'property' AND entity_id IN (
      SELECT id FROM public.properties WHERE property_owner_id = get_current_property_owner_id()
    )) OR
    (entity_type = 'maintenance_request' AND entity_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_owner_id = get_current_property_owner_id()
    ))
  );

CREATE POLICY "documents_delete_owner"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    (entity_type = 'property' AND entity_id IN (
      SELECT id FROM public.properties WHERE property_owner_id = get_current_property_owner_id()
    )) OR
    (entity_type = 'maintenance_request' AND entity_id IN (
      SELECT id FROM public.maintenance_requests WHERE property_owner_id = get_current_property_owner_id()
    ))
  );

CREATE POLICY "documents_service_role"
  ON public.documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE POLICY "expenses_select_owner"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = expenses.maintenance_request_id
        AND mr.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "expenses_insert_owner"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = expenses.maintenance_request_id
        AND mr.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "expenses_update_owner"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = expenses.maintenance_request_id
        AND mr.property_owner_id = get_current_property_owner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = expenses.maintenance_request_id
        AND mr.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "expenses_delete_owner"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = expenses.maintenance_request_id
        AND mr.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "expenses_service_role"
  ON public.expenses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT_SCHEDULES TABLE
-- ============================================================================
CREATE POLICY "payment_schedules_select"
  ON public.payment_schedules FOR SELECT
  TO authenticated
  USING (
    -- Tenants can see their own payment schedules
    EXISTS (
      SELECT 1 FROM public.lease_tenants lt
      WHERE lt.lease_id = payment_schedules.lease_id
        AND lt.tenant_id = get_current_tenant_id()
    ) OR
    -- Property owners can see payment schedules for their leases
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = payment_schedules.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "payment_schedules_service_role"
  ON public.payment_schedules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT_TRANSACTIONS TABLE
-- ============================================================================
CREATE POLICY "payment_transactions_select"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    -- Tenants can see their own payment transactions
    EXISTS (
      SELECT 1 FROM public.rent_payments rp
      WHERE rp.id = payment_transactions.rent_payment_id
        AND rp.tenant_id = get_current_tenant_id()
    ) OR
    -- Property owners can see payment transactions for their leases
    EXISTS (
      SELECT 1 FROM public.rent_payments rp
      JOIN public.leases l ON rp.lease_id = l.id
      WHERE rp.id = payment_transactions.rent_payment_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "payment_transactions_service_role"
  ON public.payment_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PROPERTY_IMAGES TABLE
-- ============================================================================
CREATE POLICY "property_images_select_owner"
  ON public.property_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "property_images_insert_owner"
  ON public.property_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "property_images_update_owner"
  ON public.property_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.property_owner_id = get_current_property_owner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "property_images_delete_owner"
  ON public.property_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "property_images_service_role"
  ON public.property_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TENANT_INVITATIONS TABLE
-- ============================================================================
CREATE POLICY "tenant_invitations_select_owner"
  ON public.tenant_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = tenant_invitations.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "tenant_invitations_insert_owner"
  ON public.tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = tenant_invitations.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "tenant_invitations_update_owner"
  ON public.tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = tenant_invitations.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = tenant_invitations.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "tenant_invitations_delete_owner"
  ON public.tenant_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = tenant_invitations.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "tenant_invitations_service_role"
  ON public.tenant_invitations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_service_role"
  ON public.notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION_LOGS TABLE
-- ============================================================================
CREATE POLICY "notification_logs_select_own"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_logs.notification_id
        AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "notification_logs_service_role"
  ON public.notification_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ACTIVITY TABLE
-- ============================================================================
CREATE POLICY "activity_select_own"
  ON public.activity FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "activity_service_role"
  ON public.activity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================
CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences_delete_own"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_preferences_service_role"
  ON public.user_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER_FEATURE_ACCESS TABLE
-- ============================================================================
CREATE POLICY "user_feature_access_select_own"
  ON public.user_feature_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_feature_access_service_role"
  ON public.user_feature_access FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE POLICY "reports_select_owner"
  ON public.reports FOR SELECT
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_insert_owner"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_update_owner"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_delete_owner"
  ON public.reports FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_service_role"
  ON public.reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REPORT_RUNS TABLE
-- ============================================================================
CREATE POLICY "report_runs_select_owner"
  ON public.report_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_runs.report_id
        AND r.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "report_runs_service_role"
  ON public.report_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "subscriptions_service_role"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "subscriptions_auth_admin_select"
  ON public.subscriptions FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- ============================================================================
-- AUDIT/WEBHOOK/LOG TABLES (Service Role Only)
-- ============================================================================
CREATE POLICY "user_access_log_service_role"
  ON public.user_access_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "security_audit_log_service_role"
  ON public.security_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_events_service_role"
  ON public.webhook_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_attempts_service_role"
  ON public.webhook_attempts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_metrics_service_role"
  ON public.webhook_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RENT_DUE TABLE
-- ============================================================================
CREATE POLICY "rent_due_select"
  ON public.rent_due FOR SELECT
  TO authenticated
  USING (
    -- Tenants can see their own rent due
    tenant_id = get_current_tenant_id() OR
    -- Property owners can see rent due for their leases
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = rent_due.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );

CREATE POLICY "rent_due_service_role"
  ON public.rent_due FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- GRANT PERMISSIONS ON PUBLIC SCHEMA TO AUTH ADMIN
-- ============================================================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT SELECT ON public.property_owners TO supabase_auth_admin;
GRANT SELECT ON public.subscriptions TO supabase_auth_admin;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify)
-- ============================================================================
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;
--
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties';
--
-- SELECT
--   get_current_user_type() as user_type,
--   get_current_property_owner_id() as property_owner_id,
--   get_current_tenant_id() as tenant_id;
