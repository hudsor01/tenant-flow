-- Supabase RLS Policies Export
-- Generated: 2025-01-11
-- Source: tenant-flow database (bshjmbshupiibfiewpxb)

-- Enable RLS on all tables first
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogArticle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerInvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FailedWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InAppNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLeadCapture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaseGeneratorUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentFailure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReminderLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentCollectionSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserFeatureAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_BlogArticleToBlogTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processed_stripe_events" ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICY CREATION STATEMENTS
-- ========================================

-- Activity Table Policies
CREATE POLICY "System can create activities" ON "Activity"
AS PERMISSIVE FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Users can view their own activities" ON "Activity"
AS PERMISSIVE FOR SELECT TO authenticated
USING ("userId" = (auth.uid())::text);

-- BlogArticle Table Policies
CREATE POLICY "Anyone can read blog articles" ON "BlogArticle"
AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage blog articles" ON "BlogArticle"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

-- BlogTag Table Policies  
CREATE POLICY "Anyone can read blog tags" ON "BlogTag"
AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage blog tags" ON "BlogTag"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

-- CustomerInvoice Table Policies
CREATE POLICY "Authenticated users can manage customer invoices" ON "CustomerInvoice"
AS PERMISSIVE FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- CustomerInvoiceItem Table Policies
CREATE POLICY "Authenticated users can manage customer invoice items" ON "CustomerInvoiceItem"
AS PERMISSIVE FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Document Table Policies
CREATE POLICY "Users can only access documents for their properties" ON "document"
AS PERMISSIVE FOR ALL TO authenticated
USING (
  (("propertyId" IS NOT NULL) AND ("propertyId" IN ( 
    SELECT "property".id
    FROM "property"
    WHERE ("property"."ownerId" = (auth.uid())::text)
  ))) OR 
  (("leaseId" IS NOT NULL) AND ("leaseId" IN ( 
    SELECT l.id
    FROM (("lease" l
      JOIN "unit" u ON ((l."unitId" = u.id)))
      JOIN "property" p ON ((u."propertyId" = p.id)))
    WHERE (p."ownerId" = (auth.uid())::text)
  ))) OR 
  (("propertyId" IS NULL) AND ("leaseId" IS NULL))
)
WITH CHECK (
  (("propertyId" IS NOT NULL) AND ("propertyId" IN ( 
    SELECT "property".id
    FROM "property"
    WHERE ("property"."ownerId" = (auth.uid())::text)
  ))) OR 
  (("leaseId" IS NOT NULL) AND ("leaseId" IN ( 
    SELECT l.id
    FROM (("lease" l
      JOIN "unit" u ON ((l."unitId" = u.id)))
      JOIN "property" p ON ((u."propertyId" = p.id)))
    WHERE (p."ownerId" = (auth.uid())::text)
  ))) OR 
  (("propertyId" IS NULL) AND ("leaseId" IS NULL))
);

-- Expense Table Policies
CREATE POLICY "expense_property_owner_access" ON "expense"
AS PERMISSIVE FOR ALL TO authenticated
USING ("propertyId" IN ( 
  SELECT "property".id
  FROM "property"
  WHERE ("property"."ownerId" = (auth.uid())::text)
))
WITH CHECK ("propertyId" IN ( 
  SELECT "property".id
  FROM "property"
  WHERE ("property"."ownerId" = (auth.uid())::text)
));

CREATE POLICY "expense_service_access" ON "expense"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- FailedWebhookEvent Table Policies
CREATE POLICY "Service role can manage failed webhook events" ON "FailedWebhookEvent"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

-- File Table Policies
CREATE POLICY "file_owner_or_uploader_access" ON "File"
AS PERMISSIVE FOR ALL TO authenticated
USING (
  ("uploadedById" = (auth.uid())::text) OR 
  (("propertyId" IS NOT NULL) AND ("propertyId" IN ( 
    SELECT "property".id
    FROM "property"
    WHERE ("property"."ownerId" = (auth.uid())::text)
  ))) OR 
  (("maintenanceRequestId" IS NOT NULL) AND ("maintenanceRequestId" IN ( 
    SELECT mr.id
    FROM (("maintenance_request" mr
      JOIN "unit" u ON ((mr."unitId" = u.id)))
      JOIN "property" p ON ((u."propertyId" = p.id)))
    WHERE (p."ownerId" = (auth.uid())::text)
  )))
)
WITH CHECK (
  ("uploadedById" = (auth.uid())::text) OR 
  (("propertyId" IS NOT NULL) AND ("propertyId" IN ( 
    SELECT "property".id
    FROM "property"
    WHERE ("property"."ownerId" = (auth.uid())::text)
  ))) OR 
  (("maintenanceRequestId" IS NOT NULL) AND ("maintenanceRequestId" IN ( 
    SELECT mr.id
    FROM (("maintenance_request" mr
      JOIN "unit" u ON ((mr."unitId" = u.id)))
      JOIN "property" p ON ((u."propertyId" = p.id)))
    WHERE (p."ownerId" = (auth.uid())::text)
  )))
);

CREATE POLICY "file_service_access" ON "File"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- InAppNotification Table Policies
CREATE POLICY "Service role can insert notifications" ON "InAppNotification"
AS PERMISSIVE FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can manage all notifications" ON "InAppNotification"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can mark their notifications as read" ON "InAppNotification"
AS PERMISSIVE FOR UPDATE TO authenticated
USING ("userId" = (auth.uid())::text)
WITH CHECK ("userId" = (auth.uid())::text);

CREATE POLICY "Users can view their own notifications" ON "InAppNotification"
AS PERMISSIVE FOR SELECT TO authenticated
USING ("userId" = (auth.uid())::text);

-- Property Table Policies (CRITICAL - This is the main security boundary)
CREATE POLICY "Users can only access their own properties" ON "property"
AS PERMISSIVE FOR ALL TO authenticated
USING ("ownerId" = (auth.uid())::text)
WITH CHECK ("ownerId" = (auth.uid())::text);

-- User Table Policies (CRITICAL - User can only see their own record)
CREATE POLICY "Users can view and update their own record" ON "users"
AS PERMISSIVE FOR ALL TO authenticated
USING (id = (auth.uid())::text)
WITH CHECK (id = (auth.uid())::text);

-- Tenant Table Policies
CREATE POLICY "tenant_select_owner" ON "tenant"
AS PERMISSIVE FOR SELECT TO public
USING ("userId" = (auth.uid())::text);

CREATE POLICY "tenant_insert_self" ON "tenant"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ("userId" = (auth.uid())::text);

CREATE POLICY "tenant_modify_owner" ON "tenant"
AS PERMISSIVE FOR UPDATE TO public
USING ("userId" = (auth.uid())::text)
WITH CHECK ("userId" = (auth.uid())::text);

CREATE POLICY "tenant_delete_owner" ON "tenant"
AS PERMISSIVE FOR DELETE TO public
USING ("userId" = (auth.uid())::text);

CREATE POLICY "tenant_service_full_access" ON "tenant"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Unit Table Policies
CREATE POLICY "Users can only access units in their properties" ON "unit"
AS PERMISSIVE FOR ALL TO authenticated
USING ("propertyId" IN ( 
  SELECT "property".id
  FROM "property"
  WHERE ("property"."ownerId" = (auth.uid())::text)
))
WITH CHECK ("propertyId" IN ( 
  SELECT "property".id
  FROM "property"
  WHERE ("property"."ownerId" = (auth.uid())::text)
));

-- Lease Table Policies
CREATE POLICY "Users can only access leases in their properties" ON "lease"
AS PERMISSIVE FOR ALL TO authenticated
USING ("unitId" IN ( 
  SELECT u.id
  FROM ("unit" u
    JOIN "property" p ON ((u."propertyId" = p.id)))
  WHERE (p."ownerId" = (auth.uid())::text)
))
WITH CHECK ("unitId" IN ( 
  SELECT u.id
  FROM ("unit" u
    JOIN "property" p ON ((u."propertyId" = p.id)))
  WHERE (p."ownerId" = (auth.uid())::text)
));

-- MaintenanceRequest Table Policies
CREATE POLICY "Users can only access maintenance requests for their properties" ON "maintenance_request"
AS PERMISSIVE FOR ALL TO authenticated
USING ("unitId" IN ( 
  SELECT u.id
  FROM ("unit" u
    JOIN "property" p ON ((u."propertyId" = p.id)))
  WHERE (p."ownerId" = (auth.uid())::text)
))
WITH CHECK ("unitId" IN ( 
  SELECT u.id
  FROM ("unit" u
    JOIN "property" p ON ((u."propertyId" = p.id)))
  WHERE (p."ownerId" = (auth.uid())::text)
));

-- Subscription Table Policies
CREATE POLICY "System can manage subscriptions" ON "subscription"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions" ON "subscription"
AS PERMISSIVE FOR SELECT TO authenticated
USING ("userId" = (auth.uid())::text);

-- Invoice Table Policies
CREATE POLICY "Users can manage their own invoices" ON "invoice"
AS PERMISSIVE FOR ALL TO authenticated
USING ("userId" = (auth.uid())::text)
WITH CHECK ("userId" = (auth.uid())::text);

-- Payment and Rent Collection Policies (Service role manages these)
CREATE POLICY "Service role can manage payment failures" ON "PaymentFailure"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

CREATE POLICY "System can manage payment methods" ON "PaymentMethod"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

CREATE POLICY "rent_charge_service_access" ON "RentCharge"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "rent_payment_service_access" ON "RentPayment"
AS PERMISSIVE FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Webhook and System Policies
CREATE POLICY "Service role can manage webhook events" ON "WebhookEvent"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can access processed events" ON "processed_stripe_events"
AS PERMISSIVE FOR ALL TO service_role
USING (true);

-- Notification Policies
CREATE POLICY "Users can view their own notifications" ON "notifications"
AS PERMISSIVE FOR SELECT TO public
USING (recipient_id = (auth.uid())::text);

CREATE POLICY "Users can update their own notifications" ON "notifications"
AS PERMISSIVE FOR UPDATE TO public
USING (recipient_id = (auth.uid())::text);

CREATE POLICY "Service can insert notifications" ON "notifications"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ((auth.role() = 'service_role'::text) OR (EXISTS ( 
  SELECT 1
  FROM "users"
  WHERE (("users".id = (auth.uid())::text) AND ("users".role = 'ADMIN'::"UserRole"))
)));

-- Security and Audit Policies
CREATE POLICY "System can create security audit logs" ON "SecurityAuditLog"
AS PERMISSIVE FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Users can view their own security events" ON "SecurityAuditLog"
AS PERMISSIVE FOR SELECT TO authenticated
USING ("userId" = (auth.uid())::text);

-- User Preferences and Sessions
CREATE POLICY "Users can manage their own preferences" ON "UserPreferences"
AS PERMISSIVE FOR ALL TO authenticated
USING ("userId" = (auth.uid())::text)
WITH CHECK ("userId" = (auth.uid())::text);

CREATE POLICY "Users can manage their own sessions" ON "UserSession"
AS PERMISSIVE FOR ALL TO authenticated
USING ("userId" = (auth.uid())::text)
WITH CHECK ("userId" = (auth.uid())::text);

-- Feature Access and Logs
CREATE POLICY "System can manage feature access" ON "UserFeatureAccess"
AS PERMISSIVE FOR ALL TO service_role
WITH CHECK (true);

CREATE POLICY "Users can view their own feature access" ON "UserFeatureAccess"
AS PERMISSIVE FOR SELECT TO authenticated
USING ("userId" = (auth.uid())::text);

-- ========================================
-- END OF RLS POLICIES
-- ========================================

-- Note: This export contains all the critical RLS policies that secure your tenant-flow application.
-- The main security boundaries are:
-- 1. Users can only access their own properties (Property table)
-- 2. Users can only access their own user record (User table) 
-- 3. All related entities (Units, Leases, MaintenanceRequests, etc.) are secured via property ownership
-- 4. Service role has full access for backend operations
-- 5. Stripe/payment data is managed by service role only