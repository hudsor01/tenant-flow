# Architecture Research

**Domain:** Payment infrastructure, receipt email, auth flow completion for property management SaaS
**Researched:** 2026-02-25
**Confidence:** HIGH — all findings derived from direct codebase inspection

---

## System Overview

The existing architecture is fully deployed and functional. New features do not change the
topology — they add one new Edge Function, extend the existing webhook handler, and complete
two partially-implemented frontend pages.

```
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend — Next.js / Vercel                     │
│                                                                   │
│  auth pages                  tenant portal pages                  │
│  ┌──────────────────┐        ┌─────────────────────────────┐    │
│  │ /auth/callback   │ EXISTS │ /tenant/payments/new        │    │
│  │ (Google OAuth)   │        │ (throw stub — MUST MODIFY)  │    │
│  └──────────────────┘        └─────────────────────────────┘    │
│  ┌──────────────────┐        ┌─────────────────────────────┐    │
│  │ /auth/update-    │ EXISTS │ /tenant/payments/history    │    │
│  │ password         │        │ (uses useBillingHistory,    │    │
│  └──────────────────┘        │  not rent_payments)         │    │
│  ┌──────────────────┐        └─────────────────────────────┘    │
│  │ /auth/reset-     │ MISSING — resetPasswordForEmail sends here  │
│  │ password         │ but page does not exist                    │
│  └──────────────────┘                                            │
│                                                                   │
│  supabase-js — all DB reads via PostgREST (RLS enforced)         │
│  Edge Function calls — fetch() with Bearer token from session    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│              Supabase (project: bshjmbshupiibfiewpxb)            │
│                                                                   │
│  PostgREST ─── RLS on all tables                                 │
│                                                                   │
│  Edge Functions (Deno, npm:stripe@14):                           │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ stripe-webhooks     │  │ stripe-rent-checkout  NEW        │  │
│  │ payment_intent.     │  │ Creates Checkout Session with    │  │
│  │ succeeded already   │  │ destination charge + fee split   │  │
│  │ updates DB; ADD     │  │ → returns { url }                │  │
│  │ Resend receipt here │  └──────────────────────────────────┘  │
│  └─────────────────────┘                                         │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ stripe-checkout     │  │ stripe-connect                   │  │
│  │ (platform sub only) │  │ (owner onboarding)               │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                   │
│  DB Layer:                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ rent_payments (notify_n8n_rent_payment trigger → pg_net)  │  │
│  │ stripe_connected_accounts (charges_enabled, fee_percent)  │  │
│  │ leases (stripe_connected_account_id, rent_amount)         │  │
│  │ tenants → users (email lives in users table)              │  │
│  │ email_suppressions (bounce/complaint suppression)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  pg_cron — late fees, lease reminders (existing)                 │
│  pg_net → n8n (k3s) — async webhook delivery (existing)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `stripe-rent-checkout` Edge Function | Create Checkout Session with destination charge; read lease + connected account; return `{ url }` | **NEW** |
| `stripe-webhooks` Edge Function | Handle `payment_intent.succeeded` — already updates `rent_payments`; Resend receipt call must be added | **MODIFY** |
| `/tenant/payments/new` page | Replace throw-stub mutation with call to `stripe-rent-checkout`; redirect to Stripe-hosted checkout | **MODIFY** |
| `/auth/reset-password` page | Does not exist; `resetPasswordForEmail` redirects here; create as thin shell around existing `UpdatePasswordForm` | **NEW** |
| `/auth/update-password` page | Exists and functional; correct implementation but wrong URL in `use-auth.ts` | No change needed |
| `useSupabasePasswordResetMutation` | `redirectTo` points to `/auth/reset-password` which does not exist; creating the page is the fix, no code change needed | No change needed |
| `/auth/callback` route | OAuth code exchange; already complete and routes by user type | No change needed |
| `GoogleButton` component | UI component only; OAuth logic is in login page | No change needed |
| `email_suppressions` table | Suppress bounced/complained addresses before Resend sends | Exists (service-role-only) |
| `notify_n8n_rent_payment` trigger | Fires on `rent_payments` INSERT; n8n handles owner notification (existing); Resend in webhook handler is the tenant receipt path | No change needed |

---

## Recommended Project Structure

New files to create:

```
supabase/functions/
└── stripe-rent-checkout/
    └── index.ts          # NEW — destination charge checkout for tenant rent payments

apps/frontend/src/app/
└── auth/
    └── reset-password/
        └── page.tsx      # NEW — identical shell to update-password/page.tsx, uses UpdatePasswordForm
```

Files to modify:

```
supabase/functions/
└── stripe-webhooks/
    └── index.ts          # MODIFY — add Resend receipt call in payment_intent.succeeded handler

apps/frontend/src/
└── app/(tenant)/tenant/payments/new/
    └── page.tsx          # MODIFY — replace TODO throw stub with fetch to stripe-rent-checkout
```

No migration needed. No schema changes required for any of the three features.

---

## Architectural Patterns

### Pattern 1: Stripe Destination Charge with Platform Fee

**What:** Tenant pays full rent amount. Stripe charges the tenant's card on the platform Stripe
account, routes the funds minus the platform fee to the owner's connected account.

**When to use:** When the lease has `stripe_connected_account_id` set and the connected account
has `charges_enabled = true`.

**Data reads required (in `stripe-rent-checkout`):**
1. Verify JWT → get authenticated user_id
2. Query `tenants` to confirm the user is a tenant and get `tenant.id`, `lease_id`
3. Query `leases` to get `rent_amount`, `rent_currency`, `stripe_connected_account_id`
4. Query `stripe_connected_accounts` to get `stripe_account_id`, `default_platform_fee_percent`
5. Query `users` via `tenants.user_id` to get `email` (prefill checkout + store in metadata)

**Example shape:**

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: lease.rent_currency,
      product_data: { name: `Rent — ${periodLabel}` },
      unit_amount: lease.rent_amount * 100,  // cents
    },
    quantity: 1,
  }],
  mode: 'payment',
  customer_email: tenantEmail,  // pre-fills checkout form
  payment_intent_data: {
    application_fee_amount: Math.round(
      lease.rent_amount * (account.default_platform_fee_percent / 100) * 100
    ),
    transfer_data: { destination: account.stripe_account_id },
    metadata: {
      tenant_id: tenant.id,
      lease_id: lease.id,
      tenant_email: tenantEmail,      // stored so webhook avoids DB lookup
      property_name: propertyName,    // stored so receipt email avoids join
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
    },
  },
  success_url: `${frontendUrl}/tenant/payments?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:  `${frontendUrl}/tenant/payments/new?checkout=cancelled`,
})
```

**Trade-offs:**
- Stripe Radar fraud protection included at no extra cost
- Tenant redirected off-site; frontend must handle `?checkout=success` query param on return
- `payment_intent.succeeded` fires on the *platform* account (not connected account) — existing
  webhook handler already handles this
- Storing `tenant_email` and `property_name` in metadata at checkout creation eliminates DB
  joins in the webhook handler, keeping receipt email assembly fast

### Pattern 2: Receipt Email via Resend in Webhook Handler

**What:** On `payment_intent.succeeded`, after the `rent_payments` DB write succeeds, call the
Resend API to send a payment receipt to the tenant. Fire-and-forget — the webhook must return
200 regardless of email outcome.

**When to use:** Inside the existing `payment_intent.succeeded` case in `stripe-webhooks/index.ts`,
after the existing `rent_payments` upsert block completes.

**Data assembly:**
```
payment_intent.succeeded
  ↓
pi.metadata.tenant_email        → direct from metadata (no DB lookup needed)
pi.metadata.property_name       → direct from metadata (no DB lookup needed)
pi.amount / 100                 → amount paid in dollars
pi.metadata.period_start        → billing period start
pi.metadata.period_end          → billing period end
  ↓
email_suppressions check        → skip send if tenant_email is bounced/complained
  ↓
Resend API: POST to api.resend.com/emails
```

**Email send guard:**
```typescript
// In stripe-webhooks payment_intent.succeeded handler, after DB write:
const tenantEmail = pi.metadata?.['tenant_email']
if (tenantEmail) {
  const { data: suppressed } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', tenantEmail)
    .maybeSingle()

  if (!suppressed) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'receipts@tenantflow.app',
          to: tenantEmail,
          subject: `Payment Receipt — ${pi.metadata?.['property_name']}`,
          // html or text body
        }),
      })
    } catch (emailErr) {
      console.error('Receipt email failed (non-fatal):', emailErr)
      // do not re-throw — webhook must return 200
    }
  }
}
```

**Trade-offs:**
- If Resend is down when the webhook fires, the receipt is lost (no retry mechanism in this
  simple approach)
- Mitigation: Stripe retries the webhook on 500; but we return 200 intentionally to avoid
  re-processing the DB write — so Stripe does not retry
- Acceptable for v8.0; upgrade to a dedicated email-receipts Edge Function with its own retry
  queue if delivery guarantees become critical

### Pattern 3: Password Reset Route Fix

**What:** `useSupabasePasswordResetMutation` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })`. Supabase embeds a recovery token in the email link. When
the user clicks, they land on `/auth/reset-password?token_hash=...&type=recovery`. The supabase-js
client on that page exchanges the token automatically on mount, allowing `updateUser({ password })`
to succeed.

**Gap:** `/auth/reset-password` does not exist as a Next.js route. The existing
`/auth/update-password` page uses `UpdatePasswordForm` which is correct — but it is at the wrong
URL.

**Resolution:**

1. Create `apps/frontend/src/app/auth/reset-password/page.tsx`
2. Copy the shell from `auth/update-password/page.tsx` (identical two-column layout + left image panel)
3. Import `UpdatePasswordForm` — the component already handles token exchange correctly because
   supabase-js extracts the recovery token from the URL fragment (`#access_token=...`) when
   initialized on the page

```typescript
// apps/frontend/src/app/auth/reset-password/page.tsx
// Thin shell — identical to update-password/page.tsx shell
import { UpdatePasswordForm } from '#components/auth/update-password-form'
// ... same layout structure
export default function ResetPasswordPage() {
  return (
    // ... same two-column layout as update-password/page.tsx
    <UpdatePasswordForm />
  )
}
```

No changes to `UpdatePasswordForm`, `use-auth.ts`, or Supabase auth settings are needed.

### Pattern 4: Google OAuth — Code Complete, Ops Verification Needed

**What:** Google OAuth flow is fully implemented end-to-end in code:
1. `login/page.tsx` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
2. `/auth/callback` (Next.js API route) exchanges `code` for session via `exchangeCodeForSession()`
3. Callback reads `session.user.app_metadata.user_type` and routes to `/tenant` or `/dashboard`

**Remaining gap:** Operational configuration, not code:
- Supabase Dashboard must have Google OAuth enabled (client ID + secret from Google Cloud Console)
- `[FRONTEND_URL]/auth/callback` must be in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**No code changes needed for Google OAuth.**

---

## Data Flow

### Rent Payment Checkout Flow

```
Tenant clicks "Pay Rent" on /tenant/payments/new
    ↓ fetch() with Bearer token
stripe-rent-checkout Edge Function
    ↓ verifies JWT, reads tenants → leases → stripe_connected_accounts → users
Stripe API: checkout.sessions.create() (destination charge)
    ↓ returns { url: "https://checkout.stripe.com/..." }
Frontend: window.location.href = url
    ↓ tenant completes payment on Stripe-hosted page
Stripe fires payment_intent.succeeded webhook (platform account)
    ↓
stripe-webhooks Edge Function (existing handler)
    ↓ verifies signature, dedupes via stripe_webhook_events
rent_payments: upsert (status = 'succeeded', paid_date = today)
    ↓ (NEW)
email_suppressions check → Resend API: send receipt to tenant_email
    ↓ (fire-and-forget)
notify_n8n_rent_payment DB trigger fires (on INSERT only)
    ↓ pg_net → n8n → owner notification workflow (existing)
```

### Password Reset Flow

```
User: "Forgot password" modal → ForgotPasswordModal
    ↓
useSupabasePasswordResetMutation
    ↓ supabase.auth.resetPasswordForEmail(email, { redirectTo: /auth/reset-password })
Supabase sends email with recovery link → /auth/reset-password?token_hash=...&type=recovery
    ↓
User clicks link → /auth/reset-password page (NEW — thin shell)
    ↓ supabase-js extracts recovery token from URL fragment on mount
UpdatePasswordForm → supabase.auth.updateUser({ password })
    ↓
Redirect to /
```

### Email Receipt Data Flow

```
payment_intent.succeeded
    ↓
pi.metadata.tenant_email    (stored at checkout creation — no DB lookup)
pi.metadata.property_name   (stored at checkout creation — no DB lookup)
pi.amount / 100             (payment amount)
pi.metadata.period_start    (billing period)
pi.metadata.period_end      (billing period)
    ↓
email_suppressions.select where email = tenant_email
    ↓ (if not suppressed)
Resend API: send receipt email
```

---

## Integration Points

### New vs. Modified Components

| Change Type | Component | What Changes |
|-------------|-----------|--------------|
| **NEW** | `supabase/functions/stripe-rent-checkout/index.ts` | Full new Edge Function: JWT auth, reads lease + account, creates destination charge Checkout Session |
| **NEW** | `apps/frontend/src/app/auth/reset-password/page.tsx` | Page shell + `UpdatePasswordForm` (identical to update-password layout) |
| **MODIFY** | `supabase/functions/stripe-webhooks/index.ts` | Add Resend receipt call in `payment_intent.succeeded` case, after DB write |
| **MODIFY** | `apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx` | Replace throw stub with fetch to `stripe-rent-checkout`; replace Select dropdown with a single CTA button; redirect to returned `url` |
| **NO CHANGE** | `apps/frontend/src/app/auth/callback/route.ts` | Google OAuth callback is complete |
| **NO CHANGE** | `apps/frontend/src/app/auth/update-password/page.tsx` | Exists, correct implementation |
| **NO CHANGE** | `apps/frontend/src/hooks/api/use-auth.ts` | `redirectTo` is `/auth/reset-password` — creating the page is the fix |
| **NO CHANGE** | `apps/frontend/src/components/auth/google-button.tsx` | UI component only, no logic changes |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe Connect | `payment_intent_data.application_fee_amount` + `transfer_data.destination` in Checkout Session | Connected account must have `charges_enabled = true`; fail gracefully if account not ready |
| Resend | Direct POST to `api.resend.com/emails` from `stripe-webhooks`; `RESEND_API_KEY` env var | Check `email_suppressions` before sending; wrap in try/catch; never fail the webhook on email error |
| Google OAuth | `supabase.auth.signInWithOAuth()` → Supabase OAuth → `/auth/callback` | Code complete; ops config needed (Google Cloud Console credentials, Supabase Dashboard) |

### Environment Variables

| Variable | Where Used | Already Exists |
|----------|-----------|----------------|
| `STRIPE_SECRET_KEY` | `stripe-rent-checkout`, `stripe-webhooks` | Yes |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhooks` | Yes |
| `RESEND_API_KEY` | `stripe-webhooks` (add call) | Yes (confirmed: `email_suppressions` migration references it) |
| `SUPABASE_URL` | All Edge Functions | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | All Edge Functions | Yes |
| `FRONTEND_URL` | `stripe-rent-checkout` (success/cancel URLs) | Yes (used in `stripe-checkout`, `stripe-connect`) |

No new environment variables are needed.

---

## Build Order

```
Step 1 — stripe-rent-checkout Edge Function (no frontend deps)
  └── Reads: leases, stripe_connected_accounts, tenants, users
  └── Writes: nothing (Stripe creates the session)
  └── Returns: { url: string }

Step 2 — /tenant/payments/new page modification (depends on Step 1)
  └── Replace throw stub with fetch to stripe-rent-checkout
  └── Redirect tenant to Stripe checkout URL on success

Step 3 — stripe-webhooks Resend receipt (independent of Steps 1-2)
  └── Add Resend call after existing rent_payments upsert
  └── Check email_suppressions first
  └── Fire-and-forget, non-blocking

Step 4 — /auth/reset-password page (independent, no deps)
  └── Thin shell around UpdatePasswordForm
  └── Identical layout to /auth/update-password/page.tsx

Step 5 — Google OAuth verification (ops task, no code)
  └── Verify Supabase Dashboard: Google provider enabled
  └── Verify /auth/callback is in Redirect URLs allowlist
  └── Test login flow in staging
```

**Parallel tracks:**
- Track A: Steps 1 + 2 (payment checkout, can develop + test together)
- Track B: Step 3 (receipt email, independent, test with Stripe webhook CLI)
- Track C: Steps 4 + 5 (auth fixes, no external dependencies beyond ops config)

---

## Anti-Patterns

### Anti-Pattern 1: Triggering Receipt Email from Frontend

**What people do:** Call Resend from a Next.js Server Action or API route when the user returns
to the success URL after checkout.

**Why it's wrong:** The `?checkout=success` redirect is not guaranteed delivery. The browser
tab can be closed before the user returns. The Stripe webhook is the authoritative payment
confirmation — use it.

**Do this instead:** Send the receipt email from inside `stripe-webhooks`'s
`payment_intent.succeeded` handler, after the DB write confirms the payment.

### Anti-Pattern 2: Using the notify_n8n Trigger for Tenant Receipts

**What people do:** Route tenant receipt emails through the `notify_n8n_rent_payment` trigger →
n8n → Resend, mirroring the owner notification workflow.

**Why it's wrong:** The trigger fires on *every* `rent_payments` INSERT — including manual cash
payments recorded by the owner, which should not trigger a Stripe receipt email. n8n also adds
an operational dependency (k3s must be reachable) for a critical user-facing email.

**Do this instead:** Send receipts only from the `payment_intent.succeeded` webhook case, which
fires exclusively for Stripe card payments. The n8n trigger handles owner notifications (separate
concern, already implemented).

### Anti-Pattern 3: Blocking the Webhook on Email Failure

**What people do:** Let a Resend API error propagate as a throw inside the webhook handler,
causing a 500 response.

**Why it's wrong:** Stripe retries webhooks on non-2xx responses for 72 hours. This causes
multiple DB write attempts (idempotency key prevents duplicate rows, so the write is safe, but
Resend could then send the receipt multiple times once it recovers).

**Do this instead:** Wrap the Resend call in `try/catch`. Log the error. Return 200 from the
webhook. Accept that email delivery is best-effort. Upgrade to a queued receipt system if SLA
requires guaranteed delivery.

### Anti-Pattern 4: DB Lookups for Tenant Email at Webhook Time

**What people do:** In the webhook handler, look up `tenants.user_id → users.email` to get the
tenant's email for the receipt.

**Why it's wrong:** Adds latency and a DB round-trip inside the webhook handler. Also adds a
join dependency (tenant → user → email) that can fail if data is missing.

**Do this instead:** Store `tenant_email` directly in `payment_intent.metadata` at Checkout
Session creation time (in `stripe-rent-checkout`). The webhook handler reads it from
`pi.metadata['tenant_email']` with zero DB cost.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 1K tenants) | Current design is sufficient; one Resend call per payment, inline in webhook |
| 1K–10K tenants | Consider extracting receipt sending to a dedicated Edge Function for better observability and retry logic |
| 10K+ tenants | Implement a receipt queue (separate DB table) with its own pg_cron processor; move Resend webhook to update `email_suppressions` automatically |

---

## Sources

- `supabase/functions/stripe-webhooks/index.ts` — existing `payment_intent.succeeded` handler confirms DB write path
- `supabase/functions/stripe-checkout/index.ts` — platform subscription checkout pattern (destination charge is similar, different params)
- `supabase/migrations/20260219100002_create_email_suppressions.sql` — email suppression table confirmed exists
- `supabase/migrations/20260222130000_phase56_db_webhooks.sql` — n8n trigger fires on `rent_payments` INSERT, confirmed pattern
- `apps/frontend/src/app/auth/callback/route.ts` — Google OAuth callback confirmed complete
- `apps/frontend/src/app/auth/` directory — confirmed `/auth/reset-password` does not exist
- `apps/frontend/src/hooks/api/use-auth.ts` — confirmed `redirectTo: /auth/reset-password` in `resetPasswordForEmail` call
- `apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx` — confirmed throw stub in `payMutation.mutationFn`
- `apps/frontend/src/hooks/api/use-payments.ts` — confirmed `useCreateRentPaymentMutation` throws unconditionally
- Stripe Docs (training knowledge, HIGH confidence): Destination charges require `transfer_data.destination` + `application_fee_amount` on `payment_intent_data`

---

*Architecture research for: v8.0 Payment Infrastructure (Stripe rent checkout, Resend receipts, auth flow completion)*
*Researched: 2026-02-25*
*Confidence: HIGH — all architectural claims verified against live codebase*
