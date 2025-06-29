# Stripe Webhook Fix Guide

## Issues Fixed

### 1. Missing LeaseGeneratorUsage Table ✅
**Problem**: The webhook was trying to insert into a non-existent table
**Solution**: Created the table with proper structure and RLS policies

```sql
-- Table has been created with:
- userId tracking
- Payment status tracking  
- Stripe session/customer IDs
- Access expiration (24 hours after payment)
- Proper indexes and RLS policies
```

### 2. Wrong Environment Variable ✅
**Problem**: Using `REACT_SUPABASE_API_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
**Solution**: Updated webhook to use correct service role key

### 3. Poor Error Handling ✅
**Problem**: Unhandled exceptions causing 500 errors
**Solution**: Added comprehensive try-catch blocks and logging

## Manual Deployment Steps

Since Supabase CLI deployment is failing, follow these steps:

### Step 1: Set Environment Variables in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb/settings/vault
2. Ensure these secrets exist:
   - `STRIPE_SECRET_KEY` = `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`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_4r7rXmdPPofdwgaTtuSVIcYbYpardqmF`
   - `SUPABASE_SERVICE_ROLE_KEY` = Get from Settings → API
   - `SUPABASE_URL` = `https://bshjmbshupiibfiewpxb.supabase.co`

### Step 2: Update Webhook Function Code

1. Go to: https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb/functions
2. Click on `stripe-webhook` function
3. Replace the entire code with the contents of `/supabase/functions/stripe-webhook/index.ts`
4. Click "Deploy"

### Step 3: Verify the Webhook

1. Go to Stripe Dashboard → Webhooks
2. Find the webhook: `https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/stripe-webhook`
3. Click "Send test webhook"
4. Send a `checkout.session.completed` test event
5. Check the response - should be 200 OK

## Key Code Changes

### Environment Variable Fix
```typescript
// BEFORE (BROKEN):
const supabaseSecretKey = Deno.env.get('REACT_SUPABASE_API_KEY')!

// AFTER (FIXED):
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
```

### Error Handling
```typescript
// Added validation
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase configuration')
  return new Response('Supabase configuration error', { status: 500 })
}

// Added try-catch for each handler
try {
  await handleCheckoutCompleted(session, supabase, stripe)
} catch (error) {
  console.error('Error in handler:', error)
  throw error
}
```

### Type Safety
```typescript
// Added proper interfaces
interface StripeSession {
  id: string
  metadata?: { userId?: string; type?: string }
  // ... etc
}

// Type casting instead of any
const session = sessionData as StripeSession
```

## Testing Webhook Locally

If you want to test the webhook locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local function
stripe listen --forward-to https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
```

## Monitoring

After deployment, monitor the webhook:
1. Stripe Dashboard → Webhooks → View attempts
2. Supabase Dashboard → Functions → Logs
3. Check for 200 status codes

## Expected Results

✅ Webhook returns 200 status for all events
✅ LeaseGeneratorUsage records created for one-time payments
✅ Subscription records created/updated for subscriptions
✅ Proper error logging for debugging
✅ No more "other errors" in Stripe webhook logs