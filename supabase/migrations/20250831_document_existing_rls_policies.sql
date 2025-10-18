-- COMPREHENSIVE RLS POLICY DOCUMENTATION
-- This file documents all existing Row Level Security policies in the TenantFlow database
-- Use this to recreate policies in new environments and maintain security consistency

-- =============================================================================
-- SECURE POLICIES (Already properly implemented)
-- =============================================================================

/*
-- Property Table (SECURE) 
CREATE POLICY "Users can only access their own properties" ON public."property"
  FOR ALL TO authenticated
  USING ("ownerId" = auth.uid()::text)
  WITH CHECK ("ownerId" = auth.uid()::text);

-- User Table (SECURE)
CREATE POLICY "Users can view and update their own record" ON public."users"
  FOR ALL TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Unit Table (SECURE)
CREATE POLICY "Users can only access units in their properties" ON public."unit"
  FOR ALL TO authenticated
  USING ("propertyId" IN (
    SELECT "property".id FROM "property" 
    WHERE "property"."ownerId" = auth.uid()::text
  ))
  WITH CHECK ("propertyId" IN (
    SELECT "property".id FROM "property" 
    WHERE "property"."ownerId" = auth.uid()::text
  ));

-- Lease Table (SECURE)
CREATE POLICY "Users can only access leases in their properties" ON public."lease"
  FOR ALL TO authenticated
  USING ("unitId" IN (
    SELECT u.id FROM "unit" u
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = auth.uid()::text
  ))
  WITH CHECK ("unitId" IN (
    SELECT u.id FROM "unit" u
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = auth.uid()::text
  ));

-- MaintenanceRequest Table (SECURE)
CREATE POLICY "Users can only access maintenance requests for their properties" ON public."maintenance_request"
  FOR ALL TO authenticated
  USING ("unitId" IN (
    SELECT u.id FROM "unit" u
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = auth.uid()::text
  ))
  WITH CHECK ("unitId" IN (
    SELECT u.id FROM "unit" u
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = auth.uid()::text
  ));

-- Document Table (SECURE)
CREATE POLICY "Users can only access documents for their properties" ON public."document"
  FOR ALL TO authenticated
  USING (
    ("propertyId" IS NOT NULL AND "propertyId" IN (
      SELECT "property".id FROM "property" 
      WHERE "property"."ownerId" = auth.uid()::text
    )) OR 
    ("leaseId" IS NOT NULL AND "leaseId" IN (
      SELECT l.id FROM "lease" l
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = auth.uid()::text
    )) OR 
    ("propertyId" IS NULL AND "leaseId" IS NULL)
  );

-- Invoice Table (SECURE)
CREATE POLICY "Users can manage their own invoices" ON public."invoice"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Subscription Table (SECURE)
CREATE POLICY "Users can view their own subscriptions" ON public."subscription"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can manage subscriptions" ON public."subscription"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Activity Table (SECURE)
CREATE POLICY "Users can view their own activities" ON public."Activity"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can create activities" ON public."Activity"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UserPreferences Table (SECURE)
CREATE POLICY "Users can manage their own preferences" ON public."UserPreferences"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- UserSession Table (SECURE)
CREATE POLICY "Users can manage their own sessions" ON public."UserSession"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);
*/

-- =============================================================================
-- NOTIFICATION POLICIES (SECURE)
-- =============================================================================

/*
-- InAppNotification Table (SECURE)
CREATE POLICY "Users can view and update their own notifications" ON public."InAppNotification"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can mark their notifications as read" ON public."InAppNotification"
  FOR UPDATE TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "System can manage all notifications" ON public."InAppNotification"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- NotificationLog Table (SECURE)
CREATE POLICY "Users can view their own notification logs" ON public."NotificationLog"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can create notification logs" ON public."NotificationLog"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ReminderLog Table (SECURE)
CREATE POLICY "Users can view their own reminder logs" ON public."ReminderLog"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can create reminder logs" ON public."ReminderLog"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- notifications Table (SECURE)
CREATE POLICY "Users can view their own notifications" ON public."notifications"
  FOR SELECT TO public
  USING (recipient_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON public."notifications"
  FOR UPDATE TO public
  USING (recipient_id = auth.uid()::text);

CREATE POLICY "Service can insert notifications" ON public."notifications"
  FOR INSERT TO public
  WITH CHECK (
    auth.role() = 'service_role'::text OR 
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "users".id = auth.uid()::text 
      AND "users".role = 'ADMIN'::"UserRole"
    )
  );

CREATE POLICY "Admins can delete notifications" ON public."notifications"
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "users".id = auth.uid()::text 
      AND "users".role = 'ADMIN'::"UserRole"
    )
  );
*/

-- =============================================================================
-- AUDIT AND LOGGING POLICIES (SECURE)
-- =============================================================================

/*
-- SecurityAuditLog Table (SECURE)
CREATE POLICY "Users can view their own security events" ON public."SecurityAuditLog"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can create security audit logs" ON public."SecurityAuditLog"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UserAccessLog Table (SECURE)
CREATE POLICY "Users can view their own access logs" ON public."UserAccessLog"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can create access logs" ON public."UserAccessLog"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UserFeatureAccess Table (SECURE)
CREATE POLICY "Users can view their own feature access" ON public."UserFeatureAccess"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can manage feature access" ON public."UserFeatureAccess"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
*/

-- =============================================================================
-- PAYMENT AND BILLING POLICIES (MOSTLY SECURE)
-- =============================================================================

/*
-- PaymentFailure Table (SECURE) 
CREATE POLICY "Service role can manage payment failures" ON public."PaymentFailure"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- PaymentAttempt Table (SECURE)
CREATE POLICY "Service role manages payment attempts" ON public."PaymentAttempt"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- WebhookEvent Table (SECURE)
CREATE POLICY "Service role can manage webhook events" ON public."WebhookEvent"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- FailedWebhookEvent Table (SECURE)
CREATE POLICY "Service role can manage failed webhook events" ON public."FailedWebhookEvent"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
*/

-- =============================================================================
-- BLOG AND PUBLIC CONTENT POLICIES (SECURE)
-- =============================================================================

/*
-- BlogArticle Table (SECURE)
CREATE POLICY "Anyone can read blog articles" ON public."BlogArticle"
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage blog articles" ON public."BlogArticle"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- BlogTag Table (SECURE)
CREATE POLICY "Anyone can read blog tags" ON public."BlogTag"
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage blog tags" ON public."BlogTag"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- _BlogArticleToBlogTag Table (SECURE)
CREATE POLICY "Anyone can read blog article tags" ON public."_BlogArticleToBlogTag"
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage blog article tags" ON public."_BlogArticleToBlogTag"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
*/

-- =============================================================================
-- SPECIAL USE CASE POLICIES
-- =============================================================================

/*
-- LeaseGeneratorUsage Table (SECURE)
CREATE POLICY "Users can view their own lease generator usage" ON public."LeaseGeneratorUsage"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

CREATE POLICY "System can track lease generator usage" ON public."LeaseGeneratorUsage"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- InvoiceLeadCapture Table (SECURE)
CREATE POLICY "Service role can manage invoice leads" ON public."InvoiceLeadCapture"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- wrappers_fdw_stats Table (NO RLS - System table)
-- This table has RLS disabled and is managed by the system

-- CustomerInvoice & CustomerInvoiceItem Tables
-- These appear to be public invoice generation tools
-- Current policies allow any authenticated user access
-- Confirm whether tighter access controls are required before production deploys
*/

-- =============================================================================
-- SUMMARY OF SECURITY POSTURE
-- =============================================================================

-- SECURE TABLES : 
-- Property, User, Unit, Lease, MaintenanceRequest, Document, Invoice, Subscription
-- Activity, UserPreferences, UserSession, InAppNotification, NotificationLog
-- ReminderLog, notifications, SecurityAuditLog, UserAccessLog, UserFeatureAccess
-- PaymentFailure, PaymentAttempt, WebhookEvent, FailedWebhookEvent
-- BlogArticle, BlogTag, _BlogArticleToBlogTag, LeaseGeneratorUsage, InvoiceLeadCapture

-- PREVIOUSLY VULNERABLE TABLES (FIXED):
-- Tenant (had "OR true" bypass - CRITICAL)
-- Expense, Inspection, Message, File (had unrestricted access - HIGH)
-- RentCharge, RentPayment, RentCollectionSettings, PaymentMethod (had unrestricted access - HIGH)

-- REVIEW NEEDED TABLES (REVIEW NEEDED):
-- CustomerInvoice, CustomerInvoiceItem (currently allow any authenticated user access)

-- SYSTEM TABLES (No RLS needed):
-- wrappers_fdw_stats (system table, RLS disabled)
