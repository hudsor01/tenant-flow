-- Test Stripe integration and webhook handling
begin;
select plan(6);

-- Test 1: Check Stripe-related tables exist
select has_table('public', 'Subscription', 'Subscription table should exist');
select has_table('public', 'webhook_events', 'webhook_events table should exist');

-- Test 2: Check Stripe sync functions exist
select has_function('public', 'handle_stripe_webhook', ARRAY['jsonb'], 'handle_stripe_webhook function should exist');

-- Test 3: Test subscription status validation
select col_has_check('public', 'Subscription', 'status', 'Subscription status should have check constraint');

-- Test 4: Test webhook event processing
insert into public.webhook_events (
  id,
  event_type,
  data,
  processed,
  created_at
) values (
  gen_random_uuid(),
  'customer.subscription.created',
  '{"id": "sub_test", "customer": "cus_test", "status": "active"}'::jsonb,
  false,
  now()
);

select results_eq(
  'select count(*) from public.webhook_events where event_type = ''customer.subscription.created''',
  ARRAY[1::bigint],
  'Should be able to insert webhook event'
);

-- Test 5: Test RLS on webhook_events (service role only)
select policies_are('public', 'webhook_events', ARRAY[
  'Only service role can access webhook events'
], 'webhook_events should be restricted to service role');

select * from finish();
rollback;