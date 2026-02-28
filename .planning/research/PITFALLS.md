# Pitfalls Research

**Domain:** Payment infrastructure additions — Stripe Connect destination charges, Resend transactional email, Supabase Auth completion pages on existing SaaS
**Researched:** 2026-02-25
**Confidence:** HIGH (verified against official Stripe docs, Supabase docs, and codebase reality)

---

## Critical Pitfalls

### Pitfall 1: application_fee_amount Does Not Account For Stripe's Processing Cut

**What goes wrong:**

The platform calculates `application_fee_amount` as a percentage of the full charge (e.g., 3% of $1,200 = $36). The full $1,200 is sent to the connected account, then $36 is pulled back to the platform. However, Stripe's 2.9% + $0.30 processing fee is subtracted from the platform's $36, not from the connected account's share. The platform nets $36 - $35.10 = $0.90 instead of the expected $36.

This is the opposite of what most people assume. The connected account receives the full transfer amount minus the application fee. Stripe deducts its processing fee from the platform's application fee.

**Why it happens:**

Developers treat `application_fee_amount` as gross platform revenue. The Stripe docs say "your platform pays the Stripe fee after the application_fee_amount is transferred." This is easy to misread. The code in `payment_intent.succeeded` already stores `pi.application_fee_amount / 100` — this number is correct (what Stripe took back), but `pi.application_fee_amount` is the gross platform fee before Stripe's cut, not the net.

**How to avoid:**

Calculate platform net revenue as: `application_fee_amount - stripe_fee`. Display this correctly in owner dashboards and financial reports. When deciding what `application_fee_amount` to charge, work backwards from desired net: `desired_net / (1 - 0.029) + 0.30` approximates the required gross fee. The existing `rent_payments.application_fee_amount` column stores the gross fee value from Stripe — add a separate display calculation for net, do not alter the stored value.

**Warning signs:**

- Financial reports show inflated platform revenue
- `application_fee_amount` equals exactly N% of rent amount without the Stripe surcharge baked in
- No calculation for `stripe_processing_fee` anywhere in codebase
- Owners complain the payout is lower than expected given the stated fee percentage

**Phase to address:** Phase implementing the `stripe-rent-checkout` Edge Function (fee split) — define fee calculation in that function and document the net vs. gross distinction.

---

### Pitfall 2: Destination Charge Requires Connected Account to Have charges_enabled = true

**What goes wrong:**

The `stripe-rent-checkout` Edge Function calls `stripe.paymentIntents.create()` with `transfer_data: { destination: connected_account_id }`. If the connected account has not completed Stripe onboarding (`charges_enabled = false`), the API returns error `account_invalid: The provided key 'acct_...' does not have access to this API call.` The tenant sees a payment failure with no actionable error message.

**Why it happens:**

The existing `stripe-connect` Edge Function already tracks `charges_enabled` in the `stripe_connected_accounts` table via `account.updated` webhooks. The new checkout Edge Function must read this flag before creating the PaymentIntent. It is tempting to skip this check because onboarding should have already happened — but the flag could be revoked, expired, or never set if the webhook was missed.

**How to avoid:**

In the new `stripe-rent-checkout` Edge Function, before creating the PaymentIntent:
1. Look up the lease's owner via `leases.owner_user_id`
2. Query `stripe_connected_accounts` for that owner
3. Assert `charges_enabled = true` — return HTTP 422 with a tenant-facing error if not
4. Guard against missing row (owner never onboarded)

Do not rely solely on the Stripe API error as the user-facing signal — catch the Stripe error and translate it to an actionable message ("The property owner's payment account is not yet verified").

**Warning signs:**

- No `charges_enabled` check before PaymentIntent creation
- Stripe error code `account_invalid` appearing in production logs
- Tenants can initiate payment flow for properties whose owners haven't onboarded

**Phase to address:** Phase implementing `stripe-rent-checkout` Edge Function.

---

### Pitfall 3: Webhook Receipt Email Never Fires Because RESEND_API_KEY Call Is Missing

**What goes wrong:**

`RESEND_API_KEY` is configured in Supabase Edge Function secrets. The `email_suppressions` table exists. The `payment_intent.succeeded` handler in `stripe-webhooks/index.ts` updates the `rent_payments` record but never calls Resend. The receipt email is effectively a stub that will silently not fire when the milestone is "complete."

**Why it happens:**

The milestone scope says "automated receipt emails (Resend) fire-and-forget on payment success." The most natural implementation is adding the Resend call inside `stripe-webhooks/index.ts` at the `payment_intent.succeeded` case. But the `stripe-webhooks` function already has substantial logic. Developers might add the Resend call but forget to check `email_suppressions` first, or add it in the wrong function, or leave it as a TODO after wiring the payment flow.

**How to avoid:**

In the `payment_intent.succeeded` handler, after updating `rent_payments`, add a fire-and-forget email block:
```typescript
// Fire-and-forget — do not await, do not throw
sendReceiptEmail(supabase, pi).catch(err =>
  console.error('Receipt email failed (non-fatal):', err.message)
)
```

The `sendReceiptEmail` function must: (1) check `email_suppressions` table before calling Resend, (2) build the Resend `fetch` call inline (not an npm import — Deno `fetch` is sufficient), (3) use the tenant's email from the lease/tenant record.

Verify the Resend call is actually wired by checking the Edge Function logs after a test payment — a `console.log('Receipt email sent for payment:', pi.id)` marker is sufficient.

**Warning signs:**

- No Resend API call anywhere in `stripe-webhooks/index.ts` after the `payment_intent.succeeded` case
- `RESEND_API_KEY` referenced in documentation but not in any `.ts` file under `supabase/functions/`
- No log line "Receipt email sent" appearing in Edge Function logs after test payments

**Phase to address:** Phase implementing receipt emails (after the stripe-rent-checkout function works end-to-end).

---

### Pitfall 4: email_suppressions Check Skipped Before Every Email Send

**What goes wrong:**

A tenant has a bounced or complained email in `email_suppressions`. An email is sent anyway because the suppression check was either forgotten or added to the wrong code path. Resend blocks the send (good), but the Edge Function receives an error response and potentially throws, failing the entire payment webhook and triggering Stripe retries.

**Why it happens:**

The `email_suppressions` table comment says "read by email sending services before dispatching." But it is easy to add a Resend call and assume Resend handles deduplication. Resend has its own suppression list, but the project maintains its own table for audit purposes and to pre-check before making the API call.

**How to avoid:**

Create a shared helper at the top of any email-sending Edge Function:
```typescript
async function isEmailSuppressed(supabase: SupabaseClient, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return data !== null
}
```

Call this before every `fetch('https://api.resend.com/emails', ...)`. Return early (not throw) if suppressed — a suppressed email is not an error, it is expected behavior.

**Warning signs:**

- `fetch('https://api.resend.com/emails', ...)` in Edge Function code not preceded by `email_suppressions` query
- Email sends inside `try/catch` that propagate errors when suppressed
- Test coverage does not include a case where the tenant's email is in suppressions

**Phase to address:** Phase implementing receipt emails and any subsequent email-sending feature.

---

### Pitfall 5: Stripe SDK Version Mismatch Between Edge Functions (stripe@14) and Frontend (stripe@20)

**What goes wrong:**

The five Edge Functions all use `npm:stripe@14`. The frontend's `package.json` has `stripe@20.3.1`. When building the new `stripe-rent-checkout` Edge Function, a developer copies patterns from the frontend Stripe code and inadvertently imports types or response shapes from stripe@20. The Edge Function uses `npm:stripe@14` at runtime but TypeScript types are from stripe@20 — subtle type errors or missing fields at runtime.

More importantly, the `apiVersion: '2024-06-20'` used in all five existing Edge Functions may not match stripe@20 API behavior. If any code in the new Edge Function assumes stripe@20 response shapes (e.g., new fields added after 2024-06-20), those fields will be absent at runtime.

**Why it happens:**

The mismatch was noted in project memory as a known P2 issue but never resolved. When adding the new Edge Function, the easiest path is to match the existing pattern (`npm:stripe@14`, `apiVersion: '2024-06-20'`). The pitfall occurs when reaching for the frontend's stripe utilities or TypeScript types as reference.

**How to avoid:**

The new `stripe-rent-checkout` Edge Function must use `npm:stripe@14` and `apiVersion: '2024-06-20'` to match all existing Edge Functions. Do not import any types from the frontend's `stripe@20.3.1` package. The strategic fix (aligning all Edge Functions to stripe@20) is a separate decision that requires reviewing all 5 existing functions for breaking changes — defer this to a dedicated phase, not a side-effect of adding a new function.

If the v14→v20 upgrade is done in the same phase: review the stripe-node CHANGELOG for every major version bump between 14 and 20. The `2024-09-30.acacia` release introduced breaking changes. Update `apiVersion` to match the new SDK's expected API version.

**Warning signs:**

- New Edge Function imports from `npm:stripe@20` while existing ones use `npm:stripe@14`
- TypeScript type errors about missing or changed properties on Stripe objects in Edge Functions
- `apiVersion` inconsistent across Edge Functions
- Runtime errors only on payment flows (not subscription flows) suggesting different Stripe response shapes

**Phase to address:** Phase implementing the stripe-rent-checkout Edge Function — align on stripe@14, add a TODO comment about the upgrade path. The SDK consolidation is a separate hardening task.

---

### Pitfall 6: UpdatePasswordForm Calls updateUser Without a Valid PASSWORD_RECOVERY Session

**What goes wrong:**

The existing `UpdatePasswordForm` at `/auth/update-password` calls `supabase.auth.updateUser({ password })`. This requires an active session. When a user clicks the password reset link in their email, Supabase's PKCE flow redirects to `/auth/update-password?code=...` with an auth code in the URL. If the page does not call `supabase.auth.exchangeCodeForSession(code)` before `updateUser`, the call fails with `AuthSessionMissingError`.

Looking at the current implementation: `UpdatePasswordForm` calls `updateUser` directly without any code exchange step. The page at `/auth/update-password/page.tsx` renders the form without extracting the `code` param from the URL.

**Why it happens:**

In the implicit flow (older Supabase), the reset link embedded a token directly in the URL fragment, and Supabase JS would pick it up automatically. In the PKCE flow (default with `@supabase/ssr`), the URL contains a `code` parameter that must be explicitly exchanged for a session before any auth operation. The auth callback route at `/auth/callback/route.ts` handles this for OAuth but not for password reset — password reset goes directly to `/auth/update-password`, not through the callback route.

**How to avoid:**

The `/auth/update-password` page (or a dedicated route handler) must detect the `code` param and call `exchangeCodeForSession(code)` before the form renders. Two options:
1. Add a Server Component wrapper that calls `exchangeCodeForSession` on the server, then renders the form once a session is established.
2. In the client component, call `supabase.auth.exchangeCodeForSession(code)` on mount using `useSearchParams().get('code')` before enabling the form.

The current `update-password/page.tsx` renders `<UpdatePasswordForm />` unconditionally. The form will fail for users arriving from the email link until this exchange is added.

Note: The `TOKEN_HASH` + `type=recovery` pattern used in older Supabase guides is deprecated. Current approach uses `code` + PKCE.

**Warning signs:**

- Password reset emails send successfully but users get an error when trying to set a new password
- `AuthSessionMissingError` in browser console on the update-password page
- No `searchParams.get('code')` or `exchangeCodeForSession` call in the password reset flow
- The `/auth/callback/route.ts` only handles OAuth, not password recovery

**Phase to address:** Phase adding the password reset page (auth flow completion).

---

### Pitfall 7: Google OAuth Redirect URI Not Registered in Google Cloud Console

**What goes wrong:**

The Google OAuth button exists. The `signInWithOAuth` call is wired. The `/auth/callback/route.ts` handles code exchange. But when a user clicks "Sign in with Google" in production, Google refuses the redirect with `redirect_uri_mismatch` because the Vercel production URL (`https://app.tenantflow.app`) was not added to "Authorized redirect URIs" in Google Cloud Console.

The development URL (`http://localhost:3050`) works because it was added during initial dev setup. Production breaks because the production `redirect_uri` is `https://app.tenantflow.app/auth/callback`, not `http://localhost:3050/auth/callback`.

**Why it happens:**

Google Cloud Console requires explicit registration of every redirect URI. No wildcards. Supabase's OAuth flow generates a `redirect_to` parameter pointing to the production URL, which Google rejects if not pre-registered. The Supabase dashboard's URL configuration and the Google Cloud Console are two separate systems that both must be updated.

**How to avoid:**

Before deploying Google OAuth to production:
1. In Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URIs, add: `https://[production-domain]/auth/callback`
2. In Supabase Dashboard → Auth → URL Configuration → Allowed Redirect URLs, add: `https://[production-domain]/**`
3. The `NEXT_PUBLIC_SUPABASE_URL` environment variable must match what Supabase uses as the callback base

For Vercel preview deployments: Google does not support wildcard redirect URIs. Either skip OAuth on preview URLs or use a custom domain for previews.

**Warning signs:**

- Google OAuth works in development but fails in production
- Browser console shows `redirect_uri_mismatch` error from Google
- New deployment environments not in the Google Cloud Console allow-list
- Supabase "Site URL" is set to localhost in the dashboard

**Phase to address:** Phase polishing Google OAuth (auth flow completion).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode Stripe fee as 3% flat in application_fee_amount | Fast implementation | Wrong platform revenue if Stripe changes pricing, no net revenue tracking | Never — calculate dynamically |
| Skip email_suppressions check, let Resend handle suppression | One less DB query | Suppressed emails treated as errors, webhook retries, deliverability damage | Never on transactional emails |
| Use stripe@20 in new Edge Function while others use stripe@14 | Newer types and features | Inconsistent API versions across payment flow, hard to debug | Never — match existing functions |
| Send Resend email synchronously inside webhook handler | Simple code | Resend latency delays webhook response, Stripe may retry thinking webhook failed | Never — always fire-and-forget |
| Store `application_fee_amount` and display it as platform profit | Single field to track | Displays incorrect profit (Stripe cut not subtracted) | Acceptable temporarily if labeled "gross fee" not "net revenue" |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe destination charges | Calculate `application_fee_amount` as a flat % of rent with no Stripe fee adjustment | Calculate desired net, add Stripe's 2.9%+$0.30 to get required gross fee; or document the shortfall explicitly |
| Stripe destination charges | Create PaymentIntent without checking `charges_enabled` on the destination account | Query `stripe_connected_accounts.charges_enabled` before creating PaymentIntent, return 422 if not enabled |
| Stripe Connect webhooks | Register only platform webhooks, miss connected account events | For destination charges, the platform webhook receives `payment_intent.succeeded` — no separate connected account webhook needed for fee receipt; verify with Stripe docs for the specific events needed |
| Resend in Deno Edge Functions | Import `npm:resend` package | Use `fetch('https://api.resend.com/emails', ...)` directly — fewer cold-start concerns, no Deno compatibility issues with the npm package |
| Resend bounce handling | Treat Resend 4xx error as payment failure | Separate email send errors (non-fatal, log only) from payment processing errors (fatal, return 500) |
| Supabase Auth password reset | Call `updateUser` directly on page load | Exchange the `code` param for a session via `exchangeCodeForSession` first, then enable the form |
| Supabase Auth PKCE | Use `token_hash` from old guides | Modern PKCE flow uses `code` URL param + `exchangeCodeForSession` — the old `token_hash` approach is deprecated |
| Google OAuth in production | Only configure Google Cloud Console for localhost | Register every production URL explicitly: `https://domain.com/auth/callback` in Authorized Redirect URIs |
| Google OAuth with Vercel previews | Add wildcard for preview URLs to Google | Google does not accept wildcards — use a dedicated preview domain or disable OAuth on preview URLs |
| Stripe metadata on destination charges | Expect metadata on the Charge object matching the PaymentIntent | With destination charges, metadata on the PaymentIntent may not propagate to the connected account's Charge — set metadata on the PaymentIntent and read it from the PaymentIntent in webhooks |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Resend call inside synchronous webhook handler path | Stripe webhook takes 3-8 seconds, retries flood Edge Function | Fire-and-forget with `catch()` — never `await` transactional email from webhook | Immediately if Resend API is slow (timeouts) |
| Fetching connected account Stripe object to check `charges_enabled` in checkout | 200-400ms Stripe API call on every payment initiation | Cache `charges_enabled` from `stripe_connected_accounts` table (updated via `account.updated` webhook) — no live Stripe call needed | At 100+ concurrent payment initiations |
| Verifying `email_suppressions` with unbounded query | Slow suppression check if table grows large | `email_suppressions` PK is `email` — direct lookup is O(1), no performance concern | Never — PK lookup is always fast |
| Token exchange on every password reset page render | Calling `exchangeCodeForSession` on each React re-render | Run code exchange once in `useEffect` with empty deps or in a Server Component/route handler | On pages with many re-renders during form interaction |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `application_fee_amount` calculation to the tenant | Tenant could reverse-engineer the platform margin and negotiate around it | Keep fee calculation server-side in Edge Function; return only total amount to tenant checkout UI |
| Not validating lease ownership before creating destination charge | Tenant could initiate payment to a different owner's connected account | In `stripe-rent-checkout` Edge Function, verify the `lease_id` in the request belongs to a lease the authenticated tenant is party to |
| Resend receipt email exposes other tenant data | If email template is built from wrong query, might leak cross-tenant data | Build email data from the specific PaymentIntent metadata + verified lease/tenant IDs; never query "all payments" to build receipt |
| Password reset link reuse | Once a reset link is clicked and `exchangeCodeForSession` called, the code is invalidated (5-min window, single-use) — but client might cache and reuse it | After successful code exchange, remove the `code` from URL via `window.history.replaceState` to prevent accidental reuse |
| CORS wildcard on `stripe-rent-checkout` Edge Function | Browser can call from any origin | Set `Access-Control-Allow-Origin` to `process.env.FRONTEND_URL` (already done in other functions — follow same pattern) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tenant sees generic "payment failed" when owner is not Stripe-verified | Tenant cannot self-serve; calls owner instead | Return specific error "Owner payment account not ready" with link to contact property owner |
| No success page after payment — just toast dismisses | Tenant unsure if payment succeeded; double-pays | Show dedicated success screen with amount, date, and link to download receipt |
| Password reset page shows form before session exchange completes | User submits form, gets AuthSessionMissingError | Disable form / show spinner until `exchangeCodeForSession` resolves |
| Email confirmation page tries to resend to session user but session may not exist | `getSession()` returns null, resend fails silently | Pre-fill email from URL param `?email=...` set by Supabase's OTP email, not from session |
| After Google OAuth, user lands on /dashboard but user_type is undefined | Owner sees tenant dashboard, or vice versa | The `/auth/callback/route.ts` already handles this — verify `app_metadata.user_type` is set at signup and not overwritten by Google OAuth |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stripe rent checkout:** `charges_enabled` guard added — verify by testing with a not-yet-onboarded owner account
- [ ] **Fee split:** `application_fee_amount` is the gross fee including Stripe's cut — verify financial reports show net revenue correctly, not gross
- [ ] **Receipt email:** Resend `fetch` call is inside `stripe-webhooks/index.ts` `payment_intent.succeeded` case — verify by checking Edge Function logs after a test payment
- [ ] **Email suppression:** `email_suppressions` table queried before every Resend call — verify by inserting a test suppression and confirming no email sent
- [ ] **Password reset:** `exchangeCodeForSession(code)` called before `updateUser` — verify by clicking an actual reset email link in a fresh browser session
- [ ] **Google OAuth production:** Google Cloud Console has production domain's redirect URI — verify by attempting OAuth on the production URL, not just localhost
- [ ] **Stripe SDK version:** New `stripe-rent-checkout` uses `npm:stripe@14` matching existing functions — verify by grepping all Edge Functions for consistent import
- [ ] **Webhook events:** `stripe-rent-checkout` PaymentIntents are captured by the existing `payment_intent.succeeded` handler — verify that the existing webhook endpoint URL is registered for `payment_intent.succeeded` in Stripe Dashboard

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| application_fee_amount calculated wrong | MEDIUM | Deploy corrected fee calculation, update existing `rent_payments` records with a one-time SQL migration; financial reports show corrected values from that date |
| Resend emails never sent | LOW | Add the Resend call to `stripe-webhooks`, deploy; cannot retroactively send receipts for past payments, but future ones work |
| Password reset broken in production | HIGH | Hotfix deploy with `exchangeCodeForSession` call; users who attempted reset during outage must request a new reset link |
| Google OAuth production URI missing | MEDIUM | Add URI to Google Cloud Console (takes effect immediately); no code deploy needed |
| Stripe SDK version mismatch causes runtime errors | HIGH | Pin all Edge Functions to same version, deploy together; test each Edge Function endpoint after deploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| application_fee_amount net vs gross | stripe-rent-checkout implementation phase | Run test payment, verify `rent_payments.application_fee_amount` and financial dashboard show correct net |
| charges_enabled guard missing | stripe-rent-checkout implementation phase | Test with `charges_enabled=false` owner; expect 422 |
| Receipt email not wired | Receipt email implementation phase | Check Edge Function logs for "Receipt email sent" after test payment |
| email_suppressions not checked | Receipt email implementation phase | Insert test suppression, trigger payment, verify no Resend call made |
| Stripe SDK version mismatch | stripe-rent-checkout implementation phase | Grep `import.*stripe` in all Edge Functions — must all be `npm:stripe@14` |
| UpdatePasswordForm missing code exchange | Password reset page phase | Click real reset email link in fresh browser; verify no AuthSessionMissingError |
| Google OAuth redirect URI missing | Google OAuth polish phase | Test OAuth flow on deployed production URL before marking phase complete |

---

## Sources

- [Stripe Connect Destination Charges — Official Docs](https://docs.stripe.com/connect/destination-charges)
- [Stripe Connect Webhooks — Platform vs Connected Account Events](https://docs.stripe.com/connect/webhooks)
- [Resend Webhooks — Bounce Handling](https://resend.com/docs/webhooks/introduction)
- [Supabase Auth — Password-based Auth PKCE Flow](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Auth — PKCE Flow Details](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Auth — Redirect URLs Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Auth — Google OAuth Login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase GitHub Discussion — PKCE Password Reset in Next.js](https://github.com/orgs/supabase/discussions/28655)
- [Stripe SDK Versioning Policy](https://docs.stripe.com/sdks/versioning)
- Existing codebase: `supabase/functions/stripe-webhooks/index.ts`, `supabase/migrations/20260219100002_create_email_suppressions.sql`, `apps/frontend/src/app/auth/callback/route.ts`, `apps/frontend/src/components/auth/update-password-form.tsx`

---
*Pitfalls research for: TenantFlow payment infrastructure milestone (Stripe Connect destination charges, Resend receipt emails, Supabase Auth completion)*
*Researched: 2026-02-25*
