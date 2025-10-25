-- Migration: Add Lease Expiry Notifications (Phase 2.2)
-- Automated notifications at 90/60/30 days before lease expiration
-- Uses pg_cron for daily scheduled checks

-- ============================================================================
-- FUNCTION: Check and create lease expiry notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_lease_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lease_record RECORD;
  days_until_expiry INTEGER;
  notification_type TEXT;
  notification_title TEXT;
  notification_content TEXT;
  property_name TEXT;
  unit_name TEXT;
  tenant_name TEXT;
BEGIN
  -- Loop through all active leases
  FOR lease_record IN
    SELECT
      l.id as lease_id,
      l."endDate",
      l."tenantId",
      l."unitId",
      l."propertyId",
      l."rentAmount",
      p.name as property_name,
      u."unitNumber" as unit_name,
      t.name as tenant_name,
      (t.user_id::uuid) as owner_id  -- Property owner's user ID
    FROM lease l
    INNER JOIN property p ON l."propertyId" = p.id
    INNER JOIN unit u ON l."unitId" = u.id
    INNER JOIN tenant t ON l."tenantId" = t.id
    WHERE l.status = 'ACTIVE'
      AND l."endDate" IS NOT NULL
      AND l."endDate" > NOW()  -- Only future leases
  LOOP
    -- Calculate days until expiry
    days_until_expiry := EXTRACT(DAY FROM (lease_record."endDate" - NOW()))::INTEGER;

    -- Check if we should send notification (90, 60, or 30 days)
    IF days_until_expiry IN (90, 60, 30) THEN
      -- Set notification details based on urgency
      CASE days_until_expiry
        WHEN 90 THEN
          notification_type := 'lease_expiry_90';
          notification_title := 'Lease Expiring in 3 Months';
        WHEN 60 THEN
          notification_type := 'lease_expiry_60';
          notification_title := 'Lease Expiring in 2 Months';
        WHEN 30 THEN
          notification_type := 'lease_expiry_30';
          notification_title := 'Lease Expiring in 30 Days';
      END CASE;

      notification_content := format(
        'Lease for %s at %s (Unit %s) expires on %s. Consider reaching out to discuss renewal options.',
        lease_record.tenant_name,
        lease_record.property_name,
        lease_record.unit_name,
        TO_CHAR(lease_record."endDate", 'Mon DD, YYYY')
      );

      -- Check if notification already exists for this lease + type combination
      IF NOT EXISTS (
        SELECT 1 FROM notification
        WHERE "leaseId" = lease_record.lease_id::text
          AND type = notification_type
          AND "createdAt" > (lease_record."endDate" - INTERVAL '95 days')  -- Within current expiry cycle
      ) THEN
        -- Insert notification
        INSERT INTO notification (
          "userId",
          type,
          title,
          content,
          priority,
          "actionUrl",
          "isRead",
          "leaseId",
          "tenantId",
          "unitId",
          "propertyId",
          metadata,
          "createdAt",
          "updatedAt"
        ) VALUES (
          lease_record.owner_id::text,
          notification_type,
          notification_title,
          notification_content,
          CASE
            WHEN days_until_expiry = 30 THEN 'high'
            WHEN days_until_expiry = 60 THEN 'medium'
            ELSE 'low'
          END,
          format('/manage/leases?leaseId=%s', lease_record.lease_id),
          false,
          lease_record.lease_id::text,
          lease_record."tenantId"::text,
          lease_record."unitId"::text,
          lease_record."propertyId"::text,
          jsonb_build_object(
            'daysUntilExpiry', days_until_expiry,
            'expiryDate', lease_record."endDate",
            'rentAmount', lease_record."rentAmount",
            'propertyName', lease_record.property_name,
            'unitNumber', lease_record.unit_name,
            'tenantName', lease_record.tenant_name
          ),
          NOW(),
          NOW()
        );

        RAISE NOTICE 'Created % notification for lease % (% days until expiry)',
          notification_type, lease_record.lease_id, days_until_expiry;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users (called by cron job as postgres user)
GRANT EXECUTE ON FUNCTION public.check_lease_expiry_notifications() TO postgres;

-- ============================================================================
-- CRON JOB: Schedule daily lease expiry check at 9 AM UTC
-- ============================================================================
-- Note: pg_cron runs as postgres user, so SECURITY DEFINER is required on function

SELECT cron.schedule(
  'lease-expiry-notifications',  -- Job name
  '0 9 * * *',                    -- Cron schedule: daily at 9 AM UTC
  $$SELECT public.check_lease_expiry_notifications();$$
);

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================
-- Check scheduled cron jobs:
-- SELECT * FROM cron.job WHERE jobname = 'lease-expiry-notifications';

-- Manually trigger for testing:
-- SELECT public.check_lease_expiry_notifications();

-- Check created notifications:
-- SELECT * FROM notification WHERE type LIKE 'lease_expiry_%' ORDER BY "createdAt" DESC;

COMMENT ON FUNCTION public.check_lease_expiry_notifications() IS
'Automated lease expiry notifications: creates notifications at 90/60/30 days before lease end date. Run daily via pg_cron.';
