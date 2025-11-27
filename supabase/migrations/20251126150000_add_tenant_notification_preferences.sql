-- Add notification_preferences column to tenants table
-- Stores tenant-specific notification preferences as JSONB

ALTER TABLE public.tenants
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "pushNotifications": true,
  "emailNotifications": true,
  "smsNotifications": false,
  "leaseNotifications": true,
  "maintenanceNotifications": true,
  "paymentReminders": true,
  "rentalApplications": true,
  "propertyNotices": true
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.tenants.notification_preferences IS 'Tenant-specific notification preferences stored as JSONB. Defaults to standard preferences if null.';