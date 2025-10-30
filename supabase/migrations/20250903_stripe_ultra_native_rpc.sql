-- Ultra-Native Stripe RPC Functions
-- Replaces forbidden service layers with direct Supabase RPC calls
-- Follows CLAUDE.md principles: NO ABSTRACTIONS, native fetch() only

-- ============================================
-- STRIPE CHECKOUT RPC FUNCTIONS
-- ============================================

-- Create Stripe checkout session using native fetch
CREATE OR REPLACE FUNCTION create_stripe_checkout_session(
  p_user_id UUID,
  p_plan_id TEXT,
  p_interval TEXT,
  p_success_url TEXT DEFAULT NULL,
  p_cancel_url TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_stripe_secret_key TEXT;
  v_user_email TEXT;
  v_user_name TEXT;
  v_customer_id TEXT;
  v_price_id TEXT;
  v_checkout_response JSONB;
  v_checkout_url TEXT;
  v_frontend_url TEXT;
BEGIN
  -- Security: Verify user owns this request
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create checkout for another user';
  END IF;

  -- Get Stripe secret key from secrets
  SELECT decrypted_secret INTO v_stripe_secret_key
  FROM vault.decrypted_secrets 
  WHERE name = 'STRIPE_SECRET_KEY';
  
  IF v_stripe_secret_key IS NULL THEN
    RAISE EXCEPTION 'STRIPE_SECRET_KEY not configured';
  END IF;

  -- Get frontend URL
  v_frontend_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FRONTEND_URL');

  IF v_frontend_url IS NULL THEN
    RAISE EXCEPTION 'FRONTEND_URL is required in vault.decrypted_secrets for Stripe checkout functionality';
  END IF;

  -- Get user details
  SELECT email, name INTO v_user_email, v_user_name
  FROM "users" 
  WHERE id = p_user_id;

  -- Get or create Stripe customer ID
  SELECT "stripeCustomerId" INTO v_customer_id
  FROM "subscription"
  WHERE "userId" = p_user_id
  ORDER BY "updatedAt" DESC
  LIMIT 1;

  -- Get price ID based on plan and interval
  v_price_id := CASE 
    WHEN p_plan_id = 'STARTER' AND p_interval = 'monthly' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_STARTER_MONTHLY')
    WHEN p_plan_id = 'STARTER' AND p_interval = 'annual' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_STARTER_ANNUAL')
    WHEN p_plan_id = 'GROWTH' AND p_interval = 'monthly' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_GROWTH_MONTHLY')
    WHEN p_plan_id = 'GROWTH' AND p_interval = 'annual' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_GROWTH_ANNUAL')
    WHEN p_plan_id = 'TENANTFLOW_MAX' AND p_interval = 'monthly' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_TENANTFLOW_MAX_MONTHLY')
    WHEN p_plan_id = 'TENANTFLOW_MAX' AND p_interval = 'annual' THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'STRIPE_PRICE_ID_TENANTFLOW_MAX_ANNUAL')
    ELSE NULL
  END;

  IF v_price_id IS NULL THEN
    RAISE EXCEPTION 'Invalid plan_id or interval: % %', p_plan_id, p_interval;
  END IF;

  -- If no customer ID, create customer first using native fetch
  IF v_customer_id IS NULL THEN
    SELECT net.http_post(
      'https://api.stripe.com/v1/customers',
      encode(
        'email=' || urlencode(v_user_email) || 
        CASE WHEN v_user_name IS NOT NULL THEN '&name=' || urlencode(v_user_name) ELSE '' END ||
        '&metadata[userId]=' || p_user_id::text,
        'utf8'
      ),
      'application/x-www-form-urlencoded',
      jsonb_build_object(
        'Authorization', 'Bearer ' || v_stripe_secret_key,
        'User-Agent', 'TenantFlow/1.0'
      )
    ) INTO v_checkout_response;

    IF (v_checkout_response->>'status_code')::int >= 400 THEN
      RAISE EXCEPTION 'Failed to create Stripe customer: %', v_checkout_response->>'body';
    END IF;

    v_customer_id := (v_checkout_response->'body')::jsonb->>'id';

    -- Store customer ID in subscription record
    INSERT INTO "subscription" ("userId", "stripeCustomerId", "status", "createdAt", "updatedAt")
    VALUES (p_user_id, v_customer_id, 'INCOMPLETE', NOW(), NOW())
    ON CONFLICT ("userId") DO UPDATE SET 
      "stripeCustomerId" = EXCLUDED."stripeCustomerId",
      "updatedAt" = NOW();
  END IF;

  -- Create checkout session using native fetch
  SELECT net.http_post(
    'https://api.stripe.com/v1/checkout/sessions',
    encode(
      'customer=' || v_customer_id ||
      '&line_items[0][price]=' || v_price_id ||
      '&line_items[0][quantity]=1' ||
      '&mode=subscription' ||
      '&success_url=' || urlencode(COALESCE(p_success_url, v_frontend_url || '/manage?success=true')) ||
      '&cancel_url=' || urlencode(COALESCE(p_cancel_url, v_frontend_url || '/pricing?canceled=true')) ||
      '&allow_promotion_codes=true' ||
      '&billing_address_collection=auto' ||
      '&payment_method_collection=if_required' ||
      '&automatic_tax[enabled]=true' ||
      '&subscription_data[metadata][userId]=' || p_user_id::text,
      'utf8'
    ),
    'application/x-www-form-urlencoded',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_stripe_secret_key,
      'User-Agent', 'TenantFlow/1.0'
    )
  ) INTO v_checkout_response;

  IF (v_checkout_response->>'status_code')::int >= 400 THEN
    RAISE EXCEPTION 'Failed to create checkout session: %', v_checkout_response->>'body';
  END IF;

  -- Return checkout session details
  RETURN jsonb_build_object(
    'sessionId', (v_checkout_response->'body')::jsonb->>'id',
    'url', (v_checkout_response->'body')::jsonb->>'url'
  );
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION create_stripe_checkout_session FROM public;
GRANT EXECUTE ON FUNCTION create_stripe_checkout_session TO authenticated;

-- ============================================
-- STRIPE PORTAL RPC FUNCTIONS
-- ============================================

-- Create Stripe customer portal session using native fetch
CREATE OR REPLACE FUNCTION create_stripe_portal_session(
  p_user_id UUID,
  p_return_url TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_stripe_secret_key TEXT;
  v_customer_id TEXT;
  v_portal_response JSONB;
  v_frontend_url TEXT;
BEGIN
  -- Security: Verify user owns this request
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create portal for another user';
  END IF;

  -- Get Stripe secret key from secrets
  SELECT decrypted_secret INTO v_stripe_secret_key
  FROM vault.decrypted_secrets 
  WHERE name = 'STRIPE_SECRET_KEY';
  
  IF v_stripe_secret_key IS NULL THEN
    RAISE EXCEPTION 'STRIPE_SECRET_KEY not configured';
  END IF;

  -- Get frontend URL
  v_frontend_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FRONTEND_URL');

  IF v_frontend_url IS NULL THEN
    RAISE EXCEPTION 'FRONTEND_URL is required in vault.decrypted_secrets for Stripe checkout functionality';
  END IF;

  -- Get customer ID
  SELECT "stripeCustomerId" INTO v_customer_id
  FROM "subscription"
  WHERE "userId" = p_user_id
  ORDER BY "updatedAt" DESC
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No Stripe customer found for user';
  END IF;

  -- Create portal session using native fetch
  SELECT net.http_post(
    'https://api.stripe.com/v1/billing_portal/sessions',
    encode(
      'customer=' || v_customer_id ||
      '&return_url=' || urlencode(COALESCE(p_return_url, v_frontend_url || '/manage')),
      'utf8'
    ),
    'application/x-www-form-urlencoded',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_stripe_secret_key,
      'User-Agent', 'TenantFlow/1.0'
    )
  ) INTO v_portal_response;

  IF (v_portal_response->>'status_code')::int >= 400 THEN
    RAISE EXCEPTION 'Failed to create portal session: %', v_portal_response->>'body';
  END IF;

  -- Return portal session URL
  RETURN jsonb_build_object(
    'url', (v_portal_response->'body')::jsonb->>'url'
  );
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION create_stripe_portal_session FROM public;
GRANT EXECUTE ON FUNCTION create_stripe_portal_session TO authenticated;

-- ============================================
-- STRIPE SETUP INTENT RPC FUNCTIONS
-- ============================================

-- Create Stripe setup intent for payment method using native fetch
CREATE OR REPLACE FUNCTION create_stripe_setup_intent(
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_stripe_secret_key TEXT;
  v_customer_id TEXT;
  v_setup_response JSONB;
BEGIN
  -- Security: Verify user owns this request
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create setup intent for another user';
  END IF;

  -- Get Stripe secret key from secrets
  SELECT decrypted_secret INTO v_stripe_secret_key
  FROM vault.decrypted_secrets 
  WHERE name = 'STRIPE_SECRET_KEY';
  
  IF v_stripe_secret_key IS NULL THEN
    RAISE EXCEPTION 'STRIPE_SECRET_KEY not configured';
  END IF;

  -- Get customer ID
  SELECT "stripeCustomerId" INTO v_customer_id
  FROM "subscription"
  WHERE "userId" = p_user_id
  ORDER BY "updatedAt" DESC
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No Stripe customer found for user';
  END IF;

  -- Create setup intent using native fetch
  SELECT net.http_post(
    'https://api.stripe.com/v1/setup_intents',
    encode(
      'customer=' || v_customer_id ||
      '&usage=off_session',
      'utf8'
    ),
    'application/x-www-form-urlencoded',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_stripe_secret_key,
      'User-Agent', 'TenantFlow/1.0'
    )
  ) INTO v_setup_response;

  IF (v_setup_response->>'status_code')::int >= 400 THEN
    RAISE EXCEPTION 'Failed to create setup intent: %', v_setup_response->>'body';
  END IF;

  -- Return setup intent client secret
  RETURN jsonb_build_object(
    'clientSecret', (v_setup_response->'body')::jsonb->>'client_secret'
  );
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION create_stripe_setup_intent FROM public;
GRANT EXECUTE ON FUNCTION create_stripe_setup_intent TO authenticated;

-- ============================================
-- STRIPE WEBHOOK VERIFICATION RPC FUNCTION
-- ============================================

-- Verify Stripe webhook signature using native crypto
CREATE OR REPLACE FUNCTION verify_stripe_webhook(
  p_payload TEXT,
  p_signature TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_webhook_secret TEXT;
  v_timestamp TEXT;
  v_signature_parts TEXT[];
  v_expected_signature TEXT;
  v_computed_signature TEXT;
BEGIN
  -- Get webhook secret from secrets
  SELECT decrypted_secret INTO v_webhook_secret
  FROM vault.decrypted_secrets 
  WHERE name = 'STRIPE_WEBHOOK_SECRET';
  
  IF v_webhook_secret IS NULL THEN
    RAISE EXCEPTION 'STRIPE_WEBHOOK_SECRET not configured';
  END IF;

  -- Parse signature header (format: t=timestamp,v1=signature)
  v_signature_parts := string_to_array(p_signature, ',');
  
  -- Extract timestamp
  v_timestamp := substring(v_signature_parts[1] from 3); -- Remove "t="
  
  -- Extract signature
  v_expected_signature := substring(v_signature_parts[2] from 4); -- Remove "v1="

  -- Compute expected signature
  v_computed_signature := encode(
    hmac(v_timestamp || '.' || p_payload, v_webhook_secret, 'sha256'),
    'hex'
  );

  -- Verify signature
  IF v_computed_signature != v_expected_signature THEN
    RAISE EXCEPTION 'Invalid webhook signature';
  END IF;

  -- Check timestamp (max 5 minutes old)
  IF extract(epoch from now()) - v_timestamp::bigint > 300 THEN
    RAISE EXCEPTION 'Webhook timestamp too old';
  END IF;

  -- Parse and return event
  RETURN p_payload::jsonb;
END;
$$;

-- Grant permissions for webhook endpoint (public access needed)
GRANT EXECUTE ON FUNCTION verify_stripe_webhook TO anon, authenticated, service_role;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- URL encoding function for safe parameter passing
CREATE OR REPLACE FUNCTION urlencode(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(input, '%', '%25'),
                    ' ', '%20'
                  ), '!', '%21'
                ), '"', '%22'
              ), '#', '%23'
            ), '$', '%24'
          ), '&', '%26'
        ), '''', '%27'
      ), '+', '%2B'
    ), '=', '%3D'
  );
END;
$$;

-- Create Stripe customer with trial subscription (for new user signup)
CREATE OR REPLACE FUNCTION create_stripe_customer_with_trial(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_price_id TEXT,
  p_trial_days INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stripe_key TEXT;
  v_customer_response JSONB;
  v_subscription_response JSONB;
  v_customer_id TEXT;
  v_subscription_id TEXT;
BEGIN
  -- Get Stripe secret key
  SELECT value INTO v_stripe_key FROM vault.decrypted_secrets WHERE name = 'STRIPE_SECRET_KEY';
  
  IF v_stripe_key IS NULL THEN
    RAISE EXCEPTION 'STRIPE_SECRET_KEY not found in vault';
  END IF;

  -- Create Stripe customer
  SELECT INTO v_customer_response
    content::JSONB
  FROM http((
    'POST',
    'https://api.stripe.com/v1/customers',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_stripe_key),
      http_header('Content-Type', 'application/x-www-form-urlencoded')
    ],
    'application/x-www-form-urlencoded',
    'email=' || url_encode(p_email) || '&name=' || url_encode(p_name) || '&metadata[userId]=' || url_encode(p_user_id::TEXT)
  )::http_request);

  -- Check customer creation response
  IF v_customer_response ? 'error' THEN
    RAISE EXCEPTION 'Stripe customer creation failed: %', v_customer_response->>'message';
  END IF;

  v_customer_id := v_customer_response->>'id';

  -- Create trial subscription
  SELECT INTO v_subscription_response
    content::JSONB
  FROM http((
    'POST',
    'https://api.stripe.com/v1/subscriptions',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_stripe_key),
      http_header('Content-Type', 'application/x-www-form-urlencoded')
    ],
    'application/x-www-form-urlencoded',
    'customer=' || url_encode(v_customer_id) || 
    '&items[0][price]=' || url_encode(p_price_id) ||
    '&trial_period_days=' || p_trial_days::TEXT ||
    '&payment_behavior=default_incomplete' ||
    '&payment_settings[save_default_payment_method]=off' ||
    '&payment_settings[payment_method_types][0]=card' ||
    '&metadata[userId]=' || url_encode(p_user_id::TEXT) ||
    '&metadata[plan]=free_trial' ||
    '&metadata[source]=auto_signup'
  )::http_request);

  -- Check subscription creation response
  IF v_subscription_response ? 'error' THEN
    RAISE EXCEPTION 'Stripe subscription creation failed: %', v_subscription_response->>'message';
  END IF;

  v_subscription_id := v_subscription_response->>'id';

  -- Return both IDs for the controller
  RETURN jsonb_build_object(
    'customerId', v_customer_id,
    'subscriptionId', v_subscription_id,
    'status', v_subscription_response->>'status',
    'trialEnd', v_subscription_response->'trial_end'
  );
END;
$$;

-- Comments
COMMENT ON FUNCTION create_stripe_checkout_session IS 'Ultra-native Stripe checkout session creation using direct fetch() calls per CLAUDE.md';
COMMENT ON FUNCTION create_stripe_portal_session IS 'Ultra-native Stripe portal session creation using direct fetch() calls per CLAUDE.md';  
COMMENT ON FUNCTION create_stripe_setup_intent IS 'Ultra-native Stripe setup intent creation using direct fetch() calls per CLAUDE.md';
COMMENT ON FUNCTION create_stripe_customer_with_trial IS 'Ultra-native Stripe customer and trial subscription creation for new user signups per CLAUDE.md';
COMMENT ON FUNCTION verify_stripe_webhook IS 'Ultra-native Stripe webhook verification without SDK dependencies per CLAUDE.md';