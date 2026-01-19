# Phase 12: Webhook Security & Reliability - Research

**Researched:** 2026-01-16
**Domain:** Stripe webhook handling with NestJS + BullMQ + Supabase
**Confidence:** HIGH

<research_summary>
## Summary

Researched Stripe webhook best practices for building production-ready webhook handling with NestJS. The current TenantFlow implementation already follows many best practices (async queue processing, signature verification, RPC-backed idempotency), but gaps exist in transaction wrapping, tenant verification, dead letter queue handling, and monitoring.

Key finding: The codebase already has solid foundations (BullMQ queue, atomic lock RPC, exponential backoff), but webhook handlers perform multiple database operations without transaction wrapping, and there's no explicit tenant ownership verification in webhook handlers.

**Primary recommendation:** Wrap webhook handlers in database transactions, add tenant ownership verification before any data modifications, implement dead letter queue alerting, and add observability for webhook processing health.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for Stripe webhooks in NestJS:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^17.x | Stripe SDK | Official SDK with `constructEvent()` for signature verification |
| @nestjs/bullmq | ^10.x | Job queue | Async processing prevents timeouts, built-in retry with backoff |
| bullmq | ^5.x | Queue backend | Redis-backed, reliable, has DLQ support |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.x | Database | Supabase client with RPC support |
| stripe-cli | Latest | Testing | Local webhook forwarding and event triggering |

### Missing/Recommended
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| prom-client | ^15.x | Metrics | Webhook processing metrics (already partially implemented) |
| bullmq-pro (optional) | N/A | Enhanced DLQ | Advanced dead letter handling if needed |

**Installation:**
```bash
# Already installed - no new dependencies required
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Current Project Structure (Good)
```
apps/backend/src/modules/billing/webhooks/
├── webhook.controller.ts      # Signature verification, queue dispatch
├── webhook.service.ts         # Database-backed idempotency (RPC lock)
├── webhook-processor.service.ts  # Event routing to handlers
├── webhook-queue.processor.ts    # BullMQ worker with retry
├── webhooks.module.ts
└── handlers/
    ├── checkout-webhook.handler.ts
    ├── payment-webhook.handler.ts
    ├── subscription-webhook.handler.ts
    └── connect-webhook.handler.ts
```

### Pattern 1: Immediate 200, Async Processing (Already Implemented)
**What:** Return HTTP 200 immediately after signature verification, process via queue
**When to use:** Always - Stripe times out after 10-30 seconds
**Current implementation:**
```typescript
// webhook.controller.ts - Returns immediately
await this.webhookQueue.add(event.type, { ... }, { jobId: event.id });
return { received: true };
```

### Pattern 2: Database-Backed Idempotency with RPC (Already Implemented)
**What:** Atomic lock acquisition via PostgreSQL RPC to prevent race conditions
**When to use:** When multiple instances may process same event
**Current implementation:**
```typescript
// Uses acquire_webhook_event_lock RPC - atomic INSERT ON CONFLICT
const lockAcquired = await this.recordEventProcessing(eventId, eventType);
if (!lockAcquired) return false;  // Already processing/processed
```

### Pattern 3: Transaction Wrapping (MISSING - NEEDS IMPLEMENTATION)
**What:** Wrap all database operations in a single transaction
**When to use:** When handler performs multiple related updates
**Example (NEEDS ADDING):**
```typescript
// payment-webhook.handler.ts - SHOULD use transaction
async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const client = this.supabase.getAdminClient();

  // CURRENT: Multiple separate operations (not atomic)
  await client.from('rent_payments').update(...);  // Step 1
  await client.from('payment_transactions').insert(...);  // Step 2 - could fail!

  // SHOULD BE: Single transaction
  await client.rpc('process_payment_succeeded', {
    p_payment_intent_id: paymentIntent.id,
    p_status: 'succeeded',
    // ...
  });
}
```

### Pattern 4: Tenant Ownership Verification (MISSING - NEEDS IMPLEMENTATION)
**What:** Verify webhook data belongs to expected tenant before modifying
**When to use:** All webhook handlers that modify tenant data
**Example (NEEDS ADDING):**
```typescript
// CURRENT: Finds tenant by stripe_customer_id, modifies without verification
const { data: tenant } = await client
  .from('tenants')
  .select('id')
  .eq('stripe_customer_id', customerId)
  .single();

// SHOULD: Verify ownership before modification
// Option 1: RLS with service role + explicit tenant check
// Option 2: Dedicated RPC that validates tenant ownership
```

### Pattern 5: Dead Letter Queue with Alerting (PARTIALLY IMPLEMENTED)
**What:** Failed jobs after max retries go to DLQ with monitoring
**Current:** BullMQ retries 5 times with exponential backoff, logs on final failure
**Missing:** No alerting, no DLQ dashboard, no replay mechanism

### Anti-Patterns to Avoid
- **Synchronous webhook processing:** Causes timeouts - use queue (ALREADY AVOIDED)
- **Trusting event order:** Stripe doesn't guarantee order - fetch current state from API
- **No idempotency:** Same event delivered multiple times - use event ID deduplication (ALREADY IMPLEMENTED)
- **Non-atomic multi-step updates:** Partial failures leave inconsistent state (CURRENT ISSUE)
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature verification | Manual HMAC | `stripe.webhooks.constructEvent()` | Handles timing attacks, timestamp validation, replay protection |
| Retry with backoff | Custom retry logic | BullMQ `backoff: { type: 'exponential' }` | Already handles jitter, max attempts, failure tracking |
| Idempotency | In-memory Set | Database table + RPC lock | Survives restarts, handles multi-instance |
| Rate limiting | Custom counter | `@nestjs/throttler` | Already configured for webhook endpoint |
| Event type routing | Giant if/else | Switch statement with handlers | Already well-structured |
| Metrics collection | Manual logging | prom-client + existing PrometheusService | Already partially implemented |

**Key insight:** The codebase already uses the right tools - the gaps are in how they're composed together (transactions, verification), not in missing libraries.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Race Condition Between Check and Process
**What goes wrong:** Two webhook deliveries check "already processed?" simultaneously, both see "no", both process
**Why it happens:** SELECT-then-INSERT pattern without atomic lock
**Current status:** FIXED - Uses `acquire_webhook_event_lock` RPC with INSERT ON CONFLICT
**How to avoid:** Already avoided via RPC-backed atomic lock

### Pitfall 2: Non-Atomic Multi-Step Updates
**What goes wrong:** Handler updates table A, fails on table B, leaves inconsistent state
**Why it happens:** Multiple separate database calls without transaction
**Current status:** ISSUE EXISTS in payment-webhook.handler.ts
**How to avoid:** Wrap related operations in database transaction (RPC or pg transaction)
**Warning signs:** `Promise.all([update1, update2])` without transaction context

### Pitfall 3: Missing Tenant Ownership Verification
**What goes wrong:** Webhook for Tenant A accidentally modifies Tenant B's data
**Why it happens:** Looking up tenant by stripe_customer_id and trusting it
**Current status:** ISSUE EXISTS - No explicit verification after lookup
**How to avoid:** Add explicit tenant ownership check before any modifications
**Warning signs:** Direct `.eq('stripe_customer_id', x)` without cross-checking

### Pitfall 4: Out-of-Order Event Processing
**What goes wrong:** `subscription.updated` arrives before `subscription.created`, causing lookup failures
**Why it happens:** Stripe doesn't guarantee event delivery order
**Current status:** PARTIALLY HANDLED - Handlers check for missing records
**How to avoid:** Always fetch current object state from Stripe API when order matters
**Warning signs:** Handler assumes certain events always arrive first

### Pitfall 5: Silent DLQ Failures
**What goes wrong:** Webhook fails after max retries, sits in dead queue forever unnoticed
**Why it happens:** BullMQ `@OnWorkerEvent('failed')` only logs, doesn't alert
**Current status:** ISSUE EXISTS - Only logs, no alerting
**How to avoid:** Add alerting (Sentry, PagerDuty, Slack) on final failure
**Warning signs:** `removeOnFail: { age: 7 * 24 * 3600 }` without monitoring
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Stripe Signature Verification (Already Correct)
```typescript
// Source: Stripe Node.js SDK docs
// Current implementation in webhook.controller.ts - CORRECT
const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
```

### NestJS Raw Body Access (Already Correct)
```typescript
// Source: NestJS docs - faq/raw-body.md
// Current implementation - CORRECT
// main.ts: NestFactory.create(AppModule, { rawBody: true })
// Controller: @Req() req: RawBodyRequest<Request>
const rawBody = req.rawBody;
```

### BullMQ Retry Configuration (Already Correct)
```typescript
// Source: BullMQ docs
// Current implementation in webhooks.module.ts - CORRECT
BullModule.registerQueue({
  name: 'stripe-webhooks',
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 }
  }
});
```

### Database Transaction Pattern (NEEDS IMPLEMENTATION)
```sql
-- Source: PostgreSQL best practices
-- Pattern for atomic webhook processing RPC
CREATE OR REPLACE FUNCTION process_payment_intent_succeeded(
  p_payment_intent_id TEXT,
  p_amount INTEGER,
  p_paid_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- All operations in single transaction (implicit in plpgsql)
  UPDATE rent_payments
  SET status = 'succeeded', paid_date = p_paid_date, updated_at = NOW()
  WHERE stripe_payment_intent_id = p_payment_intent_id;

  -- Any additional related updates here
  -- If any fail, entire transaction rolls back
END;
$$;
```

### Tenant Ownership Verification Pattern (NEEDS IMPLEMENTATION)
```typescript
// Pattern for explicit tenant verification
async verifyTenantOwnership(
  stripeCustomerId: string,
  expectedTenantId?: string
): Promise<{ verified: boolean; tenantId: string | null }> {
  const { data } = await this.supabase.getAdminClient()
    .from('tenants')
    .select('id, organization_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (!data) return { verified: false, tenantId: null };

  // If we expect a specific tenant, verify match
  if (expectedTenantId && data.id !== expectedTenantId) {
    this.logger.error('Tenant ownership mismatch', {
      expected: expectedTenantId,
      actual: data.id
    });
    return { verified: false, tenantId: null };
  }

  return { verified: true, tenantId: data.id };
}
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous processing | Async queue (BullMQ) | Standard since 2020 | Already implemented correctly |
| In-memory idempotency | Database + RPC lock | 2023+ | Already implemented correctly |
| HTTP webhooks only | EventBridge/Pub-Sub option | 2024 | Direct cloud integration now available |

**New tools/patterns to consider:**
- **Stripe Event Destinations:** Direct delivery to AWS EventBridge, GCP Pub/Sub, Kinesis - bypasses HTTP infrastructure. Consider for future if scaling becomes issue.
- **Thin Events + Fetch:** Receive thin event, then fetch full object from API - avoids payload size issues and ensures current state.
- **Stripe CLI webhook testing:** `stripe listen --forward-to localhost:4650/api/v1/webhooks/stripe` - essential for local testing

**Deprecated/outdated:**
- **Synchronous webhook processing:** Stripe strongly recommends async - already avoided
- **Individual cookie methods in auth:** Unrelated but noted - already handled
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **Transaction Strategy for Supabase**
   - What we know: PostgreSQL RPC functions run in implicit transaction
   - What's unclear: Best pattern for Supabase - individual RPCs vs combined RPCs
   - Recommendation: Create dedicated RPC per handler type (e.g., `process_payment_succeeded`)

2. **DLQ Monitoring Approach**
   - What we know: BullMQ supports DLQ via `removeOnFail`, logs on final failure
   - What's unclear: User's preferred alerting system (Sentry, Slack, email?)
   - Recommendation: Add Sentry integration for DLQ failures, make alerting configurable

3. **Event Order Handling**
   - What we know: Stripe doesn't guarantee order, some handlers assume order
   - What's unclear: Which specific flows are affected in current codebase
   - Recommendation: Audit each handler for order assumptions during planning
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- /stripe/stripe-node - Context7 docs on `constructEvent()`, signature verification
- /stripe/stripe-cli - Context7 docs on `listen`, `trigger` commands
- /nestjs/docs.nestjs.com - Context7 docs on raw body handling
- https://docs.stripe.com/webhooks - Official Stripe webhook documentation

### Secondary (MEDIUM confidence)
- https://stripe.dev/blog/building-resilient-webhook-handlers-aws-dlqs-stripe-events - Stripe engineering blog on DLQ patterns (verified against official docs)
- https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks - Community best practices (verified with official docs)
- https://dev.to/belazy/the-race-condition-youre-probably-shipping-right-now-with-stripe-webhooks-mj4 - Race condition analysis (verified with codebase investigation)

### Tertiary (LOW confidence - needs validation)
- None - all findings verified against official sources or codebase
</sources>

<codebase_analysis>
## Current Codebase Analysis

### What's Already Working Well
1. **Async Queue Processing:** BullMQ with exponential backoff, 5 retries
2. **Signature Verification:** Correct use of `constructEvent()` with raw body
3. **Atomic Idempotency:** RPC-backed lock with INSERT ON CONFLICT
4. **Handler Separation:** Clean domain-specific handler structure
5. **Throttling:** Rate limiting on webhook endpoint

### Gaps Identified for Phase 12
1. **WEBHOOK-RACE (MEDIUM):** Non-atomic multi-step updates in handlers
2. **WEBHOOK-RLS (MEDIUM):** No explicit tenant ownership verification
3. **DLQ Monitoring:** No alerting on final webhook failures
4. **Transaction Wrapping:** Handlers use multiple separate DB calls
5. **Observability:** Limited webhook health metrics

### Relevant Files to Modify
- `webhook.service.ts` - Already has idempotency, may need transaction support
- `handlers/payment-webhook.handler.ts` - Needs transaction wrapping
- `handlers/subscription-webhook.handler.ts` - Needs transaction wrapping
- `webhook-queue.processor.ts` - Needs DLQ alerting
- New migrations for transaction RPC functions
</codebase_analysis>

<metadata>
## Metadata

**Research scope:**
- Core technology: Stripe webhooks with stripe-node SDK
- Ecosystem: NestJS + BullMQ + Supabase/PostgreSQL
- Patterns: Idempotency, async processing, transaction handling
- Pitfalls: Race conditions, non-atomic updates, missing verification

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, already in use
- Architecture: HIGH - patterns verified, gaps identified from codebase
- Pitfalls: HIGH - verified against official docs and community experience
- Code examples: HIGH - from Context7/official sources or current codebase

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - Stripe webhook patterns stable)
</metadata>

---

*Phase: 12-webhook-security-reliability*
*Research completed: 2026-01-16*
*Ready for planning: yes*
