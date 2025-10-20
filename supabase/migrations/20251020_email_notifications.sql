-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to send email via Resend
CREATE OR REPLACE FUNCTION send_email_via_resend(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT,
  p_from TEXT DEFAULT 'TenantFlow <noreply@tenantflow.app>'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resend_api_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get Resend API key from environment (set via Supabase dashboard)
  v_resend_api_key := current_setting('app.settings.resend_api_key', true);

  IF v_resend_api_key IS NULL THEN
    RAISE EXCEPTION 'Resend API key not configured';
  END IF;

  -- Make async HTTP request to Resend API
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', p_from,
      'to', ARRAY[p_to],
      'subject', p_subject,
      'html', p_html
    )
  ) INTO v_request_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create helper function for trial ending email
CREATE OR REPLACE FUNCTION send_trial_ending_email(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_days_remaining INTEGER,
  p_trial_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_html TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE WARNING 'User email not found for user_id: %', p_user_id;
    RETURN false;
  END IF;

  -- Build email HTML
  v_html := format('
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Trial Ends Soon</h2>
      <p>Hi there,</p>
      <p>Your free trial ends in %s days on %s.</p>
      <p>Upgrade to continue using TenantFlow without interruption.</p>
      <p><a href="https://tenantflow.app/pricing" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Upgrade Now</a></p>
    </div>
  ', p_days_remaining, to_char(p_trial_end, 'Mon DD, YYYY'));

  -- Send email
  RETURN send_email_via_resend(
    p_to := v_email,
    p_subject := 'Your Trial Ends Soon',
    p_html := v_html
  );
END;
$$;

-- Create helper function for payment failed email
CREATE OR REPLACE FUNCTION send_payment_failed_email(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_amount INTEGER,
  p_currency TEXT,
  p_attempt_count INTEGER,
  p_failure_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_html TEXT;
  v_amount_formatted TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE WARNING 'User email not found for user_id: %', p_user_id;
    RETURN false;
  END IF;

  -- Format amount
  v_amount_formatted := '$' || (p_amount::NUMERIC / 100)::TEXT;

  -- Build email HTML
  v_html := format('
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Failed</h2>
      <p>Hi there,</p>
      <p>We couldn''t process your payment of %s %s.</p>
      %s
      <p>Please update your payment method to continue using TenantFlow.</p>
      <p><a href="https://tenantflow.app/settings/billing" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a></p>
      %s
    </div>
  ',
    v_amount_formatted,
    upper(p_currency),
    CASE WHEN p_failure_message IS NOT NULL
      THEN '<p><strong>Reason:</strong> ' || p_failure_message || '</p>'
      ELSE ''
    END,
    CASE WHEN p_attempt_count > 2
      THEN '<p style="color: #dc3545;"><strong>Note:</strong> This is attempt #' || p_attempt_count || '. Your subscription may be cancelled if payment continues to fail.</p>'
      ELSE ''
    END
  );

  -- Send email
  RETURN send_email_via_resend(
    p_to := v_email,
    p_subject := 'Payment Failed - Action Required',
    p_html := v_html
  );
END;
$$;

-- Create helper function for payment success email
CREATE OR REPLACE FUNCTION send_payment_success_email(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_amount_paid INTEGER,
  p_currency TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_html TEXT;
  v_amount_formatted TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE WARNING 'User email not found for user_id: %', p_user_id;
    RETURN false;
  END IF;

  -- Format amount
  v_amount_formatted := '$' || (p_amount_paid::NUMERIC / 100)::TEXT;

  -- Build email HTML
  v_html := format('
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Received</h2>
      <p>Hi there,</p>
      <p>Thank you! We''ve successfully processed your payment of %s %s.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Amount Paid:</strong> %s %s</p>
        <p><strong>Payment Date:</strong> %s</p>
      </div>
      <p>Your subscription is active and you have full access to TenantFlow.</p>
      <p><a href="https://tenantflow.app/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
    </div>
  ',
    v_amount_formatted,
    upper(p_currency),
    v_amount_formatted,
    upper(p_currency),
    to_char(now(), 'Mon DD, YYYY')
  );

  -- Send email
  RETURN send_email_via_resend(
    p_to := v_email,
    p_subject := 'Payment Receipt',
    p_html := v_html
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION send_email_via_resend TO authenticated;
GRANT EXECUTE ON FUNCTION send_trial_ending_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_payment_failed_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_payment_success_email TO authenticated;

-- Comment the functions
COMMENT ON FUNCTION send_email_via_resend IS 'Send email via Resend API using pg_net extension';
COMMENT ON FUNCTION send_trial_ending_email IS 'Send trial ending notification email';
COMMENT ON FUNCTION send_payment_failed_email IS 'Send payment failed notification with admin alert for multiple failures';
COMMENT ON FUNCTION send_payment_success_email IS 'Send payment success receipt email';
