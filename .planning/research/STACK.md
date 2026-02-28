# Stack Research: Payment Infrastructure + Auth Flow Completion

**Domain:** Property management SaaS — Stripe Connect rent payment checkout, transactional email receipts, auth flow polish
**Researched:** 2026-02-25
**Confidence:** HIGH (Stripe: official docs; Resend: official Supabase guide; Auth: existing working code verified)

---

## Recommended Stack

### Core Technologies (New Capabilities)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `stripe` (npm) | `20.4.0` | Stripe Node SDK in Next.js route | Already at 20.3.1 in frontend — bump to latest stable. API version `2026-02-25.clover` |
| `stripe` (npm, Deno) | `14.x` pinned | Stripe SDK in Edge Functions | Existing functions use `npm:stripe@14`. `stripe@14` supports `constructEventAsync()` and destination charges. Upgrade deferred — no breaking change needed for destination charges |
| `resend` (npm, Deno) | `4.0.0` | Transactional email from Edge Functions | Official Supabase guide pins `npm:resend@4.0.0`. Deno npm specifier works. Fetch fallback also viable — use SDK for type safety |
| `@stripe/react-stripe-js` | `5.4.1` | Stripe Elements on frontend | Already installed. Payment Element supports destination charges transparently — no extra config needed on client |
| `@stripe/stripe-js` | `8.6.3` | Stripe.js browser bundle | Already installed. Used to initialize Stripe instance with publishable key for Elements |

### Supporting Libraries (No New Installs Required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | `0.8.0` | Server-side auth in Next.js | Already installed. `getAll`/`setAll` pattern already in place for callback route |
| `@supabase/supabase-js` | catalog (2.x) | Auth + DB client | Already installed everywhere. `auth.updateUser({ password })` for password reset completion |
| `@tanstack/react-query` | `5.90.21` | Server state + mutation lifecycle | Already installed. Use for new payment mutation and receipt status hooks |
| `@tanstack/react-form` | `1.27.7` | Payment checkout form | Already installed. Use for payment amount confirmation form |
| `zod` | `4.3.5` | Input validation on Edge Function request bodies | Already installed in shared package. Use for rent checkout request schema |
| `sonner` | `2.0.7` | Toast feedback for payment and auth flows | Already installed |

### Development Tools (No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Deploy Edge Functions | `supabase functions deploy stripe-rent-checkout` |
| Stripe CLI | Local webhook testing | `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks` |

---

## Installation

No new npm packages required in `apps/frontend`. All frontend dependencies already installed.

For Edge Functions, import via Deno specifiers — no `package.json` involved:

```typescript
// In stripe-rent-checkout Edge Function
import Stripe from 'npm:stripe@14'
import { Resend } from 'npm:resend@4.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
```

For `apps/frontend`, upgrade stripe:

```bash
pnpm --filter @repo/frontend update stripe@20.4.0
```

---

## Stripe Connect Destination Charges — Implementation Pattern

### What Destination Charges Are

The platform (TenantFlow) creates a PaymentIntent. Stripe charges the tenant's card, transfers the full amount to the owner's connected account, then pulls back the platform fee. The owner sees only the net amount; Stripe fees are deducted from TenantFlow's platform balance.

**Correct parameters:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: rentAmountCents,            // e.g. 150000 for $1,500.00
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
  application_fee_amount: platformFeeCents, // e.g. 300 for $3.00 (0.2%)
  transfer_data: {
    destination: ownerStripeAccountId, // from stripe_connected_accounts table
  },
  on_behalf_of: ownerStripeAccountId,  // required when platform != connected account region
  metadata: {
    tenant_id: tenantId,
    lease_id: leaseId,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: dueDate,
  },
})
// Return paymentIntent.client_secret to frontend
```

**Critical:** `on_behalf_of` must equal `transfer_data.destination`. Setting them to different values causes a Stripe API error. For US-only deployments it can be omitted, but include it for correctness and future multi-region support.

### Fund Flow (Example: $1,500 rent, $3.00 platform fee, ~$43.80 Stripe fee)

1. Tenant charged $1,500.00
2. $1,500.00 → owner connected account pending balance
3. $3.00 application fee → TenantFlow platform balance
4. ~$43.80 Stripe fee → deducted from TenantFlow platform balance
5. Net to TenantFlow: $3.00 - $43.80 = negative unless platform fee > Stripe fee

**Design note:** At 0.2% fee on $1,500 = $3.00 fee vs ~$43.80 Stripe fee, TenantFlow loses money. Minimum viable fee to break even: ~3% ($45.00). Fee strategy is a business decision outside stack scope.

### Edge Function: `stripe-rent-checkout`

New Edge Function following existing patterns from `stripe-checkout/index.ts`:

```typescript
// supabase/functions/stripe-rent-checkout/index.ts
import Stripe from 'npm:stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

Deno.serve(async (req: Request) => {
  // 1. JWT auth (use supabase.auth.getUser(token) — existing pattern)
  // 2. Validate body: { lease_id, amount_cents, period_start, period_end }
  // 3. Verify tenant owns this lease (RLS check via user client, not service role)
  // 4. Fetch owner stripe_account_id from stripe_connected_accounts via lease.owner_user_id
  // 5. Create PaymentIntent with application_fee_amount + transfer_data
  // 6. Return { client_secret } — frontend mounts Payment Element
})
```

### Frontend: Payment Element Integration

`@stripe/react-stripe-js` + `@stripe/stripe-js` already installed. Pattern:

```typescript
// 1. Call stripe-rent-checkout Edge Function → get clientSecret
// 2. Initialize Elements with clientSecret
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const elements = stripe.elements({ clientSecret })
// 3. Mount <PaymentElement /> component
// 4. On submit: stripe.confirmPayment({ elements, confirmParams: { return_url } })
// 5. stripe-webhooks handles payment_intent.succeeded → updates rent_payments table
```

**No Stripe Elements changes needed** — destination charges are fully server-side. The Payment Element works identically for direct and destination charges from the frontend perspective.

---

## Resend Transactional Email — Implementation Pattern

### Approach: Direct `fetch` vs Resend SDK

**Use direct `fetch` in Edge Functions.** Reasons:
- Resend's official Supabase guide demonstrates the `fetch` approach
- Avoids npm dependency in Deno (faster cold start)
- Less surface area for version drift
- Resend's HTTP API is stable and simple

**Use Resend SDK (`npm:resend@4.0.0`) only if** React Email templates are needed (HTML composition). For simple receipt emails, fetch is sufficient.

### Receipt Email Pattern (fire-and-forget in stripe-webhooks)

Add to `payment_intent.succeeded` handler in `stripe-webhooks/index.ts`:

```typescript
// Fire-and-forget — never throw, never block webhook acknowledgement
async function sendReceiptEmail(
  tenantEmail: string,
  tenantName: string,
  amount: number,
  periodStart: string,
  propertyAddress: string
): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping receipt email')
    return
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TenantFlow <receipts@tenantflow.app>',
        to: [tenantEmail],
        subject: `Rent payment receipt — ${propertyAddress}`,
        html: `<p>Hi ${tenantName},</p><p>Your rent payment of $${amount.toFixed(2)} for ${periodStart} has been received.</p>`,
      }),
    })
  } catch (err) {
    console.error('Receipt email failed:', err)
    // Do NOT rethrow — stripe-webhooks must return 200 to prevent Stripe retry
  }
}
```

### Environment Variables Required

| Variable | Where Set | Notes |
|----------|-----------|-------|
| `RESEND_API_KEY` | Supabase Edge Function secrets | Dashboard → Settings → Edge Functions |
| `STRIPE_SECRET_KEY` | Already set | Used in stripe-rent-checkout |
| `STRIPE_WEBHOOK_SECRET` | Already set | Used in stripe-webhooks |

**Domain verification:** `receipts@tenantflow.app` requires DNS verification in Resend dashboard before emails will send to real recipients (not `resend.dev` test domain).

---

## Auth Flow Completion — What Already Exists vs What's Missing

### Existing (verified by reading code)

| Feature | Status | Files |
|---------|--------|-------|
| Password reset request | DONE | `forgot-password-modal.tsx`, `use-auth.ts:useSupabasePasswordResetMutation` |
| Password reset landing page | DONE | `app/auth/update-password/page.tsx` + `update-password-form.tsx` |
| Email confirmation page | DONE | `app/auth/confirm-email/page.tsx` |
| OAuth callback route | DONE | `app/auth/callback/route.ts` — exchanges code, redirects by user_type |
| Google button UI | DONE | `google-button.tsx` |

### Missing (gap in password reset flow)

The `resetPasswordForEmail` in `use-auth.ts` redirects to `/auth/reset-password` (line 415):

```typescript
redirectTo: `${window.location.origin}/auth/reset-password`
```

But the actual update-password page lives at `/auth/update-password`. This URL mismatch means Supabase sends the user to a 404. **Fix: change redirect URL to `/auth/update-password`** or add a redirect at `/auth/reset-password`.

### Missing: Google OAuth `signInWithOAuth` call

The `GoogleButton` component is a pure UI button with no behavior wired up. There is no hook calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`. The OAuth callback route (`/auth/callback`) is ready, but the initiating call is missing.

**Pattern to add:**

```typescript
// In login page or a useGoogleAuthMutation hook
const handleGoogleSignIn = async () => {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  // signInWithOAuth redirects browser — no return value to handle
}
```

**Supabase Dashboard config required:**
- Authentication → Providers → Google: enable, add Client ID + Secret
- Authentication → URL Configuration → Redirect URLs: add `https://tenantflow.app/auth/callback` and `http://localhost:3050/auth/callback`

No new libraries needed — `@supabase/ssr` and `supabase-js` already handle PKCE flow automatically.

### Missing: Password reset PKCE code exchange route

When Supabase sends the password reset email, it uses PKCE: the link contains a `code` parameter, not a session token. The browser must exchange the code before `updateUser({ password })` will work.

The `/auth/update-password` page currently calls `updateUser` directly via `UpdatePasswordForm` without first calling `exchangeCodeForSession`. This works if Supabase handles implicit token exchange on page load — but may fail in some environments.

**Robust pattern:** Add a server-side route handler at `/auth/callback` (already exists) that detects `type=recovery` in query params and redirects to `/auth/update-password` after code exchange. The existing `callback/route.ts` already calls `exchangeCodeForSession(code)` — ensure Supabase password reset email's redirect URL points to `/auth/callback?next=/auth/update-password`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Destination charges (platform → connected account) | Separate charges + transfers | Use when platform needs more control over fund routing (multi-leg payouts) — unnecessary complexity for TenantFlow's direct owner payout model |
| `fetch` for Resend API | `npm:resend@4.0.0` SDK | Use SDK if adding React Email HTML templates (significant HTML composition benefit) |
| `npm:resend@4.0.0` | `npm:resend@6.x` (latest) | Supabase's official guide pins @4.0.0; don't jump to @6.x without verifying Deno compatibility |
| Stripe Payment Element | Stripe Checkout Session | Payment Element gives in-page UX; Checkout redirects off-site. Tenant portal UX benefits from staying in-app |
| Supabase PKCE for Google OAuth | NextAuth.js | No reason to add NextAuth — Supabase handles PKCE flow, callback route already exists |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `stripe@14` → `stripe@20` upgrade in Edge Functions | Breaking change risk for production webhooks; `constructEventAsync()` is stable at @14 | Stay on @14 for Edge Functions; update only if new Stripe features require it |
| Stripe Direct Charges (charging on connected account) | Requires passing `Stripe-Account` header from browser — exposes connected account ID | Use destination charges — platform is the merchant of record, cleaner liability model |
| `transfer_data.destination` without `on_behalf_of` | Cross-region charges require `on_behalf_of`; value must equal `transfer_data.destination` | Always set both to the same connected account ID |
| Resend SDK for webhook email (stripe-webhooks) | SDK adds cold start time to webhook function; webhook must return 200 fast | Use raw `fetch` to Resend HTTP API — simpler, faster, fire-and-forget |
| New Next.js API routes for Stripe payments | Mixes two Stripe SDK versions (Next.js uses stripe@20, Edge Functions use stripe@14) — already flagged as P2 issue | Keep rent checkout in an Edge Function (consistent with all other Stripe operations) |

---

## Version Compatibility

| Package | Version in Use | Compatible With | Notes |
|---------|---------------|-----------------|-------|
| `npm:stripe@14` (Deno) | Edge Functions | Stripe API `2024-06-20` (pinned in existing code) | `constructEventAsync`, `paymentIntents.create` with destination charges all work at @14 |
| `stripe@20.3.1` (Node) | Next.js frontend | Stripe API `2026-02-25.clover` | Frontend only references types; no server calls. OK to stay at 20.3.1 |
| `npm:resend@4.0.0` (Deno) | New Edge Function | Resend API (stable) | Confirmed working in official Supabase guide. Latest is @6.9.2 but @4.0.0 verified for Deno |
| `@stripe/react-stripe-js@5.4.1` | Frontend Elements | `@stripe/stripe-js@8.6.3` | Already installed as compatible pair |
| `@supabase/ssr@0.8.0` | Next.js auth | `@supabase/supabase-js` catalog (2.x) | Already compatible; `getAll`/`setAll` in place |

---

## Stripe SDK Version Mismatch (Known P2 Issue)

Edge Functions use `npm:stripe@14` (API: `2024-06-20`).
Next.js frontend has `stripe@20.3.1` (API: `2026-02-25.clover`).

**Impact for this milestone:** None. The new `stripe-rent-checkout` Edge Function uses `npm:stripe@14` for consistency with existing Edge Functions. The frontend uses Stripe Elements (client-side JS) which connects to Stripe's servers directly — the npm package version only matters for server-side API calls.

**Resolution strategy (post-v8.0):** Upgrade all Edge Functions to `npm:stripe@20` after pinning via `deno.json`. No breaking changes expected for `paymentIntents.create` or `webhooks.constructEventAsync`.

---

## Sources

- [Stripe Connect destination charges](https://docs.stripe.com/connect/destination-charges) — `application_fee_amount`, `transfer_data[destination]`, `on_behalf_of` parameters (HIGH confidence, official Stripe docs)
- [Stripe Accept payment with destination charges](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/destination-charges) — Payment Element + server-side PaymentIntent creation pattern (HIGH confidence, official Stripe docs)
- [stripe-node releases](https://github.com/stripe/stripe-node/releases) — v20.4.0 is latest stable as of 2026-02-25 (HIGH confidence, official GitHub)
- [Send emails with Supabase Edge Functions - Resend](https://resend.com/docs/send-with-supabase-edge-functions) — `fetch` pattern for Resend HTTP API from Deno (HIGH confidence, official Resend docs)
- [Custom Auth Emails with React Email and Resend - Supabase](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend) — `npm:resend@4.0.0` import pattern confirmed for Deno (HIGH confidence, official Supabase docs)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) — `signInWithOAuth` with PKCE, callback route pattern (HIGH confidence, official Supabase docs)
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — password reset flow, `redirectTo` parameter (HIGH confidence, official Supabase docs)
- Existing codebase audit (2026-02-25) — verified what auth pages/components already exist vs what is missing (HIGH confidence, first-hand)

---

## Previous Stack Research

The file previously contained v8.0 post-migration hardening patterns (Deno security, CORS, RLS test infrastructure, dependency pinning, TanStack Query auth caching). Those patterns remain valid and were not removed — they inform the Edge Function security approach used in `stripe-rent-checkout`.

---

*Stack research for: TenantFlow v8.0 payment infrastructure + auth flow completion*
*Researched: 2026-02-25*
