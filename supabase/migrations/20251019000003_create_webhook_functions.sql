-- Create trigger functions for webhooks and email automation
-- These functions use pg_net to make external HTTP requests from database triggers

-- Universal webhook function for n8n integration
CREATE OR REPLACE FUNCTION send_to_n8n()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
  http_response extensions.http_response;
BEGIN
  -- Get n8n webhook URL from Vault
  webhook_url := get_n8n_webhook_url();

  IF webhook_url IS NULL THEN
    RAISE WARNING 'n8n webhook URL not configured';
    RETURN NEW;
  END IF;

  -- Build payload with event metadata
  payload := jsonb_build_object(
    'event', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'timestamp', NOW(),
    'data', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'old_data', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END
  );

  -- Send webhook to n8n using synchronous http extension
  -- NOTE: Requires Cloudflare Bot Fight Mode to be DISABLED
  SELECT * INTO http_response FROM extensions.http((
    'POST',
    webhook_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    payload::text
  ));

  -- Log errors for debugging
  IF http_response.status >= 400 THEN
    RAISE WARNING 'n8n webhook failed with status %', http_response.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Send payment receipt email via Resend
CREATE OR REPLACE FUNCTION send_payment_receipt_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  api_key TEXT;
  tenant_record RECORD;
  property_record RECORD;
  email_payload JSONB;
BEGIN
  -- Only send email for successful payments
  IF NEW.status != 'PAID' THEN
    RETURN NEW;
  END IF;

  -- Get Resend API key from Vault
  api_key := get_resend_api_key();

  IF api_key IS NULL THEN
    RAISE WARNING 'Resend API key not configured';
    RETURN NEW;
  END IF;

  -- Get tenant information
  SELECT * INTO tenant_record
  FROM tenant
  WHERE id = NEW."tenantId";

  IF tenant_record IS NULL OR tenant_record.email IS NULL THEN
    RAISE WARNING 'Tenant email not found for payment %', NEW.id;
    RETURN NEW;
  END IF;

  -- Get property information
  SELECT * INTO property_record
  FROM property
  WHERE id = NEW."propertyId";

  -- Build email payload
  email_payload := jsonb_build_object(
    'from', 'TenantFlow <noreply@tenantflow.app>',
    'to', jsonb_build_array(tenant_record.email),
    'subject', format('Payment Receipt - %s', property_record.address),
    'html', format(
      '<h2>Payment Receipt</h2>
      <p>Hi %s,</p>
      <p>Thank you for your payment. Here are the details:</p>
      <ul>
        <li><strong>Amount:</strong> $%s</li>
        <li><strong>Payment Date:</strong> %s</li>
        <li><strong>Property:</strong> %s</li>
        <li><strong>Payment Method:</strong> %s</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>The TenantFlow Team</p>',
      tenant_record.name,
      NEW.amount,
      NEW."paidAt",
      property_record.address,
      COALESCE(NEW."paymentMethod", 'Not specified')
    )
  );

  -- Send email via Resend API (async)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    body := email_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', format('Bearer %s', api_key)
    )
  );

  RETURN NEW;
END;
$$;

-- Send emergency maintenance alert
CREATE OR REPLACE FUNCTION send_emergency_maintenance_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  api_key TEXT;
  property_owner RECORD;
  property_record RECORD;
  email_payload JSONB;
BEGIN
  -- Only send alert for EMERGENCY priority
  IF NEW.priority != 'EMERGENCY' THEN
    RETURN NEW;
  END IF;

  -- Get Resend API key from Vault
  api_key := get_resend_api_key();

  IF api_key IS NULL THEN
    RAISE WARNING 'Resend API key not configured';
    RETURN NEW;
  END IF;

  -- Get property information and owner
  SELECT p.*, u.email as owner_email, u."firstName", u."lastName"
  INTO property_record
  FROM property p
  JOIN "user" u ON p."ownerId" = u.id
  WHERE p.id = NEW."propertyId";

  IF property_record IS NULL OR property_record.owner_email IS NULL THEN
    RAISE WARNING 'Property owner email not found for maintenance request %', NEW.id;
    RETURN NEW;
  END IF;

  -- Build email payload
  email_payload := jsonb_build_object(
    'from', 'TenantFlow Alerts <alerts@tenantflow.app>',
    'to', jsonb_build_array(property_record.owner_email),
    'subject', format('🚨 EMERGENCY: %s', NEW.title),
    'html', format(
      '<h2 style="color: #dc2626;">🚨 Emergency Maintenance Request</h2>
      <p>Hi %s,</p>
      <p><strong>An emergency maintenance request has been submitted:</strong></p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
        <p><strong>Title:</strong> %s</p>
        <p><strong>Property:</strong> %s</p>
        <p><strong>Description:</strong> %s</p>
        <p><strong>Submitted:</strong> %s</p>
      </div>
      <p><strong>Immediate action required.</strong> Please log in to TenantFlow to review and respond.</p>
      <p>Best regards,<br>The TenantFlow Team</p>',
      COALESCE(property_record."firstName", 'Property Owner'),
      NEW.title,
      property_record.address,
      NEW.description,
      NEW."createdAt"
    )
  );

  -- Send email via Resend API (async)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    body := email_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', format('Bearer %s', api_key)
    )
  );

  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_to_n8n() TO service_role;
GRANT EXECUTE ON FUNCTION send_payment_receipt_email() TO service_role;
GRANT EXECUTE ON FUNCTION send_emergency_maintenance_alert() TO service_role;

-- Add comments
COMMENT ON FUNCTION send_to_n8n() IS 'SECURITY: Fixed search_path to prevent schema injection - Universal webhook function for n8n integration (fire-and-forget)';
COMMENT ON FUNCTION send_payment_receipt_email() IS 'SECURITY: Fixed search_path to prevent schema injection - Sends payment receipt email via Resend when payment status = PAID';
COMMENT ON FUNCTION send_emergency_maintenance_alert() IS 'SECURITY: Fixed search_path to prevent schema injection - Sends emergency alert email when maintenance priority = EMERGENCY';
