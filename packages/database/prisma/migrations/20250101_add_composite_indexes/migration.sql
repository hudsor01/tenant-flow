-- Migration: Add Composite Database Indexes for Performance
-- Author: AI Assistant
-- Date: 2025-01-01

-- Security Audit Log composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_security_audit_log_composite_severity_timestamp 
ON "SecurityAuditLog" ("severity", "timestamp" DESC);

CREATE INDEX CONCURRENTLY idx_security_audit_log_composite_user_event_timestamp 
ON "SecurityAuditLog" ("userId", "eventType", "timestamp" DESC);

CREATE INDEX CONCURRENTLY idx_security_audit_log_composite_ip_timestamp 
ON "SecurityAuditLog" ("ipAddress", "timestamp" DESC);

-- User Session composite indexes for session management
CREATE INDEX CONCURRENTLY idx_user_session_composite_user_active_expires 
ON "UserSession" ("userId", "isActive", "expiresAt" DESC);

CREATE INDEX CONCURRENTLY idx_user_session_composite_refresh_active 
ON "UserSession" ("refreshTokenId", "isActive");

-- Activity log composite indexes for dashboard queries
CREATE INDEX CONCURRENTLY idx_activity_composite_user_entity_created 
ON "Activity" ("userId", "entityType", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_activity_composite_entity_created 
ON "Activity" ("entityType", "entityId", "createdAt" DESC);

-- Maintenance Request composite indexes for filtering and sorting
CREATE INDEX CONCURRENTLY idx_maintenance_composite_unit_status_created 
ON "MaintenanceRequest" ("unitId", "status", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_maintenance_composite_priority_status_created 
ON "MaintenanceRequest" ("priority", "status", "createdAt" DESC);

-- Rent Charge composite indexes for payment processing
CREATE INDEX CONCURRENTLY idx_rent_charge_composite_tenant_status_due 
ON "RentCharge" ("tenantId", "status", "dueDate" DESC);

CREATE INDEX CONCURRENTLY idx_rent_charge_composite_unit_due_status 
ON "RentCharge" ("unitId", "dueDate", "status");

CREATE INDEX CONCURRENTLY idx_rent_charge_composite_org_due_status 
ON "RentCharge" ("organizationId", "dueDate" DESC, "status");

-- Rent Payment composite indexes for financial reporting
CREATE INDEX CONCURRENTLY idx_rent_payment_composite_tenant_status_paid 
ON "RentPayment" ("tenantId", "status", "paidAt" DESC);

CREATE INDEX CONCURRENTLY idx_rent_payment_composite_org_status_paid 
ON "RentPayment" ("organizationId", "status", "paidAt" DESC);

-- Property Invoice composite indexes for business reporting
CREATE INDEX CONCURRENTLY idx_property_invoice_composite_owner_status_due 
ON "PropertyOwnerInvoice" ("ownerId", "status", "dueDate" DESC);

CREATE INDEX CONCURRENTLY idx_property_invoice_composite_org_status_issue 
ON "PropertyOwnerInvoice" ("organizationId", "status", "issueDate" DESC);

-- Notification Log composite indexes for notification system
CREATE INDEX CONCURRENTLY idx_notification_log_composite_user_type_sent 
ON "NotificationLog" ("userId", "type", "sentAt" DESC);

-- In-App Notification composite indexes for notification center
CREATE INDEX CONCURRENTLY idx_in_app_notification_composite_user_priority_created 
ON "InAppNotification" ("userId", "priority", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_in_app_notification_composite_user_type_read 
ON "InAppNotification" ("userId", "type", "isRead", "createdAt" DESC);

-- Security Event composite indexes for security monitoring
CREATE INDEX CONCURRENTLY idx_security_event_composite_user_type_created 
ON "SecurityEvent" ("userId", "eventType", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_security_event_composite_severity_type_created 
ON "SecurityEvent" ("severity", "eventType", "createdAt" DESC);

-- Webhook Event composite indexes for webhook processing
CREATE INDEX CONCURRENTLY idx_webhook_event_composite_type_processed_created 
ON "WebhookEvent" ("eventType", "processed", "createdAt" DESC);

-- Failed Webhook Event composite indexes for retry processing
CREATE INDEX CONCURRENTLY idx_failed_webhook_composite_type_failure_retry 
ON "FailedWebhookEvent" ("eventType", "failureCount", "nextRetryAt");

-- Payment Failure composite indexes for payment retry logic
CREATE INDEX CONCURRENTLY idx_payment_failure_composite_subscription_resolved_retry 
ON "PaymentFailure" ("subscriptionId", "resolved", "nextRetryAt");

-- Lease composite indexes for lease management
CREATE INDEX CONCURRENTLY idx_lease_composite_tenant_status_dates 
ON "Lease" ("tenantId", "status", "startDate" DESC, "endDate" DESC);

CREATE INDEX CONCURRENTLY idx_lease_composite_unit_status_dates 
ON "Lease" ("unitId", "status", "endDate" DESC);

-- Document composite indexes for document management
CREATE INDEX CONCURRENTLY idx_document_composite_property_type_created 
ON "Document" ("propertyId", "type", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_document_composite_lease_type_created 
ON "Document" ("leaseId", "type", "createdAt" DESC);

-- File composite indexes for storage management
CREATE INDEX CONCURRENTLY idx_file_composite_property_created 
ON "File" ("propertyId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_file_composite_user_created 
ON "File" ("uploadedById", "createdAt" DESC);

-- Subscription composite indexes for billing management
CREATE INDEX CONCURRENTLY idx_subscription_composite_user_status_created 
ON "Subscription" ("userId", "status", "createdAt" DESC);

-- Invoice composite indexes for financial reporting
CREATE INDEX CONCURRENTLY idx_invoice_composite_user_status_date 
ON "Invoice" ("userId", "status", "invoiceDate" DESC);

-- Property composite indexes for property search and filtering
CREATE INDEX CONCURRENTLY idx_property_composite_owner_type_created 
ON "Property" ("ownerId", "propertyType", "createdAt" DESC);

-- Unit composite indexes for unit search and occupancy
CREATE INDEX CONCURRENTLY idx_unit_composite_property_status_created 
ON "Unit" ("propertyId", "status", "createdAt" DESC);

-- Tenant composite indexes for tenant management
CREATE INDEX CONCURRENTLY idx_tenant_composite_user_created 
ON "Tenant" ("userId", "createdAt" DESC);

-- Expense composite indexes for expense tracking
CREATE INDEX CONCURRENTLY idx_expense_composite_property_category_date 
ON "Expense" ("propertyId", "category", "date" DESC);

-- Inspection composite indexes for inspection scheduling
CREATE INDEX CONCURRENTLY idx_inspection_composite_property_status_scheduled 
ON "Inspection" ("propertyId", "status", "scheduledDate" DESC);

CREATE INDEX CONCURRENTLY idx_inspection_composite_inspector_scheduled 
ON "Inspection" ("inspectorId", "scheduledDate" DESC);

-- ReminderLog composite indexes for reminder processing
CREATE INDEX CONCURRENTLY idx_reminder_log_composite_user_type_status_sent 
ON "ReminderLog" ("userId", "type", "status", "sentAt" DESC);

-- UserSession cleanup optimization index
CREATE INDEX CONCURRENTLY idx_user_session_cleanup 
ON "UserSession" ("isActive", "expiresAt") WHERE "isActive" = false;

-- Blog Article composite indexes for content management
CREATE INDEX CONCURRENTLY idx_blog_article_composite_status_published_featured 
ON "BlogArticle" ("status", "publishedAt" DESC, "featured");

CREATE INDEX CONCURRENTLY idx_blog_article_composite_category_status_published 
ON "BlogArticle" ("category", "status", "publishedAt" DESC);