# Stripe Integration Gap Analysis & Action Plan
**TenantFlow Property Management SaaS**
**Generated**: 2025-10-18
**Status**: Production Implementation Review

---

## Executive Summary

**Current State**: Stripe integration is **70% complete** with critical infrastructure in place but missing key SaaS features for production launch.

**Critical Finding**: **DUAL WEBHOOK SYSTEMS** causing potential data conflicts:
- ✅ NEW: Stripe Sync Engine (`/webhooks/stripe-sync`) - Auto-syncs to `stripe.*` schema
- ⚠️ OLD: Custom webhook handler (`/stripe/webhook`) - Manual event processing to `public.subscription`

**Immediate Action Required**: Consolidate to single webhook system before production launch.

---

## 1. Stripe Account Configuration ✅

**Status**: Products and pricing configured correctly

### Products (3 tiers)
| Product | ID | Monthly | Yearly | Yearly Savings |
|---------|-----|---------|--------|----------------|
| **starter** | `prod_SYGfsoEP9NQYBe` | $29 | $319 | 8% |
| **growth** | `prod_SYGgSJej35UY9P` | $79 | $869 | 8% |
| **tenantflow-max** | `prod_SYGhD77eyB254d` | $199 | $2,189 | 8% |

**Pricing IDs**:
- starter: `price_1SWQ4sP3WCR53Sdoo2yJXJCB` (monthly), `price_1SWQ4sP3WCR53SdoJJrpW7DU` (yearly)
- growth: `price_1SWQ4sP3WCR53SdoMD6HA0dZ` (monthly), `price_1SWQ4sP3WCR53SdoOttkHFj0` (yearly)
- tenantflow-max: `price_1SWQ4sP3WCR53SdojyNdUKNj` (monthly), `price_1SWQ4sP3WCR53SdoJdUx5BIe` (yearly)

**Test Data**: 5 customers exist, 0 active subscriptions

---

## 2. Implementation Status by Component

### ✅ IMPLEMENTED (70% Complete)

#### Backend Infrastructure
- ✅ **Stripe Sync Engine Integration** ([stripe-sync.controller.ts](apps/backend/src/modules/stripe-sync/stripe-sync.controller.ts))
  - Auto-syncs all Stripe data to `stripe.*` schema
  - Handles signature verification
  - Links customers to users via email
  - Uses official @supabase/stripe-sync-engine v0.45.0

- ✅ **Database Schema** ([20251018_stripe_sync_engine_user_mapping.sql](supabase/migrations/20251018_stripe_sync_engine_user_mapping.sql))
  - Extended `stripe.customers` with indexed `user_id` column
  - PostgreSQL SECURITY DEFINER functions for cross-schema access
  - Production-grade, idempotent migration
  - O(1) user→customer lookups

- ✅ **User Endpoint** ([users.controller.ts](apps/backend/src/modules/users/users.controller.ts))
  - `GET /users/me` returns `stripeCustomerId`
  - Fast indexed lookup via `get_stripe_customer_by_user_id()`
  - Graceful degradation if stripe schema not ready

- ✅ **Legacy Billing Module** ([stripe.controller.ts](apps/backend/src/modules/billing/stripe.controller.ts))
  - 18 endpoints for payments, subscriptions, checkout
  - Custom webhook handler with event emitter pattern
  - Payment intents, setup intents, subscriptions
  - Customer Portal session creation
  - Stripe Connect for multi-tenant payments

#### Frontend Components
- ✅ **Stripe Pricing Table** ([stripe-pricing-table.tsx](apps/frontend/src/components/pricing/stripe-pricing-table.tsx))
  - Native Stripe-hosted pricing table component
  - Production pricing table ID configured: `prctbl_1SBGrNP3WCR53SdoJjTotskB`
  - Supports customer email pre-fill
  - Secure script loading with error handling

- ✅ **Customer Portal Button** ([customer-portal.tsx](apps/frontend/src/components/pricing/customer-portal.tsx))
  - Uses real Stripe customer ID from `useUser()` hook
  - Redirects to Stripe-hosted portal
  - Shows "Subscribe Now" if no active subscription

- ✅ **Embedded Checkout** ([stripe-provider.tsx](apps/frontend/src/providers/stripe-provider.tsx))
  - React provider wrapping `@stripe/react-stripe-js`
  - Creates checkout sessions via `/stripe/create-embedded-checkout-session`
  - Supports payment/subscription/setup modes

- ✅ **User Hook** ([use-current-user.ts](apps/frontend/src/hooks/api/use-current-user.ts))
  - TanStack Query hook fetching user + Stripe customer ID
  - 5-minute stale time, 10-minute garbage collection
  - Single retry on failure

#### Stripe.js Integration
- ✅ **Singleton Client** ([stripe-client.ts](apps/frontend/src/lib/stripe/stripe-client.ts))
  - Loads Stripe.js once, reuses across app
  - Used for Customer Portal redirects

---

### ⚠️ CRITICAL ISSUES (Must Fix Before Production)

#### 1. **DUAL WEBHOOK SYSTEMS** 🚨 P0
**Problem**: Two webhook endpoints processing same events

**Current State**:
```
/webhooks/stripe-sync (NEW)          /stripe/webhook (OLD)
         ↓                                   ↓
   Stripe Sync Engine              Custom Event Emitter
         ↓                                   ↓
   stripe.* schema              public.subscription table
         ↓                                   ↓
   auto-synced data                manual processing
```

**Conflicts**:
- `customer.subscription.created` processed by BOTH systems
- `stripe.subscriptions` vs `public.subscription` - which is source of truth?
- Old system queries `users.stripeCustomerId` (doesn't exist in new architecture)
- Old system writes to `user_access_log` (deleted in cleanup migration)

**Impact**: Data inconsistency, duplicate processing, potential race conditions

**Solution Options**:

**OPTION A - Recommended**: Migrate to Stripe Sync Engine only
```diff
- Remove: apps/backend/src/modules/billing/stripe-event-processor.service.ts
- Remove: Custom @OnEvent handlers for customer/subscription/invoice events
- Remove: public.subscription table (replaced by stripe.subscriptions)
+ Query stripe.subscriptions via PostgreSQL functions
+ Update frontend to use stripe.* schema data
```

**OPTION B - Keep Dual System**: Add custom logic after sync
```diff
+ Move custom business logic to separate service
+ Query stripe.* schema AFTER Sync Engine processes
+ Keep public.subscription for app-specific metadata only
+ Add foreign key: public.subscription.stripe_subscription_id → stripe.subscriptions.id
```

**Recommendation**: **OPTION A** - Simpler, single source of truth, official Stripe pattern

#### 2. **Database Migration Not Applied** 🚨 P0
**Problem**: Production migration created but not deployed

**Missing**:
```sql
-- stripe.customers.user_id column doesn't exist yet
-- PostgreSQL functions not created
-- Webhook won't be able to link customers to users
```

**Action**: Apply migration to production Supabase immediately

#### 3. **Webhook Not Configured in Stripe** 🚨 P0
**Problem**: Stripe Dashboard doesn't know about webhook endpoint

**Missing**:
- Webhook endpoint URL not registered
- No events being sent to backend
- STRIPE_WEBHOOK_SECRET not set in Railway

**Action**:
1. Register webhook in Stripe Dashboard: `https://api.tenantflow.app/api/v1/webhooks/stripe-sync`
2. Select events: `customer.*`, `subscription.*`, `invoice.*`, `payment_intent.*`
3. Copy webhook signing secret
4. Add to Railway: `doppler secrets set STRIPE_WEBHOOK_SECRET wh_sec_...`

---

### ❌ MISSING FEATURES (30% Gap)

Based on [Stripe SaaS Integration Guide](https://stripe.com/docs/billing/subscriptions/build-subscriptions):

#### 1. **Free Trials** ❌
**Status**: Not implemented
**User Impact**: Can't offer 14-day trial to new customers
**Required For**: Standard SaaS onboarding pattern

**Implementation**:
```typescript
// Backend: stripe.controller.ts - create-subscription endpoint
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 14, // ADD THIS
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
})
```

**Frontend**: Update pricing page to show "Start 14-day trial" instead of "Subscribe"

**Effort**: 2 hours
**Priority**: P1 (high impact, low effort)

#### 2. **Coupons & Discounts** ❌
**Status**: Not implemented
**User Impact**: Can't offer promotional discounts or partner deals

**Required**:
- Create coupons in Stripe Dashboard or via API
- Apply during checkout session creation
- Show discount in pricing table

**Implementation**:
```typescript
// Apply coupon to checkout session
const session = await stripe.checkout.sessions.create({
  // ... existing config
  discounts: [{
    coupon: 'LAUNCH2025' // 20% off first 3 months
  }]
})
```

**Effort**: 4 hours
**Priority**: P2 (nice-to-have for launch promotions)

#### 3. **Automatic Tax Calculation** ❌
**Status**: Not implemented
**User Impact**: Manual tax compliance burden, potential legal issues

**Stripe Tax Features**:
- Auto-calculates sales tax/VAT based on customer location
- Handles tax registration requirements
- Generates tax reports for filing

**Implementation**:
```typescript
// Enable in checkout session
const session = await stripe.checkout.sessions.create({
  // ... existing config
  automatic_tax: { enabled: true }
})
```

**Setup Required**:
1. Enable Stripe Tax in Dashboard
2. Register tax IDs
3. Set up tax settings per product

**Effort**: 8 hours (includes tax registration)
**Priority**: P0 (legal requirement for many jurisdictions)

#### 4. **Revenue Recovery (Failed Payments)** ❌
**Status**: Partially implemented (webhook handlers exist but no retry logic)

**Current Gap**:
- Webhook receives `invoice.payment_failed` event
- Logs error but doesn't retry or notify customer
- No dunning emails

**Required**:
- Smart Retries (Stripe automatically retries failed payments)
- Dunning emails (remind customers to update payment method)
- Subscription pausing (grace period before cancellation)

**Implementation**:
```typescript
// Configure subscription with smart retries
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_settings: {
    payment_method_types: ['card'],
    save_default_payment_method: 'on_subscription'
  },
  // Stripe's built-in dunning
  collection_method: 'charge_automatically'
})
```

**Stripe Dashboard Config**:
- Billing → Settings → Subscriptions and emails
- Enable "Email customers about failed payments"
- Configure retry schedule (default: 4 attempts over 3 weeks)

**Effort**: 2 hours (mostly configuration)
**Priority**: P0 (critical for revenue retention)

#### 5. **Usage-Based Billing** ❌
**Status**: Not implemented
**User Impact**: Can't charge per-property or per-tenant (property management specific)

**Property Management Use Case**:
```
Pricing Model:
- Base: $79/month (up to 10 properties)
- Overage: $5/property above 10
- Calculated at end of billing period
```

**Implementation**:
```typescript
// 1. Create metered price in Stripe
const price = await stripe.prices.create({
  product: 'prod_growth',
  unit_amount: 500, // $5 per property
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered' // KEY: enables usage-based billing
  }
})

// 2. Report usage via API
await stripe.subscriptionItems.createUsageRecord(
  subscriptionItemId,
  {
    quantity: 5, // 5 additional properties this month
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment'
  }
)
```

**Required Changes**:
- Backend: Cron job to count properties per customer monthly
- Backend: POST to Stripe Usage API
- Frontend: Show usage meter in dashboard
- Database: Track usage history

**Effort**: 16 hours
**Priority**: P2 (future feature for scaling customers)

#### 6. **Proration Handling** ❌
**Status**: Not implemented
**User Impact**: Can't upgrade/downgrade mid-cycle without confusion

**Example Scenario**:
```
User on starter plan ($29/mo)
Upgrades to growth plan ($79/mo) on day 15
What happens?
```

**Current Behavior**: Unclear (no explicit proration config)

**Required**:
```typescript
// Update subscription with proration
const subscription = await stripe.subscriptions.update(
  subscriptionId,
  {
    items: [{
      id: subscriptionItemId,
      price: newPriceId // growth plan
    }],
    proration_behavior: 'create_prorations', // KEY: calculate credit/charge
    billing_cycle_anchor: 'unchanged' // Keep same billing date
  }
)
```

**Effort**: 4 hours
**Priority**: P1 (needed for plan changes)

#### 7. **Subscription Pausing** ❌
**Status**: Not implemented
**User Impact**: Customers must cancel entirely if they need temporary break

**Property Management Use Case**:
```
Scenario: Property manager sells all properties, wants to pause for 3 months
Current: Must cancel subscription, lose all data
Desired: Pause billing, retain data, resume later
```

**Implementation**:
```typescript
// Pause subscription
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'void', // Don't collect payment
    resumes_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
  }
})
```

**Effort**: 6 hours (includes UI for pause/resume)
**Priority**: P2 (differentiator feature)

#### 8. **Multi-Currency Support** ❌
**Status**: USD only
**User Impact**: Can't serve international customers

**Current Limitation**: All prices hardcoded to USD

**Required**:
- Create prices in EUR, GBP, CAD, AUD
- Detect customer location
- Show prices in local currency
- Handle currency conversion for reporting

**Effort**: 12 hours
**Priority**: P3 (future international expansion)

#### 9. **Subscription Scheduling** ❌
**Status**: Not implemented
**User Impact**: Can't schedule plan changes for future date

**Use Case**:
```
Customer: "Downgrade me to starter plan at end of current billing period"
Current: Immediate downgrade (loses features mid-cycle)
Desired: Schedule change for renewal date
```

**Implementation**:
```typescript
// Schedule subscription change
const schedule = await stripe.subscriptionSchedules.create({
  from_subscription: subscriptionId
})

await stripe.subscriptionSchedules.update(schedule.id, {
  phases: [
    {
      items: [{ price: currentPriceId }],
      end_date: currentPeriodEnd // Keep current plan until renewal
    },
    {
      items: [{ price: newPriceId }], // Switch to new plan
      iterations: 1 // One billing cycle (or omit for ongoing)
    }
  ]
})
```

**Effort**: 8 hours
**Priority**: P2 (improves UX for plan changes)

#### 10. **Webhooks for All Lifecycle Events** ⚠️ PARTIAL
**Status**: Handlers exist but incomplete business logic

**Implemented Handlers** (in stripe-event-processor.service.ts):
- ✅ `payment_intent.succeeded` - Creates payment record
- ✅ `customer.subscription.created` - Creates subscription record
- ✅ `customer.subscription.updated` - Updates subscription status
- ✅ `customer.subscription.deleted` - Marks subscription canceled
- ✅ `invoice.payment_succeeded` - Logs successful payment
- ✅ `invoice.payment_failed` - Logs failed payment

**Missing Business Logic**:
- ❌ Access control updates (enable/disable features based on subscription)
- ❌ Email notifications to customers
- ❌ Admin notifications for failed payments
- ❌ Analytics tracking (MRR, churn rate)
- ❌ `customer.subscription.trial_will_end` (3-day warning email)
- ❌ `invoice.upcoming` (notify before charge)

**Effort**: 12 hours (complete all handlers)
**Priority**: P0 (critical for production)

---

## 3. Architecture Decisions Required

### Decision 1: Single vs Dual Webhook System

**RECOMMENDATION: Migrate to Stripe Sync Engine Only**

**Rationale**:
1. **Single Source of Truth**: All Stripe data in `stripe.*` schema
2. **Official Support**: Maintained by Supabase team
3. **Auto-Updates**: Schema changes handled automatically
4. **Less Code**: Eliminate 500+ lines of custom webhook handlers
5. **Type Safety**: Use Supabase generated types for `stripe.*` tables

**Migration Plan**:
```
Phase 1 (4 hours):
1. Create PostgreSQL functions to query stripe.subscriptions
2. Update frontend hooks to use new functions
3. Test thoroughly in staging

Phase 2 (2 hours):
4. Deploy to production
5. Monitor both webhook endpoints for 1 week
6. Verify data consistency

Phase 3 (1 hour):
7. Remove old webhook endpoint
8. Delete stripe-event-processor.service.ts
9. Drop public.subscription table (archive first)
```

### Decision 2: Data Access Pattern

**RECOMMENDATION: PostgreSQL Functions as API**

**Pattern**:
```sql
-- Backend queries via functions (type-safe)
CREATE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN,
  plan_name TEXT,
  plan_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    p.nickname,
    pr.unit_amount
  FROM stripe.subscriptions s
  JOIN stripe.customers c ON s.customer = c.id
  JOIN stripe.prices pr ON s.items[0].price = pr.id
  JOIN stripe.products p ON pr.product = p.id
  WHERE c.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;
END;
$$;
```

**Benefits**:
- Type-safe queries (no raw SQL in application code)
- Centralized business logic
- Easy to test and version
- Performance optimization in one place

### Decision 3: Feature Flag System

**RECOMMENDATION: Subscription-Based Entitlements**

**Pattern**:
```typescript
// Backend: Check entitlements
export async function checkFeatureAccess(
  userId: string,
  feature: 'advanced_analytics' | 'bulk_operations' | 'api_access'
): Promise<boolean> {
  const { data } = await supabase.rpc(
    'get_user_active_subscription',
    { p_user_id: userId }
  )

  if (!data) return false // No active subscription

  const planFeatures = {
    starter: ['basic_analytics'],
    growth: ['basic_analytics', 'advanced_analytics', 'bulk_operations'],
    'tenantflow-max': ['basic_analytics', 'advanced_analytics', 'bulk_operations', 'api_access']
  }

  return planFeatures[data.plan_name]?.includes(feature) ?? false
}
```

**Frontend**: Query user's plan in useUser() hook, enable/disable features client-side

---

## 4. Production Readiness Checklist

### Pre-Launch (Must Complete)

- [ ] **Apply database migration** (20251018_stripe_sync_engine_user_mapping.sql)
- [ ] **Register webhook in Stripe Dashboard**
  - URL: `https://api.tenantflow.app/api/v1/webhooks/stripe-sync`
  - Events: `customer.*`, `subscription.*`, `invoice.*`, `payment_intent.*`
- [ ] **Add STRIPE_WEBHOOK_SECRET to Railway**
- [ ] **Enable Stripe Tax** (legal requirement)
- [ ] **Configure Smart Retries** in Stripe Dashboard
- [ ] **Decide on webhook consolidation** (Option A vs Option B)
- [ ] **Test end-to-end flow**:
  - [ ] Create test subscription
  - [ ] Verify webhook processing
  - [ ] Verify user linking
  - [ ] Test Customer Portal
  - [ ] Test subscription cancellation
  - [ ] Test failed payment handling
- [ ] **Complete webhook business logic**:
  - [ ] `subscription.created` → Grant access to features
  - [ ] `subscription.updated` → Update feature access
  - [ ] `subscription.deleted` → Revoke access
  - [ ] `invoice.payment_failed` → Email customer
  - [ ] `subscription.trial_will_end` → Send reminder
- [ ] **Add monitoring**:
  - [ ] Webhook failure alerts
  - [ ] Failed payment notifications
  - [ ] Daily MRR dashboard

### Post-Launch (Phase 2)

- [ ] **Implement free trials** (14-day)
- [ ] **Add coupon support** (launch promotion)
- [ ] **Implement proration** for plan changes
- [ ] **Add usage-based billing** (per-property pricing)
- [ ] **Implement subscription pausing**
- [ ] **Add subscription scheduling**

### Future Enhancements (Phase 3)

- [ ] **Multi-currency support**
- [ ] **Advanced analytics** (MRR, churn, LTV)
- [ ] **Referral program** (Stripe credits)
- [ ] **Enterprise SSO** (Stripe Identity)

---

## 5. Prioritized Action Plan

### Week 1: Critical Path to Production

**Day 1-2: Webhook Consolidation** (8 hours)
1. Decide: Option A (Sync Engine only) or Option B (Dual system)
2. If Option A: Create PostgreSQL functions for subscription queries
3. Update frontend hooks to use new functions
4. Test in staging environment

**Day 3: Database & Webhook Setup** (4 hours)
1. Apply migration to production Supabase
2. Register webhook in Stripe Dashboard
3. Add STRIPE_WEBHOOK_SECRET to Railway
4. Verify webhook delivery

**Day 4: Business Logic Completion** (6 hours)
1. Implement access control based on subscription status
2. Add email notifications for key events
3. Test complete subscription lifecycle

**Day 5: Testing & Monitoring** (4 hours)
1. End-to-end testing with test cards
2. Add webhook failure monitoring
3. Create admin dashboard for subscription metrics

### Week 2: Essential Features

**Days 6-7: Tax & Recovery** (10 hours)
1. Enable Stripe Tax
2. Configure Smart Retries
3. Set up dunning emails
4. Test failed payment flow

**Days 8-9: Trials & Discounts** (6 hours)
1. Implement 14-day free trial
2. Create launch promotion coupon
3. Update pricing page UI
4. Test trial conversion flow

**Day 10: Production Launch** (4 hours)
1. Final smoke tests
2. Deploy to production
3. Monitor first 24 hours
4. Fix any critical issues

### Month 2: Enhancement Features

**Week 3-4: Advanced Billing** (20 hours)
1. Implement proration for plan changes
2. Add subscription scheduling
3. Implement subscription pausing
4. Add usage-based billing foundation

---

## 6. Technical Debt

### Immediate Cleanup

1. **Remove Dual Webhook System** (after decision)
   - Delete: `stripe-event-processor.service.ts` (if Option A)
   - Delete: `public.subscription` table
   - Archive: Old webhook event logs

2. **Consolidate Stripe Controllers**
   - Merge: `stripe.controller.ts` + `stripe-sync.controller.ts`
   - Extract: Shared Stripe client to singleton service
   - Standardize: Error handling patterns

3. **Frontend API Client**
   - Add: Stripe-specific API client wrapper
   - Centralize: All Stripe endpoints in one file
   - Type: All request/response interfaces

### Long-term Maintenance

1. **Stripe SDK Updates**
   - Monitor: @stripe/stripe-js releases
   - Test: Upgrade path every 3 months
   - Document: Breaking changes

2. **Database Schema Sync**
   - Monitor: Stripe Sync Engine updates
   - Review: Schema changes in Supabase
   - Test: Migration impact on queries

3. **Compliance & Security**
   - Audit: PCI compliance annually
   - Review: Webhook signature verification
   - Update: Security best practices

---

## 7. Success Metrics

### Week 1 Goals
- [ ] 0 webhook failures
- [ ] 100% test subscription success rate
- [ ] <500ms Customer Portal redirect time

### Month 1 Goals
- [ ] 10+ paying customers
- [ ] <5% failed payment rate
- [ ] 0 tax calculation errors
- [ ] <2% subscription cancellation rate

### Month 3 Goals
- [ ] $5K+ MRR
- [ ] 90%+ trial-to-paid conversion
- [ ] <10% churn rate
- [ ] 95%+ payment success rate

---

## 8. Resources & Documentation

### Official Stripe Guides
- [Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Subscriptions](https://stripe.com/docs/billing/subscriptions/testing)
- [Smart Retries](https://stripe.com/docs/billing/revenue-recovery/smart-retries)

### Supabase Stripe Integration
- [Stripe Sync Engine](https://github.com/supabase/stripe-sync-engine)
- [Stripe Sync Blog Post](https://supabase.com/blog/stripe-engine-as-sync-library)

### Internal Documentation
- [STRIPE_PRODUCTION_IMPLEMENTATION.md](STRIPE_PRODUCTION_IMPLEMENTATION.md) - Current implementation details
- [ULTRA_NATIVE_ARCHITECTURE.md](apps/backend/ULTRA_NATIVE_ARCHITECTURE.md) - Backend patterns

### Support Contacts
- Stripe Support: support@stripe.com
- Supabase Discord: discord.gg/supabase
- TenantFlow Team: (add internal contacts)

---

## Appendix: Quick Reference

### Environment Variables Required
```bash
# Backend (Railway)
STRIPE_SECRET_KEY=sk_test_...  # ✅ Set
STRIPE_WEBHOOK_SECRET=wh_sec_...  # ❌ NOT SET - CRITICAL

# Frontend (Vercel)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # ✅ Set
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_1SBGrNP3WCR53SdoJjTotskB  # ✅ Set
```

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3D Secure: 4000 0027 6000 3184
Insufficient funds: 4000 0000 0000 9995
```

### Database Migration Status
```sql
-- Check if migration applied
SELECT * FROM supabase_migrations.schema_migrations
WHERE version = '20251018_stripe_sync_engine_user_mapping';

-- Check if stripe schema exists
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'stripe';

-- Check if user_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'stripe'
  AND table_name = 'customers'
  AND column_name = 'user_id';
```

### Webhook Testing
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe-sync

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

---

**End of Gap Analysis** - Ready for production implementation
