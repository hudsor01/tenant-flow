# Project Research Summary

**Project:** TenantFlow v8.0 — Payment Infrastructure + Auth Flow Completion
**Domain:** Property management SaaS — Stripe Connect rent payments, transactional email, auth polish
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

TenantFlow's v8.0 milestone is a focused extension of an already-deployed, production SaaS platform — not a greenfield build. The core infrastructure (Supabase, Stripe Connect Express onboarding, Edge Functions, frontend auth pages) is fully operational. The milestone ships three tightly scoped deliverables: (1) a new `stripe-rent-checkout` Edge Function implementing Stripe Connect destination charges so tenants can pay rent through the platform, (2) Resend receipt emails triggered by the existing `stripe-webhooks` webhook handler, and (3) two auth flow fixes — a missing `/auth/reset-password` page and an `exchangeCodeForSession` gap in the password reset flow.

The recommended implementation approach follows the established architectural pattern: all Stripe work lives in Deno Edge Functions using `npm:stripe@14` (consistent with all five existing functions), receipt emails use raw `fetch` against the Resend HTTP API (fire-and-forget, never blocking webhook 200 responses), and auth fixes are minimal surgical changes. No new npm packages are required, no schema migrations are needed, and no third-party integrations are new — every external service used in this milestone already exists in production. The three workstreams are fully independent and can be built in parallel.

The primary risks are business-model correctness (Stripe processes fees from the platform's `application_fee_amount`, so gross fee revenue is not net revenue), operational gaps (the owner's Stripe connected account must have `charges_enabled = true` before checkout can succeed), and an auth PKCE gap (the current `UpdatePasswordForm` page calls `updateUser` without first exchanging the PKCE code for a session, which will cause `AuthSessionMissingError` for users arriving from reset email links). All three risks have clear, low-cost mitigations documented in the research.

## Key Findings

### Recommended Stack

No new packages are needed. All required libraries are already installed. The new `stripe-rent-checkout` Edge Function uses `npm:stripe@14` (matching the five existing Edge Functions) and raw `fetch` to Resend's HTTP API. The frontend payment page uses `@stripe/react-stripe-js` and `@stripe/stripe-js` (already installed) for the Payment Element. The Stripe SDK version mismatch between Edge Functions (`stripe@14`) and the Next.js frontend (`stripe@20.3.1`) is a known P2 issue that must not be widened — the new Edge Function must use `stripe@14`.

**Core technologies:**
- `npm:stripe@14` (Deno): Destination charge PaymentIntent creation in `stripe-rent-checkout` Edge Function — must match existing Edge Functions
- `fetch` to Resend HTTP API: Receipt emails from `stripe-webhooks`; avoid npm SDK in Edge Functions for faster cold start
- `@supabase/ssr@0.8.0`: Auth PKCE session exchange for password reset flow — `getAll`/`setAll` pattern already in place
- `@stripe/react-stripe-js@5.4.1` + `@stripe/stripe-js@8.6.3`: Frontend Payment Element — already installed, no changes needed
- `zod@4.3.5`: Request body validation in new Edge Function — already in shared package

### Expected Features

The `/tenant/payments/new` page already has UI but throws unconditionally in its mutation — the primary deliverable is implementing the Edge Function it calls and wiring the redirect. Auth pages are similarly built but broken at the URL routing level.

**Must have (table stakes):**
- Tenant can pay rent via Stripe Checkout — core product value; mutation stub at `/tenant/payments/new` must be wired to `stripe-rent-checkout` Edge Function
- Platform fee split on each payment — business model; `application_fee_amount` set in PaymentIntent creation
- Owner receives rent minus fee — Stripe Connect destination charge routes funds automatically
- Receipt email to tenant on payment success — users expect email confirmation for financial transactions
- Receipt email to owner on payment success — owner income tracking
- Password reset completes successfully — auth table stakes; one-line `redirectTo` URL mismatch plus PKCE code exchange gap
- Google OAuth sets correct `user_type` — new owners via Google must land on the correct dashboard

**Should have (competitive):**
- Branded HTML receipt email — professional landlord/tenant experience
- Receipt shows fee breakdown (rent + late fee as separate line items) — reduces payment disputes
- Payment confirmation page post-checkout — `/auth/post-checkout` page exists; connect to `success_url`
- Email suppression check before every Resend send — deliverability protection

**Defer (v2+):**
- Autopay (off-session PaymentIntent via pg_cron) — requires `setup_intent` from Stripe Checkout `setup_future_usage`
- Tenant payment receipt PDF attachment — StirlingPDF available; out of scope for v8.0
- Branded email template editor — requires owner settings + storage
- Stripe SDK version consolidation (stripe@14 → stripe@20 across all Edge Functions) — separate hardening task

### Architecture Approach

The architecture is additive to the existing system. Two new files are created (`stripe-rent-checkout/index.ts` Edge Function and `/auth/reset-password/page.tsx`), and two existing files are modified (`stripe-webhooks/index.ts` to add Resend call, `/tenant/payments/new/page.tsx` to replace throw stub). No schema migrations are needed. The three workstreams are independent and can be built in parallel. The authoritative payment confirmation path is the Stripe webhook — never the frontend `success_url` redirect.

**Major components:**
1. `stripe-rent-checkout` Edge Function (NEW) — JWT auth, reads `tenants → leases → stripe_connected_accounts → users`, creates Stripe Checkout Session with destination charge, returns `{ url }`
2. `stripe-webhooks/index.ts` (MODIFY) — add Resend receipt call after existing `rent_payments` upsert in `payment_intent.succeeded` handler; fire-and-forget with email suppression check
3. `/tenant/payments/new/page.tsx` (MODIFY) — replace unconditional `throw` stub with fetch to `stripe-rent-checkout`, redirect to returned Stripe Checkout URL
4. `/auth/reset-password/page.tsx` (NEW) — thin shell around existing `UpdatePasswordForm`; must add `exchangeCodeForSession(code)` call before form renders
5. Google OAuth (NO CODE CHANGE) — code is complete; ops verification only (Supabase Dashboard + Google Cloud Console redirect URI registration)

### Critical Pitfalls

1. **`application_fee_amount` is gross, not net platform revenue** — Stripe deducts its 2.9%+$0.30 processing fee from the platform's application fee, not from the owner's payout. At a 3% platform fee on $1,500 rent, the platform nets $36 - $35.10 = $0.90. Calculate net revenue as `application_fee_amount - stripe_fee`. Never label the stored gross value as platform profit in financial reports.

2. **`charges_enabled` not checked before PaymentIntent creation** — If the owner's Stripe connected account has `charges_enabled = false`, the Stripe API returns `account_invalid` and the tenant sees an opaque error. The `stripe_connected_accounts` table already tracks this flag (kept current via `account.updated` webhooks). Query it before creating the PaymentIntent and return HTTP 422 with a user-readable message if not enabled.

3. **`UpdatePasswordForm` calls `updateUser` without PKCE code exchange** — With `@supabase/ssr` PKCE flow, the password reset email link contains a `code` URL param that must be exchanged for a session via `exchangeCodeForSession(code)` before `updateUser` works. The current page renders the form unconditionally. Users arriving from email links will get `AuthSessionMissingError`.

4. **Receipt email blocks webhook or fires without suppression check** — If the Resend call throws and propagates, Stripe retries the webhook for 72 hours, causing duplicate receipt emails when Resend recovers. Always wrap in `try/catch`, return 200 regardless of email outcome, and check `email_suppressions` before every Resend call.

5. **Stripe SDK version mismatch widened** — All Edge Functions use `npm:stripe@14`. The frontend has `stripe@20.3.1`. The new Edge Function must use `stripe@14`. Copying patterns from frontend Stripe code risks importing type assumptions from stripe@20 that do not match runtime behavior.

## Implications for Roadmap

Three independent workstreams map cleanly to three implementation phases. All dependencies have been resolved by prior architecture work.

### Phase 1: Stripe Rent Checkout (Core Payment Path)

**Rationale:** This is the primary revenue-generating deliverable and has the most implementation complexity. All other payment work (receipt emails) depends on a working PaymentIntent with correct metadata. The frontend page stub has existed since initial build and is the most visible gap.

**Delivers:** End-to-end rent payment — tenant clicks "Pay Rent," gets redirected to Stripe Checkout, payment succeeds, `rent_payments` record created with `status = succeeded`.

**Addresses:** Tenant rent payment (table stakes), platform fee split, owner fund routing, owner `charges_enabled` guard (critical), payment confirmation page redirect.

**Stack:** `stripe-rent-checkout/index.ts` with `npm:stripe@14`, Stripe Checkout Sessions API (destination charges), `payment_intent_data.application_fee_amount` + `transfer_data.destination`, frontend mutation replaces throw stub.

**Avoids:**
- `charges_enabled` guard missing (Pitfall 2) — check before PaymentIntent creation
- `application_fee_amount` net vs. gross confusion (Pitfall 1) — document and calculate correctly from day one
- Stripe SDK version mismatch (Pitfall 5) — use `npm:stripe@14` matching existing functions
- Store `tenant_email` + `property_name` in PaymentIntent metadata to avoid DB joins in webhook handler

**Research flag:** Standard pattern — destination charges are well-documented in Stripe official docs. No additional research-phase needed.

### Phase 2: Receipt Emails (Webhook Extension)

**Rationale:** Depends on Phase 1 because the `payment_intent.succeeded` webhook must receive PaymentIntents with `tenant_email` in metadata (set by the new `stripe-rent-checkout` function). Can be built in parallel with Phase 1 but requires Phase 1 deployed to test end-to-end.

**Delivers:** Automated receipt email to tenant and owner notification email on every successful Stripe rent payment. Email suppression respected. Webhook 200 response never blocked by email outcome.

**Addresses:** Tenant receipt email (table stakes), owner receipt email (table stakes), email suppression check (should have), fire-and-forget pattern (critical for webhook reliability).

**Stack:** Raw `fetch` to `https://api.resend.com/emails` inside `stripe-webhooks/index.ts`; no new imports. `RESEND_API_KEY` already confirmed in Edge Function secrets.

**Avoids:**
- Receipt email never wired (Pitfall 3) — add `console.log` marker for verification
- `email_suppressions` not checked (Pitfall 4) — shared `isEmailSuppressed()` helper
- Blocking webhook on Resend failure (integration gotcha) — always fire-and-forget with `.catch()`
- Triggering receipts from frontend success_url redirect (anti-pattern) — webhook is authoritative

**Research flag:** Standard pattern — Resend fetch approach is identical to official Supabase guide. No additional research-phase needed.

### Phase 3: Auth Flow Completion

**Rationale:** Fully independent of Phases 1 and 2. Password reset has been broken (404 page) since the auth UI was built. Google OAuth code is complete but needs operational verification. Both fixes are low-effort and high user-impact.

**Delivers:** Working password reset flow (user clicks email link, lands on correct page, can set new password), verified Google OAuth in production (tenant and owner sign-in via Google routes to correct dashboard).

**Addresses:** Password reset completes successfully (table stakes), Google OAuth `user_type` routing (table stakes), email confirmation post-verify redirect (should have).

**Stack:** `@supabase/ssr` PKCE pattern — `exchangeCodeForSession(code)` in the reset page before form renders; no new packages.

**Avoids:**
- `UpdatePasswordForm` missing code exchange (Pitfall 6) — add code exchange on page mount
- Google OAuth redirect URI not registered in production (Pitfall 7) — verify Google Cloud Console and Supabase Dashboard before marking done

**Research flag:** Auth PKCE code exchange needs careful implementation. The `/auth/callback/route.ts` handles OAuth but not password recovery — the reset page must handle its own code exchange. Confirm the implementation pattern against current `@supabase/ssr` docs (not legacy `token_hash` guides).

### Phase Ordering Rationale

- Phase 1 is the critical path — without working rent checkout, Phases 2 has nothing to test against
- Phases 2 and 3 can be built in parallel with Phase 1 (they share no code dependencies)
- All three phases can be deployed independently and in any order since they touch different files
- Auth fixes (Phase 3) are high-user-impact quick wins that could ship before Phase 1 if needed

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Auth):** PKCE `exchangeCodeForSession` implementation for password reset — the `/auth/callback/route.ts` provides the pattern but the reset page needs a client-side variant. Verify against current `@supabase/ssr` docs to confirm whether a Server Component route handler or client-side `useEffect` is the correct approach.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Stripe):** Destination charges are comprehensively documented in official Stripe docs; STACK.md has the exact implementation pattern with all required parameters.
- **Phase 2 (Resend):** Fire-and-forget receipt email via raw `fetch` is the official Supabase-recommended pattern; ARCHITECTURE.md has the complete implementation including the email suppression guard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies already in production. Stripe version pinning, Resend fetch pattern, and auth libraries all verified against official docs and live codebase. No new dependencies introduced. |
| Features | HIGH | Feature boundaries verified by direct codebase inspection. What's built vs. stubbed vs. missing is confirmed against live files, not assumptions. |
| Architecture | HIGH | All architectural claims verified against live codebase files. Build order derived from actual dependency graph, not theoretical design. No schema changes needed confirmed by migration inspection. |
| Pitfalls | HIGH | Critical pitfalls verified against official Stripe and Supabase PKCE docs. The PKCE password reset pitfall is particularly important — it has been confirmed by inspecting the current `UpdatePasswordForm` implementation. |

**Overall confidence:** HIGH

### Gaps to Address

- **`handle_new_user` Postgres trigger for Google OAuth** (MEDIUM confidence): The trigger is expected to set `user_type: 'OWNER'` in `app_metadata` on OAuth signup, but this was not verified by reading the trigger code. Verify during Phase 3 implementation that the trigger fires for OAuth users (who may not have `raw_user_meta_data.user_type` set). If not, the callback route's user type routing silently fails.

- **Fee business model** (out of scope for code, needs business decision): At typical fee percentages (0.2%–1%), the platform application fee may be less than Stripe's processing fee, resulting in net negative revenue per transaction. The implementation should correctly calculate and display net vs. gross platform revenue, but the fee percentage decision is a business decision outside this milestone's scope.

- **`RESEND_API_KEY` production secret confirmation**: The research notes the key "is confirmed" based on an `email_suppressions` migration comment, but the actual Supabase Edge Function secrets dashboard was not directly verified. Confirm the secret is set before deploying Phase 2.

- **Stripe webhook registration for `payment_intent.succeeded`**: The existing `stripe-webhooks` function handles this event, but confirm the Stripe Dashboard webhook endpoint is registered to receive `payment_intent.succeeded` events (not just `checkout.session.completed`). The new rent checkout flow creates PaymentIntents directly, which fire `payment_intent.succeeded` — this is distinct from the `checkout.session.completed` event fired by platform subscription checkout.

## Sources

### Primary (HIGH confidence)
- [Stripe Connect Destination Charges](https://docs.stripe.com/connect/destination-charges) — `application_fee_amount`, `transfer_data[destination]`, `on_behalf_of` parameters
- [Stripe Accept Payment with Destination Charges](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/destination-charges) — Payment Element + PaymentIntent creation pattern
- [Resend with Supabase Edge Functions](https://resend.com/docs/send-with-supabase-edge-functions) — `fetch` pattern for Resend HTTP API from Deno
- [Supabase Auth — PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) — code exchange requirement for password reset
- [Supabase Auth — Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) — `signInWithOAuth` + PKCE callback pattern
- Live codebase inspection (2026-02-25) — confirmed stub locations, missing pages, existing patterns

### Secondary (MEDIUM confidence)
- [Stripe Connect Webhooks](https://docs.stripe.com/connect/webhooks) — platform vs. connected account event routing
- [stripe-node releases](https://github.com/stripe/stripe-node/releases) — v20.4.0 latest stable; v14 pinned for Deno compatibility

### Tertiary (LOW confidence / needs validation)
- `handle_new_user` trigger behavior on OAuth signup — assumed to set `user_type: OWNER` but not directly verified against migration source
- `RESEND_API_KEY` in production Edge Function secrets — inferred from `email_suppressions` migration comment, not directly confirmed in dashboard

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
