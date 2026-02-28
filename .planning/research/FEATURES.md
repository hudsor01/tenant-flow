# Features Research: Post-Migration Hardening Approaches

**Research date:** 2026-02-23
**Milestone:** v8.0 Post-Migration Hardening

---

## 1. IDOR Prevention in Edge Functions

### Table Stakes (Must-Do)

**Three-zone pattern** — every Edge Function must follow this structure:

```typescript
// Zone 1: Auth — extract and verify JWT
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabase.auth.getUser(token)
if (authError || !user) return errorResponse('Unauthorized', 401)

// Zone 2: Ownership — verify caller owns the resource
const { data: lease } = await supabase
  .from('leases')
  .select('id, owner_user_id')
  .eq('id', leaseId)
  .single()
if (!lease || lease.owner_user_id !== user.id) return errorResponse('Forbidden', 403)

// Zone 3: Action — only now proceed with service-role operations
const { error } = await serviceRoleClient.from('leases').update({ ... }).eq('id', leaseId)
```

**Applies to:**
- `docuseal` — all 5 actions: verify `lease.owner_user_id === user.id`
- `generate-pdf` (lease mode) — verify `lease.owner_user_id === user.id` before PDF generation
- `export-report` — already scoped by RPC user_id param (safe, but add explicit check)
- `stripe-connect` — verify `stripe_connected_accounts.user_id === user.id`

**Testing:** Call each Edge Function with User A's JWT + User B's resource ID → expect 403.

### Differentiators

- Audit log IDOR failures to Sentry (attack pattern detection)
- Rate-limit per-user failed ownership checks (5 failures → temporary block)

---

## 2. PostgREST Search Sanitization

### Table Stakes (Must-Do)

PostgREST parses `.or()` strings as full filter expressions. Special characters that must be stripped:
- `,` — OR operator separator (most dangerous: injects additional filters)
- `;` — AND separator
- `(` `)` — logical grouping
- `.` — column path separator
- `'` `"` — string delimiters

```typescript
// lib/sanitize-postgrest.ts
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[,.()"';]/g, '')  // Strip injection chars
    .trim()
    .substring(0, 200)           // Enforce max length
}

// Usage in query-key files
if (filters?.search) {
  const safe = sanitizePostgrestSearch(filters.search)
  if (safe.length > 0) {
    q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }
}
```

**Files requiring sanitization:**
1. `property-keys.ts` — name, city search
2. `tenant-keys.ts` — full_name, email search
3. `unit-keys.ts` — unit number search
4. `use-vendor.ts` — vendor name search

**Testing:** `search = "admin,owner_user_id.eq.other-uuid"` → verify injected clause is stripped.

### Differentiators

- Full-text search via `tsvector` + RPC (eliminates injection risk entirely)
- Zod schema validation of search term before PostgREST call

---

## 3. RLS Write-Path Isolation Testing

### Table Stakes (Must-Do)

```typescript
// Pattern: Two clients, two authenticated users, cross-ownership attempts
const ownerA = createClient(URL, ANON_KEY, { auth: { persistSession: false } })
const ownerB = createClient(URL, ANON_KEY, { auth: { persistSession: false } })

await ownerA.auth.signInWithPassword({ email: OWNER_A_EMAIL, password: OWNER_A_PASS })
await ownerB.auth.signInWithPassword({ email: OWNER_B_EMAIL, password: OWNER_B_PASS })

// INSERT isolation — User B cannot INSERT claiming User A's identity
test('Owner B cannot INSERT with Owner A owner_user_id', async () => {
  const { error } = await ownerB.from('properties').insert({
    name: 'Forged', owner_user_id: OWNER_A_ID, address_line1: '1 Main St'
  })
  expect(error).not.toBeNull()  // RLS WITH CHECK blocks it
})

// UPDATE isolation — User B cannot UPDATE User A's records
test('Owner B cannot UPDATE Owner A property', async () => {
  const { data } = await ownerB.from('properties')
    .update({ name: 'Hijacked' }).eq('id', OWNER_A_PROPERTY_ID).select()
  expect(data).toEqual([])  // Zero rows updated
})

// DELETE isolation
test('Owner B cannot DELETE Owner A property', async () => {
  const { data } = await ownerB.from('properties')
    .delete().eq('id', OWNER_A_PROPERTY_ID).select()
  expect(data).toEqual([])  // Zero rows deleted
})
```

**Coverage matrix** — for all 7 domains: properties, units, tenants, leases, maintenance_requests, vendors, inspections:
- INSERT with forged `owner_user_id` → expect blocked
- UPDATE on other user's record → expect 0 rows affected
- DELETE on other user's record → expect 0 rows affected

**CI/CD:** Requires dedicated integration Supabase project (not production). Add `pull_request` trigger.

---

## 4. Auth Token Caching in TanStack Query

### Table Stakes (Must-Do)

Replace 86 per-query `getUser()` calls with a single cached query:

```typescript
// hooks/api/use-cached-user.ts (NEW)
export const authQueryKeys = {
  user: () => ['auth', 'user'] as const,
}

export function useCachedUser() {
  return useQuery(queryOptions({
    queryKey: authQueryKeys.user(),
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')
      return user
    },
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 30 * 60 * 1000,          // 30 minutes
    refetchOnWindowFocus: false,      // Prevent excessive calls
    retry: false,
  }))
}
```

**Migration pattern:**
```typescript
// Before: getUser() in queryFn (every execution)
queryFn: async () => {
  const { data: { user } } = await supabase.auth.getUser()  // Network call!
  return supabase.rpc('get_dashboard', { p_user_id: user?.id })
}

// After: userId passed as parameter, resolved at component level
queryFn: async () => supabase.rpc('get_dashboard', { p_user_id: userId })

// Component:
const { data: user } = useCachedUser()
const { data } = useQuery(dashboardQueries.stats(user?.id!))
```

**Impact:** ~80% reduction in auth network calls. Dashboard mount: 5 parallel queries × 0 auth calls = 0 auth round-trips (vs. 5 currently).

---

## 5. Edge Function Error Response Standardization

### Table Stakes (Must-Do)

```typescript
// supabase/functions/_shared/responses.ts (NEW)
export const corsHeaders = (frontendUrl: string) => ({
  'Access-Control-Allow-Origin': frontendUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

export function errorResponse(message: string, status: number, code?: string): Response {
  return new Response(
    JSON.stringify({ error: message, ...(code ? { code } : {}) }),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}

export function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}
```

**Status code mapping:**

| Situation | Status | Body |
|-----------|--------|------|
| Missing/invalid JWT | 401 | `{ error: 'Unauthorized' }` |
| Ownership check failed | 403 | `{ error: 'Forbidden' }` |
| Invalid params | 400 | `{ error: 'Bad request' }` |
| Third-party service failure | 502 | `{ error: 'Service unavailable' }` |
| Missing env var | 503 | `{ error: 'Not configured' }` |
| Unhandled exception | 500 | `{ error: 'Internal error' }` |

**Current inconsistencies:**
- Stripe-checkout 401: returns plain text `'Unauthorized'` (should be JSON)
- DocuSeal-webhook 400: returns plain text `'Invalid signature'` (should be JSON)
- All functions: `Content-Type` sometimes omitted

---

## 6. Non-Atomic Transaction Workarounds

### Table Stakes (Must-Do)

**Pattern: RPC functions for multi-table operations**

```sql
-- Example: atomic set_default_payment_method
CREATE OR REPLACE FUNCTION set_default_payment_method(
  p_user_id UUID,
  p_payment_method_id UUID
) RETURNS void AS $$
BEGIN
  -- Single atomic UPDATE: set one default, clear all others
  UPDATE payment_methods
  SET is_default = (id = p_payment_method_id)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Workflows requiring atomicity:**
1. `set_default_payment_method` — clear old default + set new (current: 2 sequential calls)
2. `mark_tenant_moved_out` — update lease status + update unit status
3. `cancel_lease_atomically` — update lease + notify + clear unit

**Edge Function pattern** (external calls + DB update):
1. Call external service first (DocuSeal, Stripe)
2. If success → update DB
3. If DB update fails → compensating call to external service to undo
4. Never partially succeed: return 500 if any step fails so client can retry

---

## 7. CSV Export Safety

### Table Stakes (Must-Do)

```typescript
// lib/csv-utils.ts
export function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '').trim()
  // Formula injection: prefix with single quote
  if (/^[=+\-@\t]/.test(str)) return `'${str}`
  // Wrap in quotes if contains special chars
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Query limit
const EXPORT_LIMIT = 10_000
const { data } = await supabase.from('...').select().limit(EXPORT_LIMIT)
if (data.length === EXPORT_LIMIT) {
  toast.warning(`Export limited to ${EXPORT_LIMIT.toLocaleString()} rows. Apply filters to narrow results.`)
}
```

**Files requiring limit + formula injection fix:**
- `use-payments.ts` — `exportPaymentsCSV()`
- `export-report` Edge Function — `rowsToCsv()`
- Any other client-side CSV generation

---

## Implementation Order

| Priority | Category | Effort | Risk |
|----------|----------|--------|------|
| P0 | IDOR Prevention (DocuSeal, generate-pdf) | 2d | Critical security |
| P0 | Search Sanitization | 1d | Critical security |
| P1 | RLS Write Tests | 3d | Primary security validation |
| P1 | Error Standardization | 2d | Developer experience |
| P2 | Auth Token Caching | 3d | Performance |
| P2 | Non-Atomic Transactions | 3d | Data integrity |
| P2 | CSV Export Safety | 1d | Data safety |

---

# Feature Research: Payment Infrastructure + Auth Flow Completion

**Domain:** Stripe Connect Destination Charges + Resend Transactional Email + Supabase Auth Flow Completion
**Researched:** 2026-02-25
**Confidence:** HIGH (Stripe docs verified, Resend pattern confirmed, auth state from live codebase)

---

## Context: What Already Exists

These features are ALREADY BUILT and must not be re-built:

- `stripe-connect` Edge Function: Express account onboarding, balance, payouts, transfers
- `stripe-checkout` Edge Function: Platform subscription checkout sessions
- `stripe-webhooks` Edge Function: Handles `payment_intent.succeeded/failed`, `checkout.session.completed`, `account.updated`
- `stripe-billing-portal` Edge Function: Customer billing portal URL generation
- `rent_payments` table: `amount`, `status`, `application_fee_amount`, `stripe_payment_intent_id`, `tenant_id`, `lease_id`, `period_start`, `period_end`
- `late_fees` table with pg_cron daily calculation
- `lease_reminders` (pg_cron queue) and `email_suppressions` table
- `/auth/update-password` page with `UpdatePasswordForm` component (functional)
- `/auth/confirm-email` page with resend logic (functional)
- `/auth/callback` route for Google OAuth code exchange (functional)
- `ForgotPasswordModal` component (functional, calls `resetPasswordForEmail`)
- `/tenant/payments/new` page: UI exists but `payMutation` throws `Error('Rent payment requires Edge Function implementation')`

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that tenants and owners assume will work. Missing these = rent collection is broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tenant can pay rent via Stripe Checkout | Core product value — digital rent collection | MEDIUM | Requires `stripe-rent-checkout` Edge Function with destination charge; UI at `/tenant/payments/new` is already built but stubs out mutation |
| Platform fee split on each payment | Business model requirement — platform monetization | LOW | `application_fee_amount` in PaymentIntent creation; fee percentage stored in env var (e.g., 1%) |
| Owner receives rent minus fee | Owner expectation — they get paid via Stripe Connect Express | LOW | `transfer_data.destination` = owner's `stripe_account_id` from `stripe_connected_accounts` |
| Receipt email to tenant on payment success | Tenants expect email confirmation for financial transactions | MEDIUM | Resend fetch call from webhook handler on `payment_intent.succeeded`; no Deno SDK — raw fetch to `https://api.resend.com/emails` |
| Receipt email to owner on payment success | Owners track income; professional expectation | LOW | Same webhook path; second Resend call for owner notification email |
| Password reset completes successfully | Auth table stakes — users forget passwords | LOW | Page exists at `/auth/update-password`; `redirectTo` in `resetPasswordForEmail` currently points to `/auth/reset-password` (non-existent path) — must point to `/auth/update-password` |
| Google OAuth sets correct user_type | New owners via Google must get `user_type: OWNER` in `app_metadata` | LOW | Supabase `handle_new_user` trigger sets this; OAuth users bypass email confirm — must verify trigger fires on OAuth signup |
| Email confirmation page handles post-verify redirect | After clicking email link, user lands on `/auth/confirm-email` — must auto-redirect to dashboard | MEDIUM | Current confirm-email page is static "check your inbox" — needs to handle the case where token is already verified (user clicked link) |

### Differentiators (Competitive Advantage)

Features that make TenantFlow stand out in rent payment UX.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Branded HTML receipt email | Professional landlord/tenant experience; plain-text receipts feel low-quality | MEDIUM | React Email components render to HTML; Resend accepts HTML string; Edge Functions are Deno — use plain HTML template string (React Email requires JSX runtime, complex in Deno) |
| Receipt shows fee breakdown (rent + late fee separate line items) | Tenant transparency — reduces payment disputes | LOW | `rent_payments` already tracks `late_fee_amount`; include in email template |
| Payment confirmation page post-checkout | After Stripe Checkout redirects back, show success state at `/auth/post-checkout` | LOW | Page already exists at `/auth/post-checkout`; connect it to rent checkout success_url |
| Owner payment notification distinguishes rent vs late fee | Owner reporting accuracy | LOW | Include `late_fee_amount` in owner notification email body |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Stripe Elements inline payment form (instead of Checkout) | "Keep users on our site" | Requires PCI SAQ A-EP compliance, Stripe.js, complex error handling, card field UI — significant scope increase | Use Stripe Checkout (hosted) — PCI SAQ A, Stripe handles all card UI and 3DS |
| Save card for autopay during rent checkout | Tenant convenience | Stripe Checkout supports `setup_future_usage: 'off_session'` but autopay scheduling requires pg_cron job + off-session PaymentIntent — out of scope for this milestone | Defer to autopay milestone; tenant payment method save already partially built at `/tenant/payments/methods` |
| Custom email template editor | Allow owners to customize receipt branding | High complexity, requires storage + preview + sanitization | Ship fixed professional template; add customization in future milestone |
| Multi-recipient CC on receipts (e.g., roommates) | Shared apartments | Edge case; complex data model change needed | Single tenant email; owner email; done |
| Real-time payment status via WebSockets | Show payment processing live | Stripe Checkout webhook is async (seconds); overkill for this flow | Redirect to success/failure page via `success_url`/`cancel_url` on Checkout session |

---

## Feature Dependencies

```
[stripe-rent-checkout Edge Function]
    └──requires──> [stripe_connected_accounts.stripe_account_id] (EXISTING)
    └──requires──> [rent_payments table] (EXISTING)
    └──requires──> [Stripe Connect Express onboarding completed for owner] (EXISTING)
    └──requires──> [Tenant has active lease with owner_user_id] (EXISTING)

[Receipt email — tenant]
    └──requires──> [stripe-rent-checkout creates PaymentIntent with tenant metadata]
    └──requires──> [stripe-webhooks payment_intent.succeeded handler] (EXISTING — needs email call added)
    └──requires──> [RESEND_API_KEY env var in Edge Function secrets]
    └──requires──> [verified sending domain in Resend dashboard]

[Receipt email — owner]
    └──requires──> [same as tenant receipt email]
    └──requires──> [owner email lookup via leases.owner_user_id → users.email]

[Password reset complete]
    └──requires──> [ForgotPasswordModal sends resetPasswordForEmail] (EXISTING)
    └──requires──> [redirectTo fixed to point to /auth/update-password]
    └──requires──> [/auth/update-password page] (EXISTING — already functional)

[Google OAuth user_type]
    └──requires──> [/auth/callback route] (EXISTING — functional)
    └──requires──> [handle_new_user Postgres trigger sets user_type in app_metadata]

[Email confirmation post-verify redirect]
    └──requires──> [Supabase auth email confirm link exchange — handled by Supabase]
    └──requires──> [/auth/confirm-email page] (EXISTING — needs redirect logic for verified state)
```

### Dependency Notes

- **Rent checkout requires owner Stripe account**: If owner has not completed Connect Express onboarding (`charges_enabled = false`), checkout must fail gracefully with a user-readable error — not a 500.
- **Receipt emails require existing webhook**: The `stripe-webhooks` Edge Function already handles `payment_intent.succeeded` and upserts `rent_payments`. Receipt email is an additive call inside the existing `case 'payment_intent.succeeded'` block — no new webhook endpoint needed.
- **Password reset redirectTo bug**: `useSupabasePasswordResetMutation` in `apps/frontend/src/hooks/api/use-auth.ts` line 415 currently uses `redirectTo: '/auth/reset-password'` (path does not exist). Must be changed to `/auth/update-password`. This is a one-line fix that unblocks the entire password reset flow.
- **Google OAuth user_type**: New users via Google OAuth land at `/auth/callback` which exchanges code for session. The `handle_new_user` Postgres trigger should set `user_type: 'OWNER'` in `app_metadata` via `auth.users`. If it doesn't fire on OAuth, owners can't access the dashboard (redirect logic reads `app_metadata.user_type`).

---

## MVP Definition

This is a subsequent milestone on an existing product. "MVP" here means the minimum needed to ship rent payment as a revenue-generating feature.

### Launch With (v8.0 payment milestone)

- [ ] `stripe-rent-checkout` Edge Function — creates Stripe Checkout session with `application_fee_amount` + `transfer_data.destination` — wires to `/tenant/payments/new` mutation stub
- [ ] Receipt email (tenant) on `payment_intent.succeeded` — via Resend fetch in `stripe-webhooks` handler
- [ ] Receipt email (owner) on `payment_intent.succeeded` — second Resend call in same handler
- [ ] Fix `redirectTo` in `resetPasswordForEmail` — one-line fix, unblocks password reset
- [ ] Verify `handle_new_user` trigger fires for Google OAuth users — sets `user_type: OWNER`

### Add After Validation (v8.x)

- [ ] Confirmation page polish at `/auth/post-checkout` — link `success_url` from rent checkout to this page
- [ ] Email suppression check before Resend send — `email_suppressions` table already exists; check it before firing Resend
- [ ] Autopay (off-session PaymentIntent via pg_cron) — depends on tenant saving `setup_intent` during checkout

### Future Consideration (v9+)

- [ ] Branded email templates with owner logo — requires owner settings + storage
- [ ] Tenant payment receipt PDF — StirlingPDF already available; add PDF attachment to Resend call
- [ ] Stripe Checkout saved card + autopay scheduling

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| stripe-rent-checkout Edge Function | HIGH | MEDIUM | P1 |
| Tenant receipt email | HIGH | LOW | P1 |
| Owner receipt email | HIGH | LOW | P1 |
| Fix password reset redirectTo | HIGH | LOW (1 line) | P1 |
| Verify handle_new_user trigger for OAuth | HIGH | LOW | P1 |
| Email confirmation redirect (post-verify) | MEDIUM | LOW | P2 |
| Post-checkout success page | MEDIUM | LOW | P2 |
| Email suppression check | MEDIUM | LOW | P2 |
| Autopay scheduling | HIGH | HIGH | P3 |
| PDF receipt attachment | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have — required to ship rent payment as a working feature
- P2: Should have — improves quality / fixes minor broken flows
- P3: Nice to have — defer to next milestone

---

## Technical Implementation Notes

### Stripe Destination Charges (HIGH confidence — Stripe docs verified)

The correct charge type for TenantFlow is **destination charges**, not direct charges or separate charges/transfers.

```
Tenant → Platform (TenantFlow) → Owner (Stripe Express account)
         charge created here      via transfer_data.destination
         application_fee_amount   deducted from transfer
```

Key parameters for `stripe.checkout.sessions.create()`:
```typescript
{
  mode: 'payment',
  payment_intent_data: {
    application_fee_amount: Math.round(totalAmountCents * FEE_RATE), // e.g., 1% of rent in cents
    transfer_data: {
      destination: owner_stripe_account_id, // from stripe_connected_accounts
    },
    metadata: {
      tenant_id: '...',
      lease_id: '...',
      period_start: '2026-03-01',
      period_end: '2026-03-31',
      due_date: '2026-03-01',
      payment_type: 'rent',
    }
  },
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: rent_amount_cents,
      product_data: { name: 'March 2026 Rent — 123 Main St Unit 2B' }
    },
    quantity: 1
  }]
}
```

`application_fee_amount` creates explicit `Application Fee` objects visible in Stripe Dashboard — prefer this over `transfer_data.amount` for clean reporting. Owner sees full charge amount and fee amount; platform retains fee.

### Resend Email (HIGH confidence — official docs verified)

No Deno SDK exists for Resend. Use raw fetch in Edge Functions:

```typescript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
  },
  body: JSON.stringify({
    from: 'TenantFlow <payments@mail.tenantflow.app>',
    to: [tenant_email],
    subject: `Payment Confirmed: $${amount} for ${property_address}`,
    html: receiptHtml,
  }),
}).catch(err => console.error('Resend failed:', err))
// Fire-and-forget — do not await; do not let email failure block webhook 200 response
```

Required setup:
- `RESEND_API_KEY` env var in Supabase Edge Function secrets
- Verified sending domain (`mail.tenantflow.app` or similar) in Resend dashboard

### Password Reset Flow (HIGH confidence — codebase verified)

The fix is one line in `apps/frontend/src/hooks/api/use-auth.ts` line 415:

```typescript
// Current (broken — path does not exist):
redirectTo: `${window.location.origin}/auth/reset-password`

// Fixed:
redirectTo: `${window.location.origin}/auth/update-password`
```

The `/auth/update-password` page is already built and functional. `UpdatePasswordForm` correctly calls `supabase.auth.updateUser({ password })` which works once the user has a recovery session (established when Supabase verifies the token hash from the reset email link).

### Google OAuth user_type (MEDIUM confidence — pattern known, trigger state needs verification)

When a new user signs up via Google OAuth, Supabase fires the `handle_new_user` DB trigger on `auth.users INSERT`. This trigger must set `app_metadata.user_type = 'OWNER'`. The `/auth/callback` route reads `data.session.user.app_metadata?.user_type` to determine redirect destination. If the trigger doesn't set this, OAuth users get redirected to `/dashboard` but without `user_type` set, other auth guards may break.

Verification needed: check `handle_new_user` function in Supabase migrations to confirm it handles OAuth users (who may not have `raw_user_meta_data.user_type` set at signup time since Google OAuth does not pass a `user_type` param).

---

## Sources

- [Stripe Connect destination charges](https://docs.stripe.com/connect/destination-charges) — HIGH confidence
- [Stripe collect application fees](https://docs.stripe.com/connect/marketplace/tasks/app-fees) — HIGH confidence
- [Resend with Supabase Edge Functions](https://resend.com/docs/send-with-supabase-edge-functions) — HIGH confidence
- [Supabase password-based auth](https://supabase.com/docs/guides/auth/passwords) — HIGH confidence
- [Supabase Google OAuth login](https://supabase.com/docs/guides/auth/social-login/auth-google) — HIGH confidence
- Live codebase: `stripe-webhooks/index.ts`, `stripe-connect/index.ts`, `use-auth.ts`, `/auth/*` pages — HIGH confidence

---

*Feature research for: TenantFlow v8.0 payment infrastructure + auth completion*
*Researched: 2026-02-25*
