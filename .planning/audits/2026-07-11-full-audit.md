# TenantFlow Full-Surface Audit — 2026-07-11

Adversarially verified audit of the codebase, public marketing pages, and owner dashboard.
**296 confirmed findings** (37 high · 148 medium · 111 low) + 4 plausible. 4 claims refuted and dropped.
Ground truth: typecheck / lint / unit suite all PASS; prod crawl clean (242 sitemap URLs 200, 54 internal link targets 200, security headers present).
Method: 435 subagents in two workflow runs — 14 dimension finders + 5 gap sweeps (auth, billing lifecycle, e-sign, Zustand, admin); every finding independently adversarially verified against live code, prod schema, and CLAUDE.md.

## Top themes

1. **Billing is the most damaged surface.** Checkout-session verification always 400s (snake_case/camelCase param mismatch), every checkout grants an unconditional fresh 14-day trial (infinite serial trials), no existing-subscription guard (double-billing possible), the promised 7-day past_due grace period does not exist (proxy locks delinquent owners out of every surface that could fix payment), the dunning email and in-app banner both CTA to /owner/billing which 404s, and the webhook handler for cancellations queries columns that no longer exist.
2. **Lease editing is fully broken.** Every lease edit save sends a phantom `version` field; the `leases` table has no such column, so PostgREST rejects every edit with PGRST204. Separately, decimal rent/deposit entries fail against integer DB columns across at least 8 forms (lease form, wizard terms + pet fields, unit forms, add/edit unit panels, maintenance cost, both CSV importers).
3. **Property edits silently destroy data.** The property detail query selects a column subset but casts to full `Property`; the edit form then nulls `acquisition_cost` and `acquisition_date` on every save.
4. **The entire @modal intercepted-route subsystem is dead.** The properties/leases/units layouts never render the `modal` slot (maintenance has no layout at all), and every `(.)edit/[id]` interceptor targets `/x/edit/[id]` while the real routes are `/x/[id]/edit` — none of these modals can ever appear.
5. **Auth has three broken flows.** Email-change confirmation links are rejected by the callback allowlist (email change is impossible); successful magiclink/invite verifications fall through to a "link expired" error; the confirm-email resend button requires a session its audience can never have.
6. **Analytics pages render fabricated zeros.** The financial analytics page asserts an RPC shape that the function has never returned (all metrics zero, plus a surviving /100 division), maintenance insights map keys the RPC never emits, the overview KPIs read fields absent from a locally cast stub, and the quarterly income statement builds `2026-06-31` and crashes for half the calendar year.
7. **Mutations poison the TanStack cache.** Lease renew/update and inspection update write bare rows over enriched detail-cache entries (embeds/rooms vanish after save); tenant updates never invalidate the key the detail page actually reads.
8. **The pricing pages sell features that do not exist.** Team seats (1/3/unlimited), API access on Max, custom lease clauses, ACH payments, and "full access to all features" trials (e-sign is tier-gated away from Starter trials) — several of these also propagate into FAQPage JSON-LD rich results. The live Terms of Service still contains "[Your State]" template placeholders.
9. **A11y debt is systemic.** 41 confirmed issues: unreadable badge tokens (near-white on 10% tints), vivid tokens as text (AA failures), icon-only buttons without names, hover-only controls invisible to keyboard users, unlabeled inputs, focus-unmanaged custom dialogs.
10. **Six undefined utility classes silently no-op.** text-responsive-display-xl, text-responsive-display-2xl, text-section-title, section-content, page-content, inline-flex-center, gradient-background — hero headlines and section spacing silently collapse to base styles on about/faq/help/blog/pricing/resources.


## Billing & subscription lifecycle (16)

### [HIGH] `src/app/(owner)/billing/plans/page.tsx:59`
**hasActiveSubscription excludes past_due/unpaid, so a delinquent subscriber on /billing/plans is routed into a brand-new checkout instead of the portal and loses the Manage Subscription button.**

`hasActiveSubscription` only accepts 'active'/'trialing' (lines 59-61), which makes `currentPlan`/`hasSubscription` null/false for a past_due owner even though they have a live (delinquent) Stripe subscription. Consequences: the "Manage Subscription" portal button (line 177) — the only reachable payment-method-fix surface for past_due users, since /settings is proxy-gated — is hidden, and clicking any plan card takes the `createCheckoutSession` branch (line 95), creating a second subscription alongside the still-existing past_due one. Correct is treating past_due/unpaid as "has subscription" and routing them to `createCustomerPortalSession` to update the payment method.

> Verifier: `hasActiveSubscription` (page.tsx:59-61) only accepts 'active'/'trialing', so for a past_due/unpaid owner `hasSubscription` is false, hiding the Manage Subscription portal button (line 177) and routing plan clicks into the `createCheckoutSession` branch (line 95); the stripe-checkout edge function (supabase/functions/stripe-checkout/index.ts:118-141) creates a new subscription-mode session with no existing-subscription check — and even grants a fresh 14-day trial via `trial_period_days` + `payment_method_collection: "if_required"` — yielding a duplicate subscription alongside the delinquent on

### [HIGH] `src/hooks/api/query-keys/subscription-verification-keys.ts:28`
**Both session-verification queries send `session_id` but the stripe-checkout-session Edge Function reads `body.sessionId`, so every call returns 400.**

`verifySession` (line 28) and `sessionStatus` (line 63) invoke `stripe-checkout-session` with `{ body: { session_id: sessionId } }`, but `supabase/functions/stripe-checkout-session/index.ts:48` reads `body.sessionId` (camelCase) — the only other caller, `src/app/auth/post-checkout/page.tsx:45`, correctly sends `sessionId`. Result: the function always returns 400 "sessionId is required", so `/pricing/success` renders its success card with the verification toast never firing correctly and `/pricing/complete` shows "Error retrieving payment status" for every visitor regardless of payment outcome.

> Verifier: Lines 28 and 63 of subscription-verification-keys.ts both send `{ body: { session_id: sessionId } }` while `stripe-checkout-session/index.ts:48` reads `body.sessionId` and returns 400 "sessionId is required" when falsy — `supabase.functions.invoke` surfaces the non-2xx as `error`, so both queryFns always throw; the only correct caller is `post-checkout/page.tsx:45` (`{ sessionId }`). Confirmed impact matches the claim: `/pricing/complete` (complete-client.tsx:48-56) shows "Error retrieving payment status" for every visitor and `/pricing/success` fires the "Failed to verify payment" error toast

### [HIGH] `src/proxy.ts:10`
**past_due is excluded from the subscription gate, so the promised 7-day grace period does not exist and a past_due owner has no reachable way to fix their payment method.**

`ACTIVE_SUBSCRIPTION_STATUSES` is only `{'active','trialing'}` and line 349 bounces every other status to /pricing, so the moment `customer.subscription.updated` writes `past_due` the owner is locked out of /dashboard and /settings on the very next request. This directly contradicts the invoice-payment-failed email ("You have a 7-day grace period before premium features are restricted") and the past_due banner copy ("update your payment method within 7 days"). Worse, the only owner surfaces a past_due user can still reach are /billing/plans and /billing/checkout (allowlisted at line 244-248), and /billing/plans hides its "Manage Subscription" portal button for past_due users (see separate finding), so there is literally no in-app path to update the failing card — the email link 404s and /settings is gated. Correct is either adding `past_due` to the gate for a real grace window or removin

> Verifier: proxy.ts:10 gates on only `{'active','trialing'}` and line 349 bounces every other status to /pricing (test middleware-routing.test.ts:324 confirms past_due→/pricing), while invoice-payment-failed.ts:53 promises "a 7-day grace period" and subscription-status-banner.tsx:90-91 promises "within 7 days" — no grace window exists. The email link (`/owner/billing`, invoice-payment-failed.ts:54) and banner link (line 94) both 404 since `(owner)` is a route group with no redirect configured, and the allowlisted /billing/plans page hides its "Manage Subscription" portal button for past_due (page.tsx:59-

### [HIGH] `supabase/functions/stripe-checkout/index.ts:134`
**Every checkout unconditionally grants a fresh 14-day no-card trial, enabling infinite serial free trials.**

`trial_period_days: TRIAL_PERIOD_DAYS` with `payment_method_collection: "if_required"` and `trial_settings.end_behavior.missing_payment_method: "cancel"` is applied to every session with no check of the user's prior trial (`trial_ends_at`), prior subscriptions, or current status. Failure loop: signup gets the DB 14-day trial; after `expire_trials()` flips them to 'expired' they hit /pricing, click Subscribe, get a new Stripe subscription with 14 more free days and no card; at trial end `missing_payment_method: cancel` deletes it; they repeat forever — unlimited free usage. It also means an existing DB-trial user who "converts" mid-trial pays nothing for another 14 days, while paid tiers in `src/config/pricing.ts` declare `trial: false`. Correct is gating `trial_period_days` on the user never having consumed a trial (e.g. `trial_ends_at IS NULL` and no prior subscription).

> Verifier: `supabase/functions/stripe-checkout/index.ts:132-140` unconditionally sets `trial_period_days: 14` + `payment_method_collection: "if_required"` + `missing_payment_method: "cancel"` on every session, and the only user fields fetched are `stripe_customer_id, email, full_name` (lines 88-92) — `trial_ends_at`/`subscription_status` are never consulted, and Stripe does not natively block repeat trials for the same customer. The loop closes end-to-end: `expire_trials()` (`20260419230000_trial_model.sql`) flips expired trials to 'expired' → proxy sends them to /pricing → checkout mints a new no-card t

### [HIGH] `supabase/functions/stripe-checkout/index.ts:118`
**No existing-subscription guard before creating a checkout session, so an already-subscribed owner can create a second concurrent subscription on the same customer.**

The function looks up/creates the Stripe customer but never checks `users.subscription_status` or lists existing subscriptions before `stripe.checkout.sessions.create({ mode: "subscription", ... })`. The public /pricing cards (`pricing-card-standard.tsx` / `pricing-card-featured.tsx`) call this for any signed-in session without checking subscription state, so an active subscriber who visits /pricing to "change plans" and clicks Subscribe completes a second subscription — double billing — and the webhook then overwrites `users.subscription_*` with whichever subscription's event arrived last while the other keeps invoicing invisibly. Correct is refusing (or redirecting to the billing portal) when the customer already has a non-canceled subscription.

> Verifier: `stripe-checkout/index.ts` reuses the stored `stripe_customer_id` (line 94) and calls `stripe.checkout.sessions.create({ mode: "subscription" })` at line 118 with no check of `users.subscription_status` or existing Stripe subscriptions; both public pricing cards (`pricing-card-standard.tsx` handleSubscribe lines 119-143, `pricing-card-featured.tsx` same pattern) invoke it for any locally-cached session with no subscription-state guard, and /pricing is a public route the proxy never redirects subscribers away from — so an active subscriber gets a second subscription on the same customer (trial 

### [HIGH] `supabase/functions/stripe-webhooks/handlers/invoice-payment-failed.ts:54`
**Payment-failure email's "Update Payment Method" CTA links to `/owner/billing`, a route that 404s**

The email built on `invoice.payment_failed` links to `${frontendUrl}/owner/billing`, but no such route exists: `(owner)` is a Next.js route group whose parentheses are stripped from the URL, there is no literal `src/app/owner/` directory, and no rewrite/redirect maps `/owner/*` (verified: `find src/app -path '*owner*billing*'` returns only files under the `(owner)` group serving `/settings/billing

> Verifier: Line 54 links to `${frontendUrl}/owner/billing`, but `(owner)` is a route group stripped from URLs — the only billing pages resolve to `/settings/billing`, `/billing/plans`, and `/billing/checkout/*`, there is no `src/app/owner/` directory, and neither next.config.ts redirects, vercel.json, nor proxy.ts maps `/owner/*`, so the CTA hits the root not-found page. Sibling edge functions use the correct paths (`stripe-checkout` uses `/settings/billing`, `stripe-billing-portal` uses `/dashboard`), proving this is the one stale link in a churn-critical dunning email.

### [MEDIUM] `src/app/(owner)/billing/plans/page.tsx:47`
**The Free Trial card on /billing/plans starts a checkout with the trial price ID, which stripe-checkout categorically rejects.**

`PLANS` is built from `getAllPricingPlans()`, which includes FREETRIAL with `stripePriceIds.monthly = "price_1RgguDP3WCR53Sdo1lJmjlD5"`, and `PlanCard` shows it as "Get Started" for users with no current plan. Since `plan.priceId` is non-null, `handleConfirmPlanChange` (line 87) skips the guard and calls `createCheckoutSession` with the trial price, but `ALLOWED_CHECKOUT_PRICE_IDS` in `supabase/functions/_shared/plan-tier.ts:46` deliberately excludes the trial price ("trials are DB-managed... never flow through Stripe Checkout"), so the user gets a raw "price_id not allowed" error toast. The trial plan should be filtered out of PLANS or rendered without a purchasable CTA.

> Verifier: The chain is fully verified: `getAllPricingPlans()` returns `Object.values(PRICING_PLANS)` unfiltered including FREETRIAL with `stripePriceIds.monthly = "price_1RgguDP3WCR53Sdo1lJmjlD5"` (src/config/pricing.ts:63-74, 211-213), so PLANS (page.tsx:47) renders a trial card whose non-null priceId skips the line-87 guard, and /billing/plans is exempt from the subscription gate (src/proxy.ts:245-247) so no-subscription users get an enabled "Get Started" CTA (plan-card.tsx:46,132). `ALLOWED_CHECKOUT_PRICE_IDS` contains only starter/growth/max — TRIAL_PRICE_IDS is deliberately excluded (plan-tier.ts:4

### [MEDIUM] `src/components/settings/sections/subscription-cancel-section.tsx:138`
**The cancel-scheduled state requires status 'active', so a trialing Stripe subscriber who cancels sees the Danger-Zone Cancel button again instead of the "ends on X / Reactivate" UI.**

`stripe-cancel-subscription` sets `cancel_at_period_end` on a subscription whose status remains 'trialing', and the mutation writes `{ subscriptionStatus: 'trialing', cancelAtPeriodEnd: true }` into the cache — but State 2's gate is `subscriptionStatus === "active" && cancelAtPeriodEnd` (line 138), so the trialing+cancel-scheduled combination falls through to State 1, which renders "Cancel Subscription" as if nothing happened. The user's success toast says the plan is set to cancel, then the UI immediately contradicts it and offers no Reactivate button. The gate should be `(status === 'active' || status === 'trialing') && cancelAtPeriodEnd`.

> Verifier: Every checkout starts subscriptions as `trialing` (stripe-checkout/index.ts:16,134 `trial_period_days: 14`), the trialing status falls past the component's null/past_due/unpaid gates into State 1's Cancel button, and on cancel the edge fn returns Stripe's unchanged `status: 'trialing'` with `cancel_at_period_end: true`, which `writeSubscriptionStatusCache` (use-billing-mutations.ts:100-110) writes verbatim; the subsequent refetch via `get_subscription_status` (subscription-keys.ts:75,116) returns the same trialing+cancelAtPeriodEnd combo, so line 138's `subscriptionStatus === "active" && cance

### [MEDIUM] `supabase/functions/stripe-webhooks/handlers/customer-subscription-deleted.ts:23`
**customer.subscription.deleted handler queries and updates `leases` columns that no longer exist, silently erroring on every cancellation event**

Path 1 (lines 19-33) filters `leases` on `stripe_subscription_id` and then updates `stripe_subscription_status`, but the landlord-only refactor removed all Stripe columns from `leases` (verified against the live DB: `SELECT ... FROM information_schema.columns WHERE table_name='leases' AND column_name LIKE 'stripe%'` returns zero rows, and the sibling `customer-subscription-updated.ts` comment stat

> Verifier: Migration `supabase/migrations/20260418170000_drop_dead_lease_subscription_cols.sql` drops `leases.stripe_subscription_id` and `leases.stripe_subscription_status` (never re-added; generated `src/types/supabase.ts` leases Row has no stripe columns), yet lines 20-30 still `.eq("stripe_subscription_id", sub.id)` and `.update({ stripe_subscription_status: "canceled" })`, and the sibling `customer-subscription-updated.ts` explicitly states "the leases table no longer has Stripe columns". The Path 1 query destructures only `{ data: leases }`, discarding the PostgREST 42703 error, so every cancellati

### [MEDIUM] `supabase/functions/stripe-webhooks/handlers/customer-subscription-updated.ts:82`
**No event-ordering guard — a late or retried customer.subscription.updated processed after customer.subscription.deleted resurrects 'active' status and permanently re-grants dashboard access.**

The handler unconditionally writes `sub.status` from the event payload with no comparison of the Stripe event's `created` timestamp against `subscription_updated_at` (and Stripe explicitly does not guarantee delivery order). Concrete path via this repo's own retry machinery: a `customer.subscription.updated` (status 'active') fails transiently and is marked 'failed'; `customer.subscription.deleted` then succeeds and writes 'canceled'; Stripe retries the failed updated event, index.ts:118 re-marks it for processing, and this handler overwrites 'canceled' with the stale 'active' — after which no further Stripe event ever arrives to correct it, so the canceled user keeps dashboard access indefinitely. Correct is skipping writes when the event is older than the persisted `subscription_updated_at` (or than the last event's `created`).

> Verifier: `customer-subscription-updated.ts:69-85` writes `subscription_status: sub.status` unconditionally and never reads `event.created` (its `subscription_updated_at` is wall-clock `new Date()`, so no ordering guard exists anywhere in the function), while `index.ts:110-122` explicitly re-marks a previously 'failed' event as 'processing' on Stripe's retry (retries last 72h per index.ts:4), so a failed updated(active) retried after deleted wrote 'canceled' (`customer-subscription-deleted.ts:50-57`) resurrects 'active'. No later Stripe event ever fires for a canceled subscription and the proxy gate (pr

### [MEDIUM] `supabase/functions/stripe-webhooks/index.ts:118`
**Webhook events stuck in status 'processing' are permanently acked as duplicates and never processed.**

On a duplicate delivery, only `existing?.status === "failed"` is re-marked for processing; any other status — including 'processing' — returns 200 `{ duplicate: true }` (lines 123-131). If the first attempt dies without reaching the catch block (Deno isolate kill, wall-clock timeout, crash between the insert and the handler), the row stays 'processing' forever, every Stripe retry over the 72-hour window gets a 200, and the event (e.g. a subscription.deleted that should revoke access, or an updated that should restore it) is silently lost with no failure signal. Correct is treating stale 'processing' rows (older than some threshold) like 'failed' and reprocessing them.

> Verifier: Lines 100-131 of supabase/functions/stripe-webhooks/index.ts insert the row as 'processing' before the handler runs, and on a 23505 duplicate only `existing?.status === "failed"` is re-marked — a row orphaned in 'processing' (isolate kill/wall-clock timeout between insert and the success/catch updates at lines 164-179, which are the only status transitions) makes the first Stripe retry get 200 `{ duplicate: true }`, ending all retries. No recovery path exists anywhere: `cleanup_old_webhook_events()` in 20260306170000_cleanup_cron_scheduling.sql only archives 'succeeded' (90d) and 'failed' (180

### [LOW] `src/components/settings/sections/subscription-cancel-section.tsx:90`
**DB-managed trial users (every new signup) see an active "Cancel Plan" button that always fails with a 404 from stripe-cancel-subscription.**

New signups get `subscription_status='trialing'` from the `set_trial_on_signup` trigger with no Stripe subscription (and usually no `stripe_customer_id`). The gates at lines 90-92 only opt out for null/past_due/unpaid, so 'trialing' falls to State 1 and renders the Danger-Zone cancel flow; confirming it calls `stripe-cancel-subscription`, which returns 404 "No subscription to modify" (no customer) or "No subscription found" (customer created by an abandoned checkout), surfacing an error toast for a plan the user cannot and need not cancel. The section should render a trial-specific state (or nothing) when there is no Stripe subscription to act on.

> Verifier: The `set_trial_on_signup` trigger (supabase/migrations/20260419230000_trial_model.sql:39-63) puts every new signup at `subscription_status='trialing'` with no Stripe customer, and `subscriptionStatusQuery` (src/hooks/api/query-keys/subscription-keys.ts:57-67) returns that local status when `stripe_customer_id` is null; the gates at subscription-cancel-section.tsx:90-92 only opt out for null/past_due/unpaid, so 'trialing' fails States 3 and 2 and falls through to the State-1 Danger-Zone "Cancel Plan" button (rendered unconditionally in billing-settings.tsx:443). Confirming calls `stripe-cancel-

### [LOW] `src/hooks/api/query-keys/subscription-verification-keys.ts:51`
**sessionStatus/verifySession expect response fields the stripe-checkout-session function never returns, so /pricing/complete can never show success even if the param bug is fixed.**

`stripe-checkout-session` returns exactly `{ customer_email }` (AUTH-05, index.ts:73), but `sessionStatus` casts the response to `StripeSessionStatusResponse` expecting `status`, `payment_intent_id`, `payment_status`, `payment_intent_status`, and `verifySession` expects `{ subscription }`. In `complete-client.tsx:58` the success branch requires `sessionData?.status === "complete"`, which is never present, so a customer landing on /pricing/complete after a successful payment always sees "Something went wrong, please try again." (plus a customer-facing link to the merchant-only dashboard.stripe.com). Either the Edge Function must return the session status shape or these two pages/queries are dead and should be removed.

> Verifier: Verified: `stripe-checkout-session/index.ts:73` returns only `{ customer_email }` (single 200 path), yet `subscription-verification-keys.ts:67` casts to `StripeSessionStatusResponse` and `verifySession:34` reads `data.subscription` — neither field ever exists, so `complete-client.tsx:58`'s `sessionData?.status === "complete"` is unreachable and the else-branch renders "Something went wrong" (today it errors even earlier: the client sends `{ session_id }` but the function reads `body.sessionId` → 400). Downgraded to low because the actual checkout `success_url` is `${frontendUrl}/dashboard?chec

### [LOW] `src/types/api-contracts.ts:331`
**SubscriptionStatusResponse.subscriptionStatus union omits 'expired', a status the expire_trials cron actually writes, while including 'cancelled' which nothing writes.**

`expire_trials()` (migration 20260419230000, line 78) sets `subscription_status='expired'`, and subscription-keys.ts funnels the raw column through `as SubscriptionStatusResponse["subscriptionStatus"]` casts (lines 61, 88, 112), so 'expired' flows into components at runtime while being unrepresentable in the type — every status branch (banner, cancel section, plans page) silently relies on fallthrough behavior for it, and TypeScript can never flag a missing 'expired' case. Meanwhile the union carries 'cancelled' (double-l), which no webhook or RPC ever produces, keeping dead comparison branches alive in subscription-status-banner.tsx and subscription-cancel-section.tsx. The union should match the real value set: Stripe statuses + 'expired' + null.

> Verifier: `expire_trials()` in supabase/migrations/20260419230000_trial_model.sql line 78 writes `subscription_status='expired'`, yet the `SubscriptionStatusResponse.subscriptionStatus` union (src/types/api-contracts.ts lines 330-340) omits 'expired' while including 'cancelled'; subscription-keys.ts lines 61/88/112 cast the raw column via `as SubscriptionStatusResponse["subscriptionStatus"]`, so 'expired' reaches components untyped and is handled only by fallthrough (banner's final red-lock branch). No writer produces 'cancelled' — webhooks write Stripe's `sub.status` ('canceled', see customer-subscript

### [LOW] `supabase/functions/stripe-checkout/index.ts:124`
**Checkout cancel_url targets /settings/billing, which immediately redirects and drops the ?checkout=cancelled context, and is subscription-gated for the users most likely to abandon checkout.**

`cancel_url` is `${frontendUrl}/settings/billing?checkout=cancelled`, but `src/app/(owner)/settings/billing/page.tsx` unconditionally `redirect("/settings?tab=billing")`, discarding the query (nothing in the codebase consumes `checkout=cancelled` anyway). For an 'expired' or 'canceled' user who abandons checkout — the common abandonment cohort — /settings is not proxy-allowlisted, so they are bounced to /pricing instead. The purpose-built, proxy-allowlisted `/billing/checkout/cancel` page exists and is unused; cancel_url should point there.

> Verifier: Line 124 of supabase/functions/stripe-checkout/index.ts sets `cancel_url` to `/settings/billing?checkout=cancelled`; src/app/(owner)/settings/billing/page.tsx unconditionally `redirect("/settings?tab=billing")` dropping the query, and grep confirms no code consumes `checkout=cancelled`. proxy.ts allowlists only `/pricing`, `/billing/checkout`, `/billing/plans`, `/auth/` (line 245-248) so a non-admin with expired/canceled status abandoning checkout is bounced from /settings to /pricing (line 348-352), while the existing proxy-allowlisted src/app/(owner)/billing/checkout/cancel/page.tsx has zero

### [LOW] `supabase/functions/stripe-webhooks/index.ts:156`
**customer.subscription.trial_will_end is unhandled, so no-card Stripe trials auto-cancel with zero advance notice to the owner.**

stripe-checkout creates trials with `payment_method_collection: "if_required"` and `end_behavior.missing_payment_method: "cancel"`, and Stripe emits `customer.subscription.trial_will_end` 3 days before that cancellation — but the router's default case only logs a Sentry warning. There is no other reminder mechanism (the `expire_trials` cron sends no email either), so a trial owner's subscription silently deletes and their next dashboard request bounces to /pricing with no warning email, undermining conversion. Handling the event with a Resend email (the failure-email plumbing already exists in invoice-payment-failed.ts) closes the gap; it would also stop these expected events from burning Sentry warning quota.

> Verifier: All premises verified: stripe-checkout/index.ts creates trials with `payment_method_collection: "if_required"` + `trial_settings.end_behavior.missing_payment_method: "cancel"`, and the stripe-webhooks router (index.ts:142-161) handles only 4 event types, so `customer.subscription.trial_will_end` falls to the default case at line 156-161 which only fires `captureWebhookWarning`; `expire_trials()` (20260419230000_trial_model.sql) is a pure UPDATE with no email, and the migration comment confirms the drip emails were deleted, while Resend plumbing exists in invoice-payment-failed.ts. Minor overst


## Auth flows (12)

### [HIGH] `src/app/auth/callback/route.ts:7`
**Email-change confirmation links are generated with type=email_change but the callback's VALID_OTP_TYPES rejects that type, so email change can never be confirmed.**

The branded-email hook `supabase/functions/auth-email-send/index.ts` maps `email_change` in OTP_TYPE_MAP (line 51) and builds `/auth/callback?token_hash=...&type=email_change` (line 104), and settings has a live email-change surface (`src/components/settings/general-settings.tsx:96` calls `auth.updateUser({ email })`). But VALID_OTP_TYPES omits `email_change`, so isValidOtpType fails at line 71 and the link is bounced to `/auth/callback?error=invalid_type` → `/login?error=oauth_failed`, where the login page silently strips the param. verifyOtp is never called, the email address is never changed, and the user gets zero feedback. supabase-js verifyOtp accepts `email_change`; the type must be added to the allowlist with a success redirect.

> Verifier: `VALID_OTP_TYPES` at src/app/auth/callback/route.ts:7-13 is `["signup","email","recovery","magiclink","invite"]` — no `email_change` — so the link built by supabase/functions/auth-email-send/index.ts:104 (`type=${OTP_TYPE_MAP.email_change}` = "email_change", line 51) fails `isValidOtpType` at line 71 and bounces to `?error=invalid_type` → (no token_hash on re-entry) → `/login?error=oauth_failed`, which login/page.tsx:55-56 silently strips via `router.replace("/login")`. The flow is live (general-settings.tsx:96 calls `supabase.auth.updateUser({ email })` and its comment says confirmation is th

### [HIGH] `src/app/auth/callback/route.ts:82`
**A SUCCESSFUL magiclink or invite OTP verification falls through to the "link has expired" error redirect.**

VALID_OTP_TYPES allowlists `magiclink` and `invite` (lines 7-13) and the auth-email-send hook generates exactly those callback links, but the success branch (lines 82-94) only handles `signup`/`email` (→ /dashboard) and `recovery` (→ /auth/update-password). For a verified magiclink/invite, `verifyOtp` succeeds and session cookies are set, then execution falls to line 106 and redirects the now-authenticated user to `/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid` — the update-password page reads that hash and shows "Link Expired or Invalid". Every post-checkout "Resend Login Link" magic link (the only magiclink producer) ends on a false error page despite the login having worked.

> Verifier: In src/app/auth/callback/route.ts the success branch (lines 82-94) only returns for `signup`/`email` and `recovery`; a successful `magiclink`/`invite` verifyOtp (session cookies already set via setAll) falls through line 96's signup/email check to line 106's redirect to `/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid`. The producers are real: `supabase/functions/auth-email-send/index.ts:104` builds `/auth/callback?token_hash=...&type=magiclink|invite` for those email types, post-checkout "Resend Login Link" (`src/app/auth/post-checkout/page.tsx:

### [HIGH] `src/app/auth/confirm-email/page.tsx:62`
**The "Resend Email" action requires an authenticated session that its target audience can never have, so the button always fails.**

handleResendEmail calls `supabase.auth.getUser()` and aborts with "Please sign up again or contact support" when there is no user (lines 60-68). Users only reach this page when they CANNOT establish a session: login routes "Email not confirmed" failures here (src/app/(auth)/login/page.tsx:123) and owner-subscribe-dialog signups requiring confirmation get no session from signUp. So getUser() always returns null and the page's primary action is dead for 100% of its traffic. Correct is `auth.resend({ type: 'signup', email })` with the email passed via query param or an input field — resend does not require a session.

> Verifier: Both real entry routes to /auth/confirm-email are sessionless — login/page.tsx:123 pushes there only after signInWithPassword FAILS with "Email not confirmed" (no session set), and auth/callback/route.ts:101 redirects there only when verifyOtp fails to produce a session — yet page.tsx:60-68 gates resend on `supabase.auth.getUser()` and aborts with "Please sign up again" when user is null, and confirm-email-states.tsx offers no email input nor does any caller pass an email query param, so the resend button dead-ends for effectively all traffic. Minor detail correction: owner-subscribe-dialog.ts

### [MEDIUM] `src/app/(auth)/login/page.tsx:55`
**The login page silently strips ?error=oauth_failed without showing any error to the user.**

The mount effect (lines 53-58) does `router.replace("/login")` when `error === "oauth_failed"` and never calls setAuthError or shows a toast. Every failed OAuth exchange AND every invalid/expired email-link fallthrough from /auth/callback (which terminates at `/login?error=oauth_failed`, route.ts:124-126) therefore produces a pristine login form with zero feedback — the user cannot tell that their Google sign-in or email link failed. The replace also drops any other query params present on the URL.

> Verifier: page.tsx:53-58 does `router.replace("/login")` when `error === "oauth_failed"` without calling `setAuthError` or any toast — grep shows these are the only two `oauth_failed` sites in src, so no other component surfaces it, and callback route.ts:115-126 sends every failed `exchangeCodeForSession` (and any callback lacking both token_hash and code) to `/login?error=oauth_failed`, yielding a pristine form with zero feedback; the bare replace also drops sibling params like `redirect`. One detail overstated: expired email-link failures with a valid token_hash+type do NOT land here — they route to `

### [MEDIUM] `src/app/auth/post-checkout/page.tsx:90`
**Magic-link resend sets emailRedirectTo to /dashboard, bypassing /auth/callback so the sign-in dead-ends against the proxy auth gate.**

With default Supabase templates, the verify endpoint redirects to `/dashboard?code=...`; /dashboard is in PRIVATE_ROUTE_PREFIXES and the request carries no session cookies yet, so proxy.ts:218 bounces it to `/login?code=...&redirect=/dashboard`. Nothing navigates after the browser client's background PKCE exchange, so the buyer (who has no password) is left staring at the password login form; in a different browser/device the exchange fails outright (missing code_verifier) and they cannot sign in at all. With the auth-email-send hook active the redirect is instead the callback magiclink fallthrough bug (see route.ts:82). Correct target is `${origin}/auth/callback?next=/dashboard`.

> Verifier: Line 90 does set `emailRedirectTo: ${origin}/dashboard`, and the claimed chain is real in code: `/dashboard` is in PRIVATE_ROUTE_PREFIXES (proxy.ts:28), the cookieless verify redirect hits proxy.ts:218-222 which bounces to `/login?code=...&redirect=/dashboard`, and nothing exchanges-and-navigates there (grep shows `exchangeCodeForSession` only in src/app/auth/callback/route.ts; auth-provider.tsx's onAuthStateChange only writes query cache, never navigates), so under default templates the buyer dead-ends (and cross-device PKCE fails outright); the correct target is the callback route which hand

### [MEDIUM] `src/app/auth/post-checkout/page.tsx:160`
**Page claims "A login link has been sent to {email}" but nothing ever sends one, and no flow links to this page.**

Per the AUTH-10 comment (lines 17-24) the page deliberately does NOT auto-send a magic link; the stripe-checkout-session function only returns the customer email, and neither stripe-checkout nor stripe-webhooks sends any login email. Yet the success state renders "Check Your Email" / "A login link has been sent to {email}", so a user would wait for an email that never arrives unless they guess to click "Resend Login Link". Additionally the page is orphaned: stripe-checkout's success_url points at /dashboard, and the only repo reference to /auth/post-checkout is the robots.ts disallow — no redirect or link ever lands here.

> Verifier: Line 160 of src/app/auth/post-checkout/page.tsx renders "A login link has been sent to {email}" while the AUTH-10 design (lines 17-24, 78) deliberately never auto-sends one — stripe-checkout-session returns only `{ customer_email }` (AUTH-05, index.ts:69-73) and the stripe-webhooks checkout-session-completed handler contains no generateLink/signInWithOtp/email send (grep returns nothing). The page is also orphaned: stripe-checkout's success_url is `${frontendUrl}/dashboard?checkout=success&session_id=...` (index.ts:123) and the sole repo reference to /auth/post-checkout is the robots.ts disall

### [MEDIUM] `src/app/auth/update-password/page.tsx:43`
**The page marks itself "valid" and shows the password form without ever verifying a recovery session exists.**

useResetTokenStatus only inspects location.hash for error params (lines 29-46); when the hash is clean it renders UpdatePasswordForm regardless of session state. A user who opens the reset link on a different device/browser (PKCE code exchange fails — no code_verifier) or navigates to /auth/update-password directly gets the full form, fills in a new password, and only then receives a raw "Auth session missing!" toast from updateUser (update-password-form.tsx:67) with no recovery path. Correct is to check getUser() (or the PASSWORD_RECOVERY auth event) and render ExpiredLinkContent when no session exists.

> Verifier: useResetTokenStatus (page.tsx:29-46) only parses location.hash for error params and sets "valid" on any clean hash — no getUser()/session check exists anywhere (page, UpdatePasswordForm, or auth/layout.tsx, which is a pass-through), and /auth/update-password is not in proxy.ts PRIVATE_ROUTE_PREFIXES, so direct unauthenticated navigation renders the full password form. Submission then fails at supabaseClient.auth.updateUser (update-password-form.tsx:67) with the raw "Auth session missing!" surfaced via toast and inline Alert, and the "Request New Reset Link" recovery UI is only reachable in the

### [MEDIUM] `src/proxy.ts:347`
**Subscription-lapsed users (past_due/canceled/expired) are locked out of every surface that could fix their billing.**

The gate redirects any non-active/trialing status to /pricing for all private routes, and the allowlist (lines 244-248) exempts only /billing/checkout, /billing/plans and /auth/. The Stripe customer-portal launcher lives in `src/components/settings/billing-settings.tsx` under /settings (private, not allowlisted), so a past_due owner who just needs to update a card can never reach "Manage Subscription" — they are bounced to /pricing, which renders no portal button and no explanation of why they were redirected (pricing-content.tsx never reads subscription_status). Their only offered path is a brand-new checkout.

> Verifier: proxy.ts:347-353 bounces any non-active/trialing status on all private routes (incl. /settings, home of billing-settings.tsx's portal launcher) to /pricing, and pricing-content.tsx contains zero subscription_status/portal handling. The one allowlisted surface with a portal launcher, /billing/plans (page.tsx:177-188), hides "Manage Subscription" behind `hasSubscription`, which requires `subscriptionStatus === "active" || "trialing"` (lines 59-70) — so a past_due/canceled/expired owner sees only plan cards whose select handler takes the `!hasSubscription` branch into `createCheckoutSession` (lin

### [MEDIUM] `supabase/functions/stripe-checkout/index.ts:123`
**Checkout success_url returns paying customers to /dashboard, which the proxy subscription gate can bounce to /pricing before the webhook lands.**

success_url is `/dashboard?checkout=success&session_id=...` and cancel_url is `/settings/billing?checkout=cancelled` — neither is in the proxy's subscription-gate allowlist (proxy.ts:244-248 exempts only /billing/checkout, /billing/plans, /auth/), and the allowlisted landing pages that exist for exactly this (`src/app/(owner)/billing/checkout/success` and `/cancel`) are never used. A lapsed owner (status `canceled`/`expired`) who re-subscribes returns from Stripe to /dashboard while `subscription_status` is still stale (webhook lag) and proxy.ts:347-353 redirects them straight back to /pricing — payment looks like it failed. success_url/cancel_url should target the allowlisted /billing/checkout/* pages.

> Verifier: stripe-checkout/index.ts:123-124 sets success_url=/dashboard and cancel_url=/settings/billing, neither of which matches proxy.ts:244-248's pathname-prefix allowlist (/pricing, /billing/checkout, /billing/plans, /auth/), so proxy.ts:346-353 bounces any non-active/trialing user to /pricing before the webhook updates users.subscription_status — and the proxy's own comment (proxy.ts:241-243) says the allowlist exists because "Stripe redirect-back round-trip lands on /billing/checkout". The purpose-built pages src/app/(owner)/billing/checkout/success/page.tsx and cancel/page.tsx exist but grep show

### [LOW] `src/app/auth/signout/page.tsx:43`
**Sign-out failure is presented as success — onError sets signedOut(true), showing "You have been signed out successfully".**

handleSignOut's onError callback (lines 43-45) sets the same `signedOut` state as onSuccess, so a failed `auth.signOut()` (network error, auth-server 5xx — cases where supabase-js does NOT clear the local session) renders the "Signed Out … successfully" card and auto-redirects to /login while the user still holds a valid session; useSignOutMutation's cache clearing (clearAuthData) also only runs onSuccess. The error path should surface a retry state instead of claiming success.

> Verifier: onError at src/app/auth/signout/page.tsx:43-45 sets the same signedOut(true) as onSuccess, so a failed signOut renders the "You have been signed out successfully." card (lines 72-90) and auto-redirects to /login (lines 50-56); use-auth-mutations.ts:26-30 throws on signOut error and clearAuthData runs only in onSuccess (lines 86-91), while supabase-js keeps the local session on non-401/403/404 failures — so success is claimed with a live session and uncleaned caches.

### [LOW] `src/proxy.ts:221`
**The login redirect preserves only the pathname in ?redirect=, dropping the destination's query string.**

`url.searchParams.set("redirect", pathname)` (also lines 234 and 330) records only `pathname`, so an unauthenticated hit on `/properties?page=2` becomes `redirect=/properties` and after sign-in the user lands on /properties without their query state. Meanwhile the clone keeps the ORIGINAL query params on the /login URL itself, where they are meaningless. The redirect param should carry `pathname + search`.

> Verifier: src/proxy.ts lines 221/234/330 all do `url.searchParams.set("redirect", pathname)` where `pathname` comes from `const { pathname } = request.nextUrl` (line 155), so the destination's query string is dropped, while `request.nextUrl.clone()` (lines 219/232/328) leaves the original query params stranded on the /login URL where nothing reads them (login/page.tsx consumes only `error` and `redirect`). The consumer would accept path+query — `isValidRedirect` in src/app/(auth)/login/page.tsx:27 passes `/properties?page=2` and `router.push(destination)` (line 169) navigates verbatim — so an unauthenti

### [LOW] `supabase/functions/stripe-billing-portal/index.ts:70`
**Billing-portal Edge Function hardcodes return_url to /dashboard and ignores the returnUrl the client sends.**

`createCustomerPortalSession(returnUrl)` in src/lib/stripe/stripe-client.ts:118 posts a returnUrl in the body ( /billing/plans passes `${origin}/billing/plans`, page.tsx:83,125), but the function never reads it and always returns users to `/dashboard?billing=updated`. Users managing their plan from /billing/plans are dumped on the dashboard instead of back where they started, and a lapsed user returning from fixing payment hits the /dashboard subscription gate race (bounce to /pricing until the webhook lands).

> Verifier: supabase/functions/stripe-billing-portal/index.ts never calls req.json() anywhere — the only body-derived data used is the auth header — and line 70 hardcodes `return_url: ${frontendUrl}/dashboard?billing=updated`, while the client posts `returnUrl` in the body (src/lib/stripe/stripe-client.ts:118-120) and /billing/plans passes `${window.location.origin}/billing/plans` (page.tsx:83, 125-126), so that value is silently discarded. Impact is a UX papercut (users returned to /dashboard instead of the plans page), and any fix must validate the client-supplied returnUrl against the app origin to avo


## Forms & validation (17)

### [HIGH] `src/components/leases/lease-form-financial-fields.tsx:43`
**Monthly Rent and Security Deposit inputs accept cents (step="0.01" + parseFloat) but leases.rent_amount/security_deposit are integer columns, so any decimal entry fails with a dead-end generic error**

The rent input (line 43) and security deposit input (line 68) use `step="0.01"` and `Number.parseFloat`, and the form schema in lease-form-options.ts validates only `z.number().min(0)` with no `.int()`. Prod columns `leases.rent_amount` and `leases.security_deposit` are `integer` (verified via information_schema), and PostgREST's `json_populate_record` path raises 22P02 for a decimal into an integ

> Verifier: Inputs use `step="0.01"` + `Number.parseFloat` (lines 43/47, 68/72), the schema in lease-form-options.ts is `z.number().min(0)` with no `.int()`, and lease-form.tsx spreads `value` unrounded into `leaseMutations.create/update` which insert directly into `leases`. Prod columns are `integer` (re-verified via information_schema) and `json_populate_record(null::leases, '{"rent_amount":1500.55}')` raises 22P02 `invalid input syntax for type integer: "1500.55"` — the exact PostgREST decode path — so entering 1500.50 fails the whole lease save. That message matches RAW_DB_INTERNALS in src/lib/mutatio

### [HIGH] `src/components/properties/edit-unit-panel.tsx:194`
**Edit Unit slide-out panel rent input accepts decimals into the integer units.rent_amount column (sibling of unit-form)**

Identical to add-unit-panel: `step="0.01"` (line 194), `Number.parseFloat` (line 72), `> 0` guard only (line 86), update sent to `units.rent_amount integer` via `updateUnitMutation`. Any cents-containing rent edit fails 22P02 with a generic toast and the panel gives no field error, so the save appears permanently broken to the user.

> Verifier: Live prod schema shows `units.rent_amount` is `integer` (verified via information_schema), while the panel invites cents (`step="0.01"`, placeholder "0.00" at lines 192-195), parses with `Number.parseFloat` (line 72), guards only `> 0` (line 86), and sends the raw float unrounded through `unitMutations.update()` → `supabase.from("units").update()` (unit-keys.ts:237-242). A rent like 1500.50 hits PostgREST's JSON→integer coercion and fails 22P02, surfacing only the generic "Update unit" toast with no field error; the sibling add-unit-panel.tsx has the identical parseFloat/step="0.01" pattern (l

### [MEDIUM] `src/app/(owner)/documents/templates/components/use-template-pdf.ts:87`
**Template Preview/Export read form.state.values directly and never run form validation, so the wired zod schemas (tenant-notice, rental-application, inspection, maintenance) gate nothing**

All four template clients (tenant-notice-template.client.tsx, rental-application-template.client.tsx, property-inspection-template.client.tsx, maintenance-request-template.client.tsx) attach schema validators via `useForm({ validators: { onBlur, onSubmitAsync } })`, but `handlePreview`/`handleExport` call `getPayload()` on raw `form.state.values` without ever invoking `form.handleSubmit()`, so onS

> Verifier: getPayload() in all four template clients reads raw form.state.values, and useTemplatePdf's handlePreview/handleExport (lines 42/90) call it without ever invoking form.handleSubmit() or checking form.state.isValid — grep confirms no handleSubmit/canSubmit/isValid usage anywhere in the templates directory, so the onSubmitAsync validators are dead code. Clearing tenantName (required by tenantNoticeSchema) or entering an invalid email in the rental application and clicking Export still produces and downloads a finished PDF; validation errors only ever surface as blur-time field messages that the 

### [MEDIUM] `src/components/leases/bulk-import-config.ts:109`
**Lease CSV import accepts decimal rent/deposit which the bulk_import_create_lease RPC silently rounds into the integer columns, altering the imported financial data**

`coerceOptionalNumber` keeps decimals and the shared `leaseInputSchema` rent_amount/security_deposit have no `.int()` (src/lib/validation/leases.ts lines 48, 59), so a CSV cell "1800.50" validates clean. The RPC takes `p_rent_amount numeric` and inserts into `leases.rent_amount integer` (20260422120000_v23_second_audit_cycle.sql), where Postgres' numeric→integer assignment cast rounds — the lease 

> Verifier: `coerceOptionalNumber` (`Number("1800.50")` → 1800.5) feeds `leaseInputSchema`, whose rent_amount/security_deposit use `positiveNumberSchema`/`nonNegativeNumberSchema` (src/lib/validation/common.ts:82-89) with no `.int()`, so the row validates clean; the RPC (`20260705003811_lease_tenants_primary_trigger.sql:46-146`) declares `p_rent_amount numeric`/`p_security_deposit numeric`, checks only `> 0`/`>= 0` with no whole-number guard, and inserts directly into `leases.rent_amount`/`security_deposit`, which are integer-dollar columns in prod — Postgres' numeric→integer assignment cast rounds 1800.5

### [MEDIUM] `src/components/leases/lease-form-options.ts:13`
**Lease create/edit form has no end_date-after-start_date validation; reversed dates save silently for draft leases and hit a raw DB range error for active ones**

The validation schema only checks both dates are non-empty strings. The DB has no CHECK on date order; the only enforcement is the `leases_unit_date_overlap_exclusion` constraint's `daterange(start_date, coalesce(end_date,...), '[]')`, which is evaluated only for `lease_status in ('active','pending_signature')`. So creating/editing a draft lease with end_date before start_date persists nonsense da

> Verifier: The schema (lease-form-options.ts:12-13) and leaseInputSchema (src/lib/validation/leases.ts:45-46) only check non-empty strings — no cross-field refine — and the create/update mutationFns (lease-mutation-options.ts) insert/update directly via PostgREST with no further validation; no migration adds a date-order CHECK, so a draft lease with end_date < start_date persists silently (the only guard, leases_unit_date_overlap_exclusion in 20251231081143, is a partial constraint `where lease_status in ('active','pending_signature')` that never evaluates draft rows). For active/pending_signature the re

### [MEDIUM] `src/components/leases/wizard/details-step.tsx:160`
**Pet Deposit and Monthly Pet Rent inputs accept cents (step="0.01", placeholders "300.00"/"25.00") but leases.pet_deposit/pet_rent are integer columns**

Same class as the rent fields: `parseDollars` preserves decimals and `leaseDetailsStepSchema` has no `.int()` on pet_deposit/pet_rent, but both prod columns are `integer` (verified via information_schema). A pet deposit of 300.50 passes step validation and the whole wizard, then the final insert fails with 22P02 surfaced as a generic error. Inputs should be whole-dollar with `.int()` validation ma

> Verifier: Prod `information_schema` confirms `leases.pet_deposit`/`pet_rent` are `integer`, and `SELECT (json_populate_record(null::public.leases, '{"pet_deposit": 300.5}'::json)).pet_deposit` — the exact mechanism PostgREST inserts use — fails with 22P02 "invalid input syntax for type integer". `parseDollars` (details-step.tsx:71-75) preserves decimals, `leaseDetailsStepSchema` uses `nonNegativeNumberSchema` with no `.int()` (lease-wizard.schemas.ts:175-184), and lease-creation-wizard.tsx:179-181 spreads `detailsData` unrounded into the insert, so a user entering 300.50 (invited by step="0.01" and the 

### [MEDIUM] `src/components/leases/wizard/lease-creation-wizard.tsx:246`
**Wizard step validation errors are computed but never rendered — the Next/Create button is silently disabled with no message telling the user what is wrong**

`validateStep` only returns `safeParse(...).success` and the result feeds `disabled={!canGoNext}`; no step component renders field errors (TermsStep/DetailsStep have no error display at all). A user whose end date precedes the start date, whose payment day is 0/32, or who omits the lead-paint acknowledgment for a pre-1978 property just sees a permanently greyed-out button with zero explanation. Th

> Verifier: validateStep (lines 226-239) returns only safeParse().success and its sole consumer is disabled={!canGoNext} (lines 246, 341, 350); TermsStep/DetailsStep contain no error rendering at all (payment_day is a free-text input with no min/max, dates have no cross-field feedback), so an end date before the start date or payment_day 0/32 leaves the Next button greyed out with the schema messages ("End date must be after start date", "Payment day must be between 1 and 31") never shown to the user.

### [MEDIUM] `src/components/leases/wizard/terms-step.tsx:179`
**Wizard Monthly Rent/Security Deposit/Late Fee inputs invite decimal dollars (placeholder "1500.00", parseDollars) but insert into integer lease columns, failing with an unexplained error at the final step**

`parseDollars` (line 71) keeps decimals, placeholders read "1500.00"/"50.00", and `termsStepSchema` uses `positiveNumberSchema`/`nonNegativeNumberSchema` without `.int()`, so 1500.50 passes step validation. The wizard then inserts `termsData` directly into `public.leases` (lease-creation-wizard.tsx line 197-199) whose `rent_amount`, `security_deposit`, and `late_fee_amount` columns are `integer`, 

> Verifier: terms-step.tsx uses inputMode="decimal" placeholders "1500.00"/"50.00" and parseDollars (line 71) preserves fractions, while termsStepSchema (lease-wizard.schemas.ts:110-141) uses positiveNumberSchema/nonNegativeNumberSchema with no .int(), so e.g. 1500.50 passes validation; lease-creation-wizard.tsx (~line 195) spreads termsData straight into `supabase.from("leases").insert()` where prod columns rent_amount/security_deposit/late_fee_amount are `integer` (base_schema.sql:1302-1306; the 20260304140000 numeric(10,2) migration only converted rent_payments, not leases), producing a PostgREST 22P02

### [MEDIUM] `src/components/maintenance/maintenance-form-fields.tsx:246`
**Estimated Cost accepts decimals (step="0.01") and negatives (form is noValidate, field has no validator) but maintenance_requests.estimated_cost is an integer column**

The field has no zod validator at all, the wrapping form has `noValidate` (maintenance-form.client.tsx line 97) which disables the native min="0"/step checks, and use-maintenance-form.ts passes `parseFloat` output straight through (lines 87-92, 128-133). A decimal like 250.50 fails the PostgREST insert with 22P02 (generic "Something went wrong" toast, request not saved); a negative value like -50 

> Verifier: Live prod DB confirms `maintenance_requests.estimated_cost` is `integer` with no cost CHECK constraint, and the full unvalidated chain is real: the field has no validators, the form is `noValidate` (maintenance-form.client.tsx:97), use-maintenance-form.ts passes raw `parseFloat` output (lines 87-92/128-133), and maintenance-keys.ts inserts it directly with no zod parse (create line 325, update line 350). Executing the PostgREST-equivalent cast against prod (`json_to_recordset('[{"a":250.5}]') AS t(a integer)`) fails with exactly 22P02, so "250.50" in a field that invites cents (`step="0.01"`, 

### [MEDIUM] `src/components/properties/add-unit-panel.tsx:189`
**Add Unit slide-out panel rent input accepts decimals into the integer units.rent_amount column (sibling of unit-form)**

Same defect as unit-form-fields.tsx: `step="0.01"`/placeholder "0.00" (lines 187-190) with `Number.parseFloat` (line 80) and only a `> 0` guard (line 97), inserted via `createUnitMutation` into `units.rent_amount integer`. A rent of 950.75 produces a PostgREST 22P02 failure surfaced only as a generic toast; the panel then stays open with no field-level explanation.

> Verifier: Prod `units.rent_amount` is `integer` (information_schema confirms, base schema line 1782, never altered), and the panel invites decimals (`step="0.01"`/placeholder "0.00" at lines 187-190), parses via `Number.parseFloat` (line 80) with only a `>0` guard (line 97), then inserts unrounded via `unitMutations.create()` PostgREST insert (unit-keys.ts:212-216). Live test `json_populate_record(null::public.units, '{"rent_amount": 950.75}')` reproduces the exact failure: `22P02 invalid input syntax for type integer: "950.75"`, surfaced only as a generic "Create unit" toast while the catch at line 119

### [MEDIUM] `src/components/settings/owner-emergency-contact-section.tsx:59`
**handleSave and handleDelete await mutateAsync without try/catch, producing unhandled promise rejections on failure**

Both `handleSave` (line 59) and `handleDelete` (line 81) call `mutateAsync` bare; on failure the rejection escapes the async handler (unhandled rejection → duplicate Sentry event + dev overlay) even though the hook's onError already shows the toast. Same FORMFIX-08 class fixed in all the other forms. Additionally on delete failure `setFormData(EMPTY_FORM)` is skipped only by accident of the throw,

> Verifier: Lines 59 and 81 bare-`await` mutateAsync inside async handlers passed directly to `onSubmit`/`onClick`; React never awaits or catches the returned promise, so any mutation failure (e.g. network/RLS error on the `users` update) escapes as a window unhandledrejection — a second Sentry capture plus dev overlay on a failure the hook's onError (toast + logger + rollback, use-owner-emergency-contact.ts:162-175/212-225) already handled. This is exactly the FORMFIX-08 class the repo eradicated in phase 31 (commit 21bf44032 fixed the identical "un-awaited handler + escaping rejection" in use-maintenanc

### [MEDIUM] `src/components/units/bulk-import-config.ts:87`
**Unit CSV import accepts decimal rent_amount which fails the direct PostgREST insert into integer units.rent_amount as a raw per-row 22P02 error**

`coerceOptionalNumber` (line 51) preserves decimals and the units validation schema's rent_amount (src/lib/validation/units.ts line 69) lacks `.int()` while bedrooms/square_feet have it, so a CSV rent "1500.50" passes the parse/validate step and is reported as an importable row. The insert (line 135) then fails with `invalid input syntax for type integer: "1500.50"` shown in the row-error list — a

> Verifier: Prod `units.rent_amount` is `integer` (verified via information_schema; base schema line 1782, never altered), while `unitInputSchema.rent_amount` is `nonNegativeNumberSchema` (`z.number().min(0)`, units.ts line 69) with no `.int()` — unlike bedrooms/square_feet — and `coerceOptionalNumber` (line 51) preserves decimals, so CSV "1500.50" passes validation as importable. Live-reproduced the insert path: `json_populate_record(null::public.units, '{"rent_amount": 1500.50}')` fails with exactly `ERROR: 22P02: invalid input syntax for type integer: "1500.50"`, which `insertRow` (line 136) surfaces v

### [MEDIUM] `src/components/units/unit-form-fields.tsx:104`
**Unit form Monthly Rent input accepts decimals (step="0.01", placeholder "0.00") but units.rent_amount is an integer column, so decimal rents always fail**

unit-form.client.tsx parses with `Number.parseFloat` (line 108) and only checks `rent_amount > 0` before inserting via PostgREST (unit-keys.ts line 214) into `units.rent_amount integer`. Entering 1250.50 passes every client check and native validation (step 0.01), then the insert/update fails 22P02 and the user sees the genericized "Something went wrong. Please try again." with no way to discover 

> Verifier: Live prod confirms units.rent_amount is integer (scale 0, base_schema.sql:1782, never altered), while the field renders step="0.01"/placeholder "0.00" and unit-form.client.tsx:108 parses via Number.parseFloat with only a >0 check before unit-keys.ts:214 inserts it raw. Reproduced the failure in prod: casting JSON 1250.5 to int via json_to_recordset raises 22P02 "invalid input syntax for type integer", so any decimal rent entry fails with an opaque generic error.

### [MEDIUM] `src/lib/validation/properties.ts:208`
**Property form validates state/ZIP as merely non-empty (requiredString), bypassing the strict 2-letter-state and ZIP-format rules defined in the same file, so invalid codes persist silently**

`propertyFormSchema` (the schema the form actually uses via property-form-options.ts) declares `state: requiredString` and `postal_code: requiredString`, while `propertyInputSchema` in the same file enforces `/^[A-Z]{2}$/` and `/^\d{5}(-\d{4})?$/` — but nothing runs those against form input, and the DB columns are unconstrained text. A single-character state "T" (the input only caps length at 2 an

> Verifier: propertyFormSchema lines 208-209 use `requiredString` (`z.string().min(1)`) and property-form-options.ts picks exactly those fields as the only onBlur/onSubmit validators, then property-form.client.tsx submits straight to `propertyMutations.create/update` which inserts without any strict parse — the `/^[A-Z]{2}$/` and `/^\d{5}(-\d{4})?$/` rules in propertyInputSchema run only in bulk-import-config.ts, never on the form. The state input (property-address-section.tsx:52-73) uppercases and caps at maxLength=2 but enforces no minimum, so state "T" and ZIP "abcde" (inputMode="numeric" is only a mob

### [LOW] `src/components/contact/contact-form.tsx:51`
**Contact form has no client-side max-length validation while the send-contact-email edge function hard-rejects over-length fields, producing a misleading "try again" error**

`validateForm` checks only minimums (name ≥ 2, message ≥ 10) and the inputs have no maxLength, but the server rejects name > 200, subject > 200, message > 5000, phone/company > 200 (supabase/functions/send-contact-email/index.ts lines 32-96) with a 400. A user pasting a 6000-character message gets "We couldn't send your message. Please try again, or email us directly..." — retrying can never succe

> Verifier: `validateForm` (contact-form.tsx:24-59) checks only minimums and neither input in contact-form-fields.tsx has a `maxLength`, while send-contact-email/index.ts:32-96 400-rejects name/subject>200, message>5000, phone/company>200. A pasted 6000-char message passes client validation, the 400 makes `invoke` return an error, and line 96-98 throws the generic "Please try again, or email us directly" message — retrying with the same input can never succeed and nothing identifies length as the cause. Impact is limited to a rare over-length submission on a public form with a stated email fallback, so se

### [LOW] `src/components/inspections/new-inspection-form.client.tsx:58`
**Failed inspection creation escapes handleSubmit as an unhandled promise rejection (no try/catch around mutateAsync)**

`await createInspection.mutateAsync(dto)` is not wrapped in try/catch, so when the insert fails (RLS, network, constraint) the rejection propagates out of the async submit handler as an unhandled promise rejection — a duplicate Sentry capture plus a dev overlay on an already-toasted failure (the mutation's createMutationCallbacks shows the toast). Every other form in the codebase explicitly swallo

> Verifier: Line 58 `await createInspection.mutateAsync(dto)` sits in an async handler passed directly to `<form onSubmit={handleSubmit}>` with no try/catch, and TanStack Query's mutateAsync always rejects on failure even though createMutationCallbacks' onError already toasts (via handleMutationError, which also Sentry-captures) — so any insert failure escapes as an unhandled rejection. The codebase's own FORMFIX-08 pattern explicitly guards against exactly this: property-form.client.tsx lines 121-132 wrap the same flow in try/catch with a comment that an uncaught mutation rejection "would escape as an un

### [LOW] `src/components/tenants/add-tenant-info-fields.tsx:62`
**Add-tenant phone field is wired without any validator even though addTenantSchema.shape.phone exists, so malformed phone numbers persist unchecked**

first_name/last_name/email each attach `addTenantSchema.shape.*` validators, but the phone AppField has no `validators` prop, so `phoneSchema` (min 10 digits, format check) is never applied; add-tenant-form.tsx then sends any non-empty string (`...(value.phone ? { phone: value.phone } : {})`) to the tenants table, which has no CHECK. Entering "abc" saves a junk phone silently while the same value 

> Verifier: Line 62's `<form.AppField name="phone">` has no `validators` prop while siblings attach `addTenantSchema.shape.*`, and `add-tenant-form-options.ts` explicitly declares "no form-level validators"; `addTenantSchema.shape.phone` (phoneSchema: regex + min 10) exists but is never applied. The submit path (`add-tenant-form.tsx:62` `...(value.phone ? { phone: value.phone } : {})`) and `tenantMutations.create()` insert the raw string with no parse, and no migration adds a CHECK on `tenants.phone` — so "abc" persists silently while the tenant edit form rejects the same value. Note the proposed fix need


## DB ↔ frontend drift (1)

### [HIGH] `src/components/leases/lease-form.tsx:103`
**Lease edit form always sends a `version` field to PostgREST, but the `leases` table has no `version` column, so every lease edit fails with PGRST204.**

In edit mode the form submits `version: lease.version ?? 1` (lease-form.tsx:100-104); since no migration ever added a `version` column to `leases` (confirmed: zero hits for a leases `version` column across supabase/migrations/** and the generated `leases` Row/Insert/Update types in src/types/supabase.ts have no `version`), `lease.version` is always undefined and `?? 1` coerces it to the truthy val

> Verifier: Prod `leases` has no `version` column (information_schema query returned zero rows; generated supabase.ts Row/Update types agree), and `LeaseWithExtras.version` (core.ts:135) is a client-only optional never populated, so lease-form.tsx:103 always sends `version: undefined ?? 1 = 1`. In lease-mutation-options.ts:96 the truthy `1` is spread into the payload and survives `omitUndefined` (it strips only undefined), so `.from("leases").update(payload)` PATCHes an unknown column, which PostgREST rejects with PGRST204 — every edit-mode submit throws via `handlePostgrestError` and no lease update ever


## Data layer — queries & cache (17)

### [HIGH] `src/hooks/api/use-inspection-mutations.ts:43`
**useUpdateInspection's updateDetail replaces the enriched inspection detail (with rooms/photos) with the bare updated row, making all rooms vanish from the UI**

inspectionQueries.detailQuery(id) returns `{...inspection, rooms: [...]}` with signed photo URLs, but inspectionMutations.update(id) returns `narrowInspectionEnums(updated)` from a plain `.select().single()` — no `rooms` key. updateDetail setQueryData's this room-less object into the same detail key and only lists() is invalidated. Concrete failure: on inspection-detail.client.tsx (which uses `useUpdateInspection(id)` and renders `inspection.rooms ?? []`), saving any inspection edit collapses the Rooms section to "No rooms added yet" until a manual refetch after the 5-minute staleTime. The detail key should be invalidated instead (as useCompleteInspection already does).

> Verifier: `inspectionMutations.update()` returns `narrowInspectionEnums(updated)` from a bare `.select().single()` on `inspections` (inspection-mutation-options.ts:52-60) — no `inspection_rooms` embed, so no `rooms` key — and `useUpdateInspection`'s `updateDetail` (use-inspection-mutations.ts:43-46) `setQueryData`s that room-less row over the enriched detail cache built by `detailQuery` (inspection-keys.ts:145-159), which type-checks silently because `Inspection.rooms` is optional (`rooms?: InspectionRoom[]`, inspections.ts:152). Only `lists()` (`["inspections","list"]`) is invalidated, which is not a p

### [HIGH] `src/hooks/api/use-lease-lifecycle-mutations.ts:52`
**useRenewLeaseMutation's updateDetail poisons the lease detail cache with an embed-less row marked fresh**

Same defect class as useUpdateLeaseMutation: leaseMutations.renew() returns a bare `.select().single()` row, and updateDetail writes it into leaseQueries.detail(id).queryKey. setQueryData stamps dataUpdatedAt=now, so even if the detail entry didn't exist yet it is created fresh; navigating to the lease detail page within the 5-minute staleTime renders without the `units`/`properties` embed (property address block blank) and never refetches. Triggered from renew-lease-dialog.tsx on every renewal. The detail key must be invalidated rather than seeded with a shape-mismatched row.

> Verifier: `leaseMutations.renew()` returns a bare `.select().single()` row (lease-mutation-options.ts:182-191, no embeds), and `updateDetail` writes it via `queryClient.setQueryData` into `leaseQueries.detail(id).queryKey` (create-mutation-callbacks.ts:181-183), stamping it fresh under the 5-min DETAIL staleTime while the invalidate list (`leaseQueries.lists()` = `[...,"list"]` + `ownerDashboardKeys.all`) never touches the `[...,"detail",id]` key. The detail consumer `lease-details.client.tsx:42-54` reads `lease.units?.properties?.address_line1` from the embed, so opening the lease detail within 5 minut

### [HIGH] `src/hooks/api/use-tenant-mutations.ts:47`
**useUpdateTenantMutation never invalidates tenantQueries.withLease(id), so the tenant detail page shows stale data immediately after a successful save**

The tenant detail page (tenant-details.client.tsx) reads `useSuspenseQuery(tenantQueries.withLease(id))` (key ['tenants','with-lease',id]), but the update mutation invalidates only tenantQueries.lists() + ownerDashboardKeys.all and setQueryData's tenantQueries.detail(id). Concrete failure: tenant-edit-form.client.tsx saves emergency-contact changes via this mutation then `router.push(/tenants/${id})` — the detail page renders the old cached withLease data (seeded earlier by useTenantList's select or a prior visit) for up to 5 minutes. useDeleteTenantMutation (line 67) has the same gap, leaving a live withLease entry for a deleted tenant. useMarkTenantAsMovedOutMutation shows the correct pattern (it invalidates withLease(id)).

> Verifier: `useUpdateTenantMutation` (use-tenant-mutations.ts:42-56) only invalidates `['tenants','list']` + dashboard and setQueryData's `['tenants','detail',id]`, none of which prefix-match the detail page's key `['tenants','with-lease',id]` (tenant-details.client.tsx:45, staleTime 5min via QUERY_CACHE_TIMES.DETAIL); that entry is deterministically seeded fresh by `useTenantList`'s select (use-tenant.ts:44-46), so after tenant-edit-form.client.tsx saves and `router.push(\`/tenants/${id}\`)` (line 45) the suspense query renders the pre-edit cached data with no refetch (client-side nav fires no window-fo

### [MEDIUM] `src/hooks/api/query-keys/inspection-keys.ts:46`
**inspectionQueries.list() is an unbounded list query — no .limit() or .range() despite requesting count:'exact'**

The live inspections list (useInspections → inspection-list.client.tsx) selects all columns plus three embeds with `{ count: 'exact' }` but never bounds the query, violating CLAUDE.md "All list queries MUST have .limit() or .range()". Once an owner exceeds PostgREST's max-rows ceiling (1000) the list silently truncates with no pagination or "showing N of M" affordance, and the fetched `count` is discarded. Should use `.range()` + surface the count like documentQueries.list does.

> Verifier: Lines 44-50 of src/hooks/api/query-keys/inspection-keys.ts show the list query destructures only `{ data, error }` (count requested via `{ count: "exact" }` but never read) and has `.order()` with no `.limit()` or `.range()`, directly violating CLAUDE.md's "All list queries MUST have .limit() or .range()". This is the live path (use-inspections.ts:18 → inspection-list.client.tsx:83), so past Supabase's 1000-row PostgREST ceiling the list silently truncates with no pagination affordance; byLeaseQuery (lines 88-94) is unbounded too, though naturally scoped per lease.

### [MEDIUM] `src/hooks/api/query-keys/property-stats-keys.ts:140`
**propertyStatsQueries.stats() mixes occupied-UNIT counts with total-PROPERTY counts, producing negative vacancy and >100% occupancy**

`total` counts non-inactive properties, `occupied` counts units with status='occupied' (across all properties, including units of soft-deleted/inactive properties — no property join filter), then `vacant = total - occupied` and `occupancyRate = occupied/total`. For 2 properties with 5 occupied units this yields vacant=-3 and occupancyRate=250%. The exported usePropertyStats hook returns this shape; it currently has no page consumer (tests only) but is live public API and is referenced by the markSold invalidation. Correct is either all-property or all-unit denominators (e.g. what mapUnitStats does), plus filtering occupied units to non-inactive properties.

> Verifier: Lines 116-142 of src/hooks/api/query-keys/property-stats-keys.ts count `total` from `properties` (.neq status inactive) but `occupied` from `units` (.eq status 'occupied', with no property-status join filter), then compute `vacant = total - occupied` and `occupancyRate = occupied/total` — so 2 properties with 5 occupied units concretely yields vacant=-3 and occupancyRate=250%, and units of soft-deleted properties still count. The result populates `PropertyStats` (src/types/stats.ts:10, where total/occupied/vacant are clearly one entity type) and is live via `usePropertyStats()` (src/hooks/api/

### [MEDIUM] `src/hooks/api/use-lease-mutations.ts:159`
**useUpdateLeaseMutation's updateDetail overwrites the lease detail cache with a bare row, wiping the units/tenants embeds the detail page renders**

leaseMutations.update() returns the row from `.select().single()` with no embeds, but updateDetail writes that bare row into leaseQueries.detail(id).queryKey, whose queryFn returns `*, tenants:primary_tenant_id(...), units(..., properties(...))`. The detail query itself is never invalidated (only lists/tenants/units/dashboard). Concrete failure: edit a lease via lease-form.tsx (edit page or modal), return to the lease detail page — lease-details.client.tsx line 52 reads `lease.units?.properties` which is now undefined, so the property/address block disappears for up to 5 minutes (DETAIL staleTime) with no refetch. Correct is to invalidate leaseQueries.detail(id) (or re-select with the embeds) instead of setQueryData with a shape-mismatched row.

> Verifier: leaseMutations.update() returns a bare `.select().single()` row (no embeds), and createMutationCallbacks' Tier-2 path does a full-replace `queryClient.setQueryData(leaseQueries.detail(id).queryKey, data)` while the invalidate list (`["leases","list"]`, tenant/unit/dashboard keys) never touches the `["leases","detail",id]` key — verified by key prefixes in lease-keys.ts. Since setQueryData resets dataUpdatedAt and DETAIL staleTime is 5 min (query-config.ts), lease-details.client.tsx line 52 (`.units?.properties` in getPropertyAddress) reads undefined after any edit via lease-form.tsx (the sole 

### [LOW] `src/hooks/api/query-keys/blog-keys.ts:175`
**blogQueries.reviewQueue() is an unbounded list query**

The admin review queue (live in blog-review-client.tsx) selects all `status='in-review'` rows including full `content` with no `.limit()`. The blog factory generated 200+ posts historically; a backed-up review queue fetches every draft body in one round trip and silently truncates past PostgREST max-rows. Add `.limit()` (the UI reviews one at a time).

> Verifier: Both `reviewQueue()` (src/hooks/api/query-keys/blog-keys.ts:173-177) and the parallel server-side fetch (src/app/(admin)/admin/blog/page.tsx:20-24) select all `status='in-review'` rows including full `content` bodies with no `.limit()`/`.range()`, directly violating the CLAUDE.md rule "All list queries MUST have `.limit()` or `.range()` — no unbounded select". The blog factory demonstrably produced 218 posts, so a backed-up queue concretely means hundreds of multi-KB draft bodies in one fetch, silently truncated at PostgREST max-rows; low severity stands since it is an admin-only surface and t

### [LOW] `src/hooks/api/query-keys/document-category-keys.ts:108`
**documentCategoryQueries.list() has no .limit()/.range()**

The categories list query (lines 107-113) is unbounded, violating the CLAUDE.md rule that all list queries must be bounded. Per-owner category counts are small in practice (7 defaults + custom), but the rule is zero-tolerance and every sibling factory bounds its lists; add a generous `.limit()`.

> Verifier: Lines 107-113 of src/hooks/api/query-keys/document-category-keys.ts chain `.select(...).order().order()` with no `.limit()`/`.range()`, directly violating the CLAUDE.md Data Access rule "All list queries MUST have `.limit()` or `.range()`". Every sibling factory bounds its lists (document-keys.ts `LIST_DISPLAY_LIMIT`, expense-keys.ts even cites this exact rule in a comment at line 144, lease/maintenance/property/tenant/unit keys all use `.range()`/`.limit()`), so this is the lone unbounded list; practical impact is negligible (RLS-scoped, ~7-dozens of rows per owner), hence low severity.

### [LOW] `src/hooks/api/query-keys/expense-keys.ts:193`
**expenseQueries.list() falls back to `data?.length` for the pagination total on the limit-only path**

`total: count ?? data?.length ?? 0` — count is only requested when BOTH limit and offset are provided (isPaginated), so a caller passing `{ limit: 25 }` without offset gets `total = data.length`, which is capped at 25 even when more rows exist, violating the "pagination uses count, never data.length" rule. The current useExpenses caller discards total so the bug is latent, but the exported PaginatedExpenses contract lies for any limit-only caller. Either request count whenever the caller could consume total, or return total only on the fully-paginated path.

> Verifier: At src/hooks/api/query-keys/expense-keys.ts:159-193, `isPaginated` requires BOTH limit and offset, so a `{ limit: 25 }` call takes the `q.limit(25)` branch with no `count: 'exact'` (line 167), making `count` null and `total: count ?? data?.length ?? 0` resolve to `data.length` — capped at 25 even when more rows exist (same for the default 1000-limit path), which is a literal `data.length`-as-pagination-total in the exported `PaginatedExpenses` contract, violating the "use `count`, never `data.length`" rule. Impact is latent: the sole caller `useExpenses` (use-expense-mutations.ts:27-32) never 

### [LOW] `src/hooks/api/query-keys/lease-keys.ts:70`
**leaseQueries.list() declares `search` and `property_id` in LeaseFilters but the queryFn never applies either filter**

The filter block only handles status, unit_id, and tenant_id; `filters.search` and `filters.property_id` are silently dropped even though LeaseFilters advertises them and useLeaseList (use-lease.ts:20-34) exposes a `search` param and forwards it into the factory. Any caller passing search or property_id gets the full unfiltered lease list back while the queryKey (which includes the filters object) caches that wrong result under the filtered key. Sibling factories (propertyQueries.list, tenantQueries.list, unitQueries.list) all apply their search filter — this one must apply search (escaped ilike) and property_id (join through units) or drop the fields from the interface and hook signature.

> Verifier: lease-keys.ts lines 70-77 apply only status/unit_id/tenant_id while LeaseFilters (lines 15-23) declares `search` and `property_id`, and useLeaseList (use-lease.ts:20-34) exposes and forwards `search` into the factory — the queryFn ignores both, so `useLeaseList({ search: 'smith' })` returns the full lease list cached under the filtered queryKey `['leases','list',{search:'smith',...}]`; sibling factories (property/tenant/unit-keys.ts) all apply `escapeOrValue`/`normalizeSearchInput` search. Downgraded to low because no live call site passes `search` or `property_id` today (leases/page.tsx passe

### [LOW] `src/hooks/api/query-keys/maintenance-keys.ts:75`
**maintenanceQueries.list() property_id branch silently drops the unit_id/priority/status filters**

When `filters.property_id` is set, the queryFn takes the `units!inner` join branch (lines 75-92) which applies only the property filter — `filters.priority`, `filters.status`, and `filters.unit_id` are ignored, while the non-property branch applies them. A caller passing `{ property_id, status: 'open' }` receives ALL statuses for that property, cached under the fully-filtered queryKey so the wrong rows persist for the LIST staleTime. The property branch needs the same `.eq()` chain as the else branch.

> Verifier: The defect is real in the code: the `filters?.property_id` branch (maintenance-keys.ts:75-92) applies only `.eq("units.property_id", ...)` with no `unit_id`/`priority`/`status` `.eq()` calls, while the else branch (lines 99-107) applies all three, and the queryKey (line 60) embeds the full filters object — so `list({ property_id, status: 'open' })` would cache unfiltered rows under the fully-filtered key. However, severity drops to low because the branch is currently latent: the only caller in the repo is `maintenanceQueries.list()` with no arguments (src/components/maintenance/maintenance-vie

### [LOW] `src/hooks/api/query-keys/maintenance-keys.ts:289`
**maintenanceQueries.overdue() has no .limit() while its sibling urgent() caps at 50**

The overdue queryFn (lines 286-299) filters by scheduled_date/status and orders, but unlike urgent() directly above it, it never bounds the result set — an unbounded list query per CLAUDE.md. It currently has no component consumer (latent), but the factory is exported; add `.limit(50)` to match urgent() or remove the dead factory.

> Verifier: overdue() (maintenance-keys.ts:283-302) queries maintenance_requests with `.lt().not().order()` and no `.limit()`/`.range()`, violating CLAUDE.md's "All list queries MUST have `.limit()` or `.range()`" rule, while its sibling urgent() (line 217) caps at `.limit(50)`. Grep confirms no component consumes maintenanceQueries.overdue (only the factory definition and a comment in maintenance-mappers.ts), so the defect is latent, matching the low severity.

### [LOW] `src/hooks/api/query-keys/property-keys.ts:94`
**propertyQueries.withUnits() is an unbounded `select("*, units(*)")` list query**

No .limit()/.range() and a full `*` projection with an embedded `units(*)` — doubly against the data-access rules (bounded lists; specific column lists for list queries). The wrapping hook usePropertiesWithUnits is exported but currently has no component consumer, so impact is latent, but any adopter inherits an unbounded double-star fetch. Bound it and enumerate columns, or delete the dead factory+hook.

> Verifier: property-keys.ts lines 94-98 show `withUnits()` runs `.select("*, units(*)")` with `.neq("status","inactive")` and `.order()` but no `.limit()`/`.range()`, directly violating CLAUDE.md's "All list queries MUST have `.limit()` or `.range()` — no unbounded `select('*')`" plus the specific-column-list rule. Its sole consumer `usePropertiesWithUnits` (src/hooks/api/use-properties.ts:62) is referenced only by its own unit test, no component — so impact is latent, matching the low severity.

### [LOW] `src/hooks/api/query-keys/property-keys.ts:170`
**propertyQueries.images() list query has no .limit()**

`property_images` rows for a property are fetched with `.select("*")` + order and no bound, violating the all-list-queries-bounded rule (the sibling maintenanceQueries.photos caps at 20). A property that accumulates many images fetches them all on every detail view. Add a `.limit()` consistent with what the gallery renders.

> Verifier: `propertyQueries.images()` at src/hooks/api/query-keys/property-keys.ts:170-174 queries `property_images` with `.select("*")` + `.eq("property_id")` + `.order()` and no `.limit()`/`.range()`, directly violating the CLAUDE.md rule "All list queries MUST have `.limit()` or `.range()` — no unbounded `select('*')`". The sibling `maintenanceQueries.photos` (maintenance-keys.ts:241) caps the identical per-parent media pattern at `.limit(20)`, confirming the claimed inconsistency; a property with N images fetches all N rows on every detail view.

### [LOW] `src/hooks/api/query-keys/report-keys.ts:103`
**reportQueries.runs() uses unbounded `select("*")` on report_runs**

The runs queryFn (lines 99-108) selects `*` with no `.limit()`/`.range()`, violating both the bounded-lists rule and the prefer-specific-columns guidance. report_runs grows per scheduled execution, so this is the kind of append-only table that eventually exceeds max-rows. No live consumer was found (latent), but the factory is exported; bound it or delete it.

> Verifier: `reportQueries.runs()` queryFn (src/hooks/api/query-keys/report-keys.ts:101-105) is `.from("report_runs").select("*").eq("report_id", reportId).order(...)` with no `.limit()`/`.range()`, directly violating the CLAUDE.md rule "All list queries MUST have `.limit()` or `.range()` — no unbounded `select('*')`" plus the prefer-specific-columns guidance. Grep confirms no consumer outside the factory itself (only the queryKey reference on line 98), so it is latent — low severity is correct.

### [LOW] `src/hooks/api/query-keys/unit-keys.ts:112`
**unitQueries.listByProperty() and unitQueries.byProperty() are unbounded list queries with no .limit()/.range()**

Both queryFns (lines 110-117 and 158-165) select all units for a property with only `.eq('property_id')` + `.neq('status','inactive')` + order — no bound, violating the CLAUDE.md all-list-queries-bounded rule. A property with more units than PostgREST's max-rows cap silently truncates; smaller portfolios pay no cost for adding `.limit()`. Both are live (useUnitsByProperty and property detail pages).

> Verifier: Both queryFns at src/hooks/api/query-keys/unit-keys.ts (listByProperty lines 112-117, byProperty lines 160-165) chain only `.eq("property_id")`, `.neq("status","inactive")`, and `.order()` with no `.limit()`/`.range()`, violating the explicit CLAUDE.md rule "All list queries MUST have `.limit()` or `.range()`"; both are live (properties/page.tsx:72, lease-form.tsx:128, property-units-table.tsx:61, use-unit.ts:41), so a property exceeding PostgREST's max-rows cap would silently truncate. Severity stays low because the sibling `list()` factory is properly ranged and >1000 units per property is a

### [LOW] `src/hooks/api/use-lease-lifecycle-mutations.ts:51`
**useRenewLeaseMutation invalidates only lease lists + dashboard, missing the unit/tenant keys its sibling lifecycle mutations refresh**

leaseMutations.renew() sets `lease_status: 'active'` unconditionally; renewing an expired lease flips the unit back to occupied via the sync_unit_status_from_lease trigger (the same reason useDeleteLeaseOptimisticMutation and useSignLeaseAsOwnerMutation invalidate unitQueries.all()). Renew invalidates only `[leaseQueries.lists(), ownerDashboardKeys.all]`, so unit list/by-property views and tenant lease context stay stale for up to their staleTime after a renewal. Match the terminate/update invalidation set (unitQueries.all() + tenantQueries.lists()).

> Verifier: useRenewLeaseMutation (use-lease-lifecycle-mutations.ts:51) invalidates only `[leaseQueries.lists(), ownerDashboardKeys.all]` while its same-file sibling terminate invalidates `tenantQueries.lists()` + `unitQueries.all()`; tenant list queries embed the lease's `end_date`/`rent_amount`/`lease_status` (tenant-keys.ts:35), so every renewal leaves tenant views showing the old lease end date for up to the 5-min staleTime (query-provider.tsx:60), violating the "mutations invalidate related query keys" rule. The unit-side staleness is also real but narrower: renew sets `lease_status:'active'` uncondi


## Component logic (13)

### [HIGH] `src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx:35`
**Financial analytics stat cards divide dollar-valued metrics by 100, understating Total Revenue, Net Income, and Cash Flow 100x (surviving sibling of the v8.0 100x money-class).**

Lines 35, 60 and 114 render `<NumberTicker value={metrics.totalRevenue / 100} />` (and netIncome/cashFlow), but the data source `get_financial_overview` returns dollars, not cents — the exact class fixed in `financials-summary-stats.tsx` whose lines 13-17 explicitly document "the prior NumberTicker call divided by 100 and displayed revenue 1/100th the actual amount". The `/ 100` here is that same bug left unfixed on this page. (It is currently masked because `analyticsQueries.financialPageData()` casts the RPC's `{overview:{total_revenue,...},highlights:[...]}` shape to `FinancialAnalyticsPageData`'s `{metrics,...}` shape, so `metrics` falls back to all-zero defaults — meaning the page shows $0 today and would show 1/100th of real revenue once the shape is wired.) Correct is passing the dollar values through unchanged, as financials-summary-stats now does.

> Verifier: `financial-overview-stats.tsx` lines 35/60/114 render `metrics.totalRevenue / 100` (and netIncome/cashFlow), but the sole data source `analyticsQueries.financialPageData()` calls `get_financial_overview`, which per migration `20260708132045` returns DOLLARS (`sum(rent_amount)*12` from integer-dollar `leases.rent_amount`, `sum(expenses.amount)` integer dollars) — the identical `/100` mis-conversion that `financials-summary-stats.tsx` lines 12-17 documents removing for this same RPC. The masking claim also checks out: the RPC returns `{overview:{total_revenue,...},highlights:[...]}` with no `met

### [HIGH] `src/app/(owner)/analytics/overview/page.tsx:97`
**Analytics overview KPI cards (Occupancy Rate, Active Tenants, Monthly Revenue) are hardwired to zero because they read fields never present on the locally constructed stats stub.**

Lines 97-100 build `stats` containing only `revenue.growth` and `units.occupancyChange`, then cast it `as DashboardStats` — but lines 112-115 read `stats?.units?.occupancyRate`, `stats?.units?.occupied`, and `stats?.revenue?.monthly`, all of which are undefined and coalesce to 0. An owner with 20 occupied units and $30k MRR sees "Occupancy Rate 0%", "Active Tenants 0", "Monthly Revenue $0" on the Analytics page while the dashboard shows real numbers. The time-range `Select` (line 128) is also not wired to any state/query, so changing it does nothing. Correct is feeding the cards from `useDashboardStats()`/`get_dashboard_stats` like the dashboard does, instead of a cast-silenced stub.

> Verifier: Lines 97-100 construct `stats` with only `revenue.growth` and `units.occupancyChange` and the `as DashboardStats` cast silences the missing fields, so lines 112-115's reads of `stats?.units?.occupancyRate`, `stats?.units?.occupied`, and `stats?.revenue?.monthly` are always undefined and coalesce to 0 — AnalyticsStatCards then renders NumberTicker 0.0%, 0 tenants, and $0 (monthlyRevenue 0*100 / 100) regardless of real data, on a live nav route (`/analytics` redirects to `/analytics/overview`, linked from app-shell.tsx:110 and main-nav.tsx:59). The `Select` at line 128 has only `defaultValue` an

### [HIGH] `src/app/(owner)/financials/income-statement/page.tsx:29`
**Quarterly income statement builds invalid calendar dates ("-31" for June/September), breaking the Quarterly view for two quarters of every year.**

The quarterly branch computes `end_date: `${yearNum}-${quarterEnd...}-31``, producing `2026-06-31` in Q2 and `2026-09-31` in Q3 — dates that do not exist. The string is passed as the `p_end_date date` parameter of `get_expense_summary` (via `useIncomeStatement` → `fetchDashAndExpense`), where Postgres raises "date/time field value out of range", so the page renders `IncomeStatementPageError` whenever a user selects Quarterly between April 1 and September 30. The sibling cash-flow page (src/app/(owner)/financials/cash-flow/page.tsx line 32) already does this correctly with `new Date(selectedYear, endMonth, 0).getDate()`.

> Verifier: Lines 24-30 of income-statement/page.tsx hardcode `-31` as the quarter end day, producing `2026-06-31` (Q2) and `2026-09-31` (Q3); the string flows via `useIncomeStatement` → `fetchDashAndExpense` (financial-keys.ts:75-76) into `get_expense_summary`'s `p_end_date date` parameter (migration 20260708132045), where the Postgres date cast raises 22008 "date/time field value out of range", `handlePostgrestError` re-throws, and the page renders `IncomeStatementPageError` for any Quarterly selection during Q2/Q3 (including today, 2026-07-11). The sibling cash-flow page.tsx line 31 correctly computes 

### [MEDIUM] `src/app/(owner)/analytics/property-performance/performance-stat-cards.tsx:89`
**Monthly revenue stat card divides the dollar-valued totalRevenue by 100 while the adjacent table on the same page formats the identical source without dividing.**

Line 89 renders `<NumberTicker value={metrics.totalRevenue / 100} />`, but `metrics.totalRevenue` is `sum(Number(r.total_revenue))` from `get_property_performance_analytics`, which returns numeric dollars (per migration 20260708131721 BILL-06, which changed these columns to numeric dollars). On the very same page, `top-properties-table.tsx` line 67 renders `formatCurrency(row.original.monthlyRevenue)` from the same rows with no division, so the card and table would disagree by 100x. Currently latent because the RPC emits `0::numeric AS total_revenue` (data gap), but the read-path conversion is wrong and is another sibling of the v8.0 100x class.

> Verifier: `performance-stat-cards.tsx:89` renders `metrics.totalRevenue / 100`, but `use-analytics.ts:205-227` builds both `metrics.totalRevenue` and `performance[].monthlyRevenue` from the same unscaled `Number(r.total_revenue)` (RPC returns `total_revenue numeric` dollars per migration 20260708131721), and `top-properties-table.tsx:67` renders `formatCurrency(row.original.monthlyRevenue)` with no division — so a $1,500 row would show as $15 on the card vs $1,500.00 in the adjacent table, a 100x sibling of the v8.0 class. It is latent only because the RPC currently hardcodes `0::numeric AS total_revenu

### [MEDIUM] `src/app/(owner)/financials/expenses/_components/expense-table.tsx:133`
**Expense dates display one day early for all US timezones because the date-only expense_date is parsed as UTC midnight then formatted in local time.**

`format(new Date(expense.expense_date), "MMM d, yyyy")` parses the `expenses.expense_date` Postgres `date` column (confirmed `"date" NOT NULL` in 20251101000000_base_schema.sql line 1274) as UTC midnight, then date-fns `format` renders it in the local zone — in America/Chicago an expense dated 2026-07-11 displays "Jul 10, 2026". The codebase's canonical fix for exactly this exists: `parseLocalYmd` in src/lib/formatters/date.ts (whose comment warns "NOT `new Date('2026-04-30')` which produces UTC midnight and silently shifts the value by one day"), or the shared `formatDate` which formats with `timeZone: "UTC"`.

> Verifier: Line 133 of expense-table.tsx runs `format(new Date(expense.expense_date), "MMM d, yyyy")` where `expense_date` is a Postgres `date NOT NULL` column (base_schema.sql:1274) returned by PostgREST as a "YYYY-MM-DD" string; per ES spec `new Date("2026-07-11")` parses as UTC midnight, and date-fns `format` renders local time, so in any negative-UTC-offset zone (all US) it displays "Jul 10, 2026" — one day early. The repo's own canonical fix `parseLocalYmd` (src/lib/formatters/date.ts:87) exists precisely to avoid this, its comment explicitly warning against `new Date('2026-04-30')` UTC-midnight par

### [MEDIUM] `src/app/(owner)/financials/expenses/page.tsx:49`
**Expense pagination never resets when search or category filters change, leaving the user on an out-of-range page with an empty, unrecoverable table.**

The `useEffect(() => { setCurrentPage(1); }, [])` at lines 49-51 runs only on mount (where currentPage is already 1 — it is dead code); nothing resets `currentPage` when `searchQuery`/`categoryFilter` shrink `filteredExpenses`. With 31+ expenses, navigate to page 3, then type a search matching 5 rows: totalPages becomes 1, `paginatedExpenses = slice(30,45) = []`, the pagination footer is hidden (`totalPages > 1` is false), and the "No expenses match your filters" state doesn't show (filteredExpenses.length is 5) — the table body is simply blank with the toolbar claiming "5 expenses". The leases store shows the canonical fix: `setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 })` (src/stores/leases-store.ts lines 116-122).

> Verifier: page.tsx:49-51 is a mount-only `useEffect(() => setCurrentPage(1), [])` (dead code — currentPage initializes to 1), and neither `setSearchQuery`/`setCategoryFilter` (passed raw at lines 162-163) nor `clearFilters` (lines 53-56) resets `currentPage`, with no clamping anywhere. The failure scenario is exact: on page 3 with a search matching 5 rows, `paginatedExpenses = slice(30,45) = []`, expense-table.tsx hides the pagination footer (line 193, `totalPages > 1` is false) and skips the no-match state (line 163 requires `filteredExpenses.length === 0`), so the table body renders blank while the to

### [MEDIUM] `src/app/(owner)/financials/expenses/page.tsx:134`
**The "Export CSV" button on the Expenses page has no onClick handler and does nothing when clicked.**

Lines 134-137 render `<Button variant="outline"><Download .../>Export CSV</Button>` with no handler, no `asChild` link, and no wrapping form — clicking it is a silent no-op, presenting a dead primary action to users. Either wire it to a CSV export of `filteredExpenses` (the financial analytics page's `ExportButtons` component is the existing pattern) or remove the button.

> Verifier: Lines 134-137 of src/app/(owner)/financials/expenses/page.tsx render `<Button variant="outline"><Download .../>Export CSV</Button>` with no onClick, no asChild link, and no enclosing form; grep across the expenses directory shows the only "Export" reference is the button label itself — no export handler or CSV utility exists anywhere in the route, so clicking is a guaranteed silent no-op. The shadcn Button adds no default behavior, confirming the dead action.

### [MEDIUM] `src/app/(owner)/tenants/components/tenant-details.client.tsx:39`
**Move-out validation rejects today's date as "in the past" for every user west of UTC.**

`validateMoveOutDate` parses the `<Input type="date">` value with `new Date(dateString)` (line 31), yielding UTC midnight, then compares it to local midnight (`today.setHours(0,0,0,0)`, line 37). In America/Chicago, local midnight on 2026-07-11 is 2026-07-11T05:00Z, while the parsed date is 2026-07-11T00:00Z, so `date < today` is true and choosing today's date as the move-out date always errors with "Move out date cannot be in the past". Correct is parsing the picker value with `parseLocalYmd` from `#lib/formatters/date` so both sides are local midnight.

> Verifier: Reproduced concretely: in TZ America/Chicago, `new Date("2026-07-11")` (from the `<Input type="date">` at move-out-dialog.tsx:62) yields 2026-07-11T00:00:00Z while `today.setHours(0,0,0,0)` yields 2026-07-11T05:00:00Z, so `date < today` at tenant-details.client.tsx:39 is true and selecting today's date throws "Move out date cannot be in the past" for every user west of UTC. The proposed fix is valid — `parseLocalYmd` exists at src/lib/formatters/date.ts:87 and returns local-midnight dates matching the comparison side.

### [MEDIUM] `src/components/maintenance/detail/work-order-template.ts:30`
**Work-order PDF shows scheduled dates and expense dates one day early in negative-UTC-offset timezones via a local formatDate that lacks UTC handling.**

The file defines its own `formatDate` doing `new Date(iso).toLocaleDateString("en-US", {...})` without `timeZone: "UTC"`. It is applied to `expense.expense_date` (line 54) and `request.scheduled_date` (line 116), both Postgres `date` columns (base_schema.sql lines 1274 and 1397), so `new Date('2026-07-11')` is UTC midnight and renders as July 10 for any US landlord — a printed legal/work document with a wrong date. Sibling of the expense-table bug; the shared `formatDate` from `#lib/formatters/date` (which every other maintenance view uses) already formats date-only values with `timeZone: "UTC"` and should be used here.

> Verifier: `formatDate` at src/components/maintenance/detail/work-order-template.ts:30 calls `toLocaleDateString("en-US", {...})` without `timeZone: "UTC"`, and the caller (maintenance-details.client.tsx:127) passes raw `expense_date`/`scheduled_date` values from Postgres `date` columns (base_schema.sql:1274, :1397); executed proof: `TZ=America/Chicago node -e '...new Date("2026-07-11").toLocaleDateString(...)'` prints "July 10, 2026". The shared `#lib/formatters/date` formatter already applies `timeZone: "UTC"` (src/lib/formatters/date.ts:45-46), so the local copy is both wrong and duplicative.

### [MEDIUM] `src/components/tenants/tenant-table.tsx:42`
**TenantTable keeps a local pageIndex that never resets when the filtered tenant list shrinks, showing an empty table with no pagination controls.**

`tenants` is the already-filtered list from `tenants.tsx` (line 198 passes `filteredTenants`), while `pageIndex` (line 42) is component state with no sync. On pageIndex 2 (tenants 21-30), typing a search that matches 3 tenants makes `paginatedTenants = slice(20,30) = []` and `totalPages = 1`, which hides the Previous/Next footer (line 274 `totalPages > 1`); the "No tenants match your filters" banner in the parent only shows when filteredTenants.length === 0, so the user is stuck staring at an empty table until they clear the search. Same bug class as the expenses page; fix is resetting pageIndex when the filter inputs change.

> Verifier: `tenant-table.tsx` line 42 declares `pageIndex` as local state with no reset effect, no clamping against `tenants.length`, and the parent (`tenants.tsx` line 198) passes `filteredTenants` without a filter-keyed `key`, so the component never remounts on search changes. With pageIndex=2 and a search matching 3 tenants, `paginatedTenants = sortedTenants.slice(20,30) = []` and `totalPages = ceil(3/10) = 1`, which hides the footer via `totalPages > 1` (line 274) — leaving zero rows and no Previous button — while the parent's "No tenants match your filters" banner (line 222) requires `filteredTenant

### [LOW] `src/app/(owner)/analytics/financial/page.tsx:105`
**"Download insight summary" is an anchor with href="#" that downloads nothing and scrolls the page to the top.**

Lines 103-109 render `<a href="#"><FileDown .../>Download insight summary</a>` with no handler; clicking performs the default `#` navigation (scroll-to-top) and no download, a dead control presented as a feature next to the working `ExportButtons`. Either implement the summary export or remove the link.

> Verifier: Lines 103-109 of src/app/(owner)/analytics/financial/page.tsx render `<a href="#">` with a FileDown icon and "Download insight summary" label, with no onClick, no download attribute, and no real href — the default `#` navigation scrolls to top and downloads nothing, unlike the adjacent functional `ExportButtons` (line 102). It is a dead control presented as a feature, exactly as claimed.

### [LOW] `src/components/leases/table/lease-utils.ts:114`
**transformLease parses the date-only lease end_date as UTC midnight and compares it to local now, shifting the "expiring" window and expired/active boundary by the timezone offset.**

`new Date(lease.end_date)` on a `YYYY-MM-DD` string yields UTC midnight; comparing to local `new Date()` (lines 115-121) means in US timezones a lease ending today fails `endDate > now` from the previous evening onward, and the 30-day "expiring" badge boundary is off by up to a day. The sibling utility `getDaysUntilExpiry` in src/components/leases/detail/lease-detail-utils.ts (line 243) already uses `parseLocalYmd` + `differenceInCalendarDays` for exactly this; the table transform should do the same.

> Verifier: `leases.end_date` is a Postgres `date` column (base_schema.sql line 1301), so PostgREST delivers `"YYYY-MM-DD"`; `new Date("YYYY-MM-DD")` at lease-utils.ts:114 parses to UTC midnight, and the `endDate > now` / `endDate <= thirtyDaysFromNow` comparisons at lines 117-121 use local `new Date()`, so in UTC-5 a lease ending 2026-07-11 (still `active` in DB — `expire_leases()` uses `end_date < current_date`) yields endDate=2026-07-11T00:00Z which fails `endDate > now` from 19:00 local on 07-10 onward, dropping the "expiring" badge on the lease's final day and shifting the 30-day window entry by up t

### [LOW] `src/components/reports/sections/year-end-report-section.tsx:210`
**Render-time in-place .sort() mutates the expenseByCategory array owned by the TanStack Query cache.**

`yearEndData?.expenseByCategory.sort((a, b) => b.amount - a.amount)` sorts the array in place during render; `yearEndData` is `useYearEndSummary(selectedYear)` query data (src/app/(owner)/reports/year-end/page.tsx lines 70-71), so this mutates the shared cache entry rather than a copy, violating cache immutability (structural sharing/change detection can silently observe reordered data, and any other consumer of the same cache entry sees a mutated array). Correct is `[...yearEndData.expenseByCategory].sort(...)` or `toSorted(...)`, as the financials page already does with `[...monthlyMetrics].sort(...)`.

> Verifier: Line 209-210 of src/components/reports/sections/year-end-report-section.tsx calls `.sort()` directly on `yearEndData?.expenseByCategory`, and `yearEndData` is the raw TanStack Query cache entry — `useYearEndSummary` (src/hooks/api/use-reports.ts:43) returns `useQuery(reportAnalyticsQueries.yearEnd(year))` whose queryFn's returned object (report-analytics-keys.ts:427-445) is stored in the cache with no `select`/clone, and page.tsx:224 passes `data` straight through. This mutates cache-owned data during render (Rules-of-React violation with `reactCompiler: true` in next.config.ts:48), and a seco


## Type boundaries (RPC / PostgREST) (9)

### [HIGH] `src/hooks/api/query-keys/property-keys.ts:28`
**propertyQueries.detail() selects a column subset but casts to full `Property`, causing every property edit to silently wipe acquisition_cost and acquisition_date in the DB.**

`PROPERTY_SELECT_COLUMNS` omits `acquisition_cost` and `acquisition_date` (both real `properties` columns), yet `detail()` returns `data as Property` (line 122) so the fields are typed `number|null`/`string|null` but are `undefined` at runtime. The edit pages (`src/app/(owner)/properties/[id]/edit/page.tsx:23` and the `@modal/(.)edit` route) feed this row into `PropertyForm`, whose defaults collap

> Verifier: PROPERTY_SELECT_COLUMNS (property-keys.ts:27-28) omits acquisition_cost/acquisition_date yet detail() returns `data as Property` (line 122), and both edit routes ([id]/edit/page.tsx:23 and @modal/(.)edit/[id]/page.tsx:33) feed that row into PropertyForm, whose defaults turn the runtime-undefined fields into null/"" (property-form.client.tsx:111-115) and handleEditSubmit then sends explicit `{ acquisition_cost: null, acquisition_date: null }` (lines 218-223), which omitUndefined preserves. Concrete failure: owner creates a property with acquisition_cost=250000 and acquisition_date (create path 

### [HIGH] `src/hooks/api/use-analytics.ts:87`
**`jsonObject<FinancialAnalyticsPageData>(data)` asserts a shape `get_financial_overview` has never returned, so /analytics/financial permanently renders zeroed metrics and empty charts.**

The RPC (latest body in `supabase/migrations/20260708132045_bill02_date_params_expense_summary_and_financial_overview.sql`, same shape since 20260224220902) returns `{ overview, highlights }`, but the boundary types it as `FinancialAnalyticsPageData` = `{ metrics, breakdown, netOperatingIncome, billingInsights, invoiceSummary, monthlyMetrics, leaseAnalytics }` — every typed field is `undefined` at

> Verifier: Live prod `pg_get_functiondef` confirms the sole `get_financial_overview(uuid,date,date)` returns only `jsonb_build_object('overview', ..., 'highlights', ...)` (same shape in migrations 20260224220902 and 20260708132045), while `jsonObject` (src/lib/rpc-shape.ts:21-29) merely rejects null/array/primitive and blindly casts, so every `FinancialAnalyticsPageData` field (metrics/breakdown/netOperatingIncome/billingInsights/invoiceSummary/monthlyMetrics/leaseAnalytics) is `undefined` at runtime. The consumer (src/app/(owner)/analytics/financial/page.tsx:70-86) destructures `data || {}` with zero/em

### [HIGH] `src/hooks/api/use-analytics.ts:119`
**`jsonObject<MaintenanceInsightsPageData>(data)` asserts keys `get_maintenance_analytics` never emits, so the maintenance insights section always renders empty.**

The RPC (latest body in `supabase/migrations/20260304120000_rpc_auth_guards.sql:1043`) returns `{ total_requests, open_requests, avg_resolution_hours, by_status, by_priority, monthly_cost, vendor_performance, ... }`, but the boundary types it as `MaintenanceInsightsPageData` = `{ metrics, categoryBreakdown, costTrends, costBreakdown, trends, responseTimes, preventiveMaintenance }` — all `undefined

> Verifier: The latest RPC body (supabase/migrations/20260304120000_rpc_auth_guards.sql:1109-1135, newest migration defining it) builds only snake_case/legacy keys (total_requests, open_requests, by_status, by_priority, monthly_cost, vendor_performance, trendsOverTime, etc.), while `jsonObject` (src/lib/rpc-shape.ts:21) only checks "is a non-array object" before casting to `MaintenanceInsightsPageData` whose keys (metrics, categoryBreakdown, costTrends, costBreakdown, trends, responseTimes, preventiveMaintenance) are never emitted. Its sole consumer, MaintenanceInsightsSection (maintenance-insights-sectio

### [MEDIUM] `src/hooks/api/query-keys/billing-keys.ts:48`
**Raw Stripe invoice statuses ('open', 'draft', 'void', 'uncollectible') are cast into the 4-value `BillingHistoryItem["status"]` union without validation and leak to the UI.**

`get_user_invoices` passes `i.status::text` straight through from `stripe.invoices` (supabase/migrations/20260305120000_get_user_invoices_rpc.sql:47); Stripe's invoice statuses are draft/open/paid/void/uncollectible. Only "paid" is remapped ("succeeded"); everything else is cast to `"succeeded"|"failed"|"pending"|"cancelled"`, a union none of those values belong to. Consumer billing-history-sectio

> Verifier: The RPC (20260305120000_get_user_invoices_rpc.sql) returns `i.status::text` verbatim from stripe.invoices (draft/open/paid/void/uncollectible); billing-keys.ts:46-48 remaps only "paid"→"succeeded" and asserts everything else into `"succeeded"|"failed"|"pending"|"cancelled"` — a union none of the remaining Stripe values belong to, violating CLAUDE.md's mapper rule to validate enum-shaped fields (Zod safeParse) at RPC boundaries. Consumer billing-history-section.tsx:17-28 branches on "failed"/"cancelled" (unreachable — those values can never arrive) and falls through to rendering the raw lowerca

### [MEDIUM] `src/hooks/api/query-keys/expense-keys.ts:277`
**Local all-optional `Expense` interface declares fields that are never selected or don't exist on the `expenses` table, so the expenses table UI renders fabricated fallbacks on every row.**

The local `Expense` type (duplicating canonical `ExpenseRecord = Tables<"expenses">` in src/types/core.ts:125, a rule-3 violation) declares `description`, `category`, `property_name`, `property_id` — but `EXPENSE_SELECT` (line 133) never selects `description`, and `category`/`property_name`/`property_id` are not columns of `expenses` at all. The raw `(data ?? []) as Expense[]` casts (lines 192, 23

> Verifier: `EXPENSE_SELECT` (expense-keys.ts:133) selects only `id, amount, expense_date, vendor_name, maintenance_request_id, status, created_at`, while supabase.ts shows `expenses` has a real `description` column (never selected) and no `category`/`property_name`/`property_id` columns at all; the `(data ?? []) as Expense[]` casts (lines 192, 236, 261) hide this, and the interface duplicates `ExpenseRecord = Tables<"expenses">` (core.ts:125, rule-3 violation). Consequence is concrete: expense-table.tsx renders "Expense" (line 139), "--" (149) and the "other" badge (152) for every row, and page.tsx's cat

### [MEDIUM] `src/hooks/api/query-keys/financial-keys.ts:180`
**`financialQueries.monthly()` maps `row.expenses`/`row.net_income` keys that `get_revenue_trends_optimized` never emits, silently defaulting them to 0.**

The latest RPC body (`supabase/migrations/20260709060533_data02_exclude_inactive_properties_from_occupancy_revenue_trends.sql:87`) emits only `{ month, revenue, collections, outstanding }`, so `expenses` and `net_income` are always 0 and `cash_flow` always equals raw revenue. Consumer `/financials` (src/app/(owner)/financials/page.tsx:33-38) computes `expenseChange` from these rows, so the month-o

> Verifier: The latest RPC body (20260709060533_data02...sql:114-119) builds rows with only `month`/`revenue`/`collections`/`outstanding`, so the mapper's `row.expenses ?? row.total_expenses ?? 0` and `row.net_income ?? 0` (financial-keys.ts:181-185) always yield 0 and `cash_flow` always equals raw revenue. Consumer src/app/(owner)/financials/page.tsx:34-37 computes `expenseChange` from these rows (guard `previous.expenses > 0` never passes), so FinancialsSummaryStats permanently shows a fabricated "+0.0% vs last month" expense trend for every owner with real expense data.

### [MEDIUM] `src/hooks/api/query-keys/report-keys.ts:125`
**`reportQueries.monthlyRevenue()` maps phantom `expenses`/`profit`/`net_income`/`property_count`/`unit_count`/`occupied_units` keys, so the /reports/analytics "Profit" chart series permanently flatlines at 0.**

`get_revenue_trends_optimized` emits only `{ month, revenue, collections, outstanding }` (verified in 20260709060533), so `RevenueData.expenses`, `profit`, `propertyCount`, `unitCount`, and `occupiedUnits` are always 0 via `Number(row.X ?? 0)` defaults. The consumer chart (src/app/(owner)/reports/analytics/analytics-revenue-chart.tsx:107 `dataKey="profit"`) advertises "Revenue, expenses, and profi

> Verifier: `get_revenue_trends_optimized` emits only `month`/`revenue`/`collections`/`outstanding` in both its original definition (20260224220902_create_missing_analytics_rpcs.sql:242-248) and its latest redefinition (20260709060533:114-119, which even hardcodes `collections: 0`), so the mapper's `row.expenses`, `row.profit ?? row.net_income`, `row.property_count`, `row.unit_count`, `row.occupied_units` reads at report-keys.ts:126-130 always hit `undefined ?? 0` = 0. The consumer chain is live — reports/analytics/page.tsx:53 `useMonthlyRevenue` → use-reports.ts:14 → this queryFn → analytics-revenue-char

### [MEDIUM] `src/hooks/api/query-keys/subscription-keys.ts:61`
**`users.subscription_status` value 'expired' is cast into a `SubscriptionStatusResponse["subscriptionStatus"]` union that does not contain it, so expired-trial owners get unhandled status in every consumer.**

The nightly `expire_trials` cron (supabase/migrations/20260419230000_trial_model.sql:78) persists `subscription_status='expired'`, and expired-trial users typically have no `stripe_customer_id`, so they hit exactly this branch: `localStatus as SubscriptionStatusResponse["subscriptionStatus"]` (also lines 88 and 112). The union (src/types/api-contracts.ts:330-340) omits "expired", so no consumer ha

> Verifier: `expire_trials()` (supabase/migrations/20260419230000_trial_model.sql:78) persists `subscription_status='expired'`, and expired-trial users without `stripe_customer_id` hit the line-57 branch where `localStatus as SubscriptionStatusResponse["subscriptionStatus"]` (also lines 88/112) launders a real prod value into a union (src/types/api-contracts.ts:330-340) that omits "expired" — an unvalidated cast at the PostgREST boundary where CLAUDE.md mandates typed mappers. Consumers therefore can never exhaustively handle it: billing-settings.tsx `getStatusVariant("expired")` falls to the misleading "

### [MEDIUM] `src/hooks/api/query-keys/template-definition-keys.ts:48`
**The `custom_fields` jsonb column is cast directly to `DynamicField[]` with no runtime validation.**

`(data?.custom_fields ?? []) as DynamicField[]` pushes an arbitrary stored jsonb payload into typed land — no array check, no per-field validation of the `DynamicField` shape (id/label/type). A legacy or malformed row (e.g. an object instead of an array, or entries missing `type`) flows into the dynamic-form renderer typed as a valid `DynamicField[]`, producing broken form fields instead of a loud

> Verifier: Line 48 pushes an unvalidated jsonb payload into typed land via a bare cast, violating CLAUDE.md's "typed mapper at every boundary" rule (mapDocumentRow/Zod safeParse pattern); the column has no shape CHECK constraint and is owner-writable via PostgREST, and a non-array payload concretely crashes useTemplateDefinition (`customFields.forEach` TypeError, spread failure) instead of failing loudly at the boundary.


## Dashboard UX (24)

### [HIGH] `src/app/(owner)/leases/layout.tsx:9`
**The leases layout never renders the `@modal` parallel-route slot, so the New/Edit lease modals under `leases/@modal/` can never be displayed.**

Same defect class as properties/layout.tsx: the layout accepts only `{ children }`, so the `(.)new` and `(.)edit/[id]` interceptor pages in `leases/@modal/` resolve into a slot that is never rendered. Soft-navigating via the "New Lease" links on the leases list (leases/page.tsx:204 and 231, `href="/leases/new"`) triggers the interception but shows nothing — URL changes to /leases/new while the lis

> Verifier: `leases/layout.tsx:9` destructures only `{ children }` and returns `<>{children}</>`, dropping the `modal` prop that Next.js passes for the same-level `leases/@modal` slot (which contains `(.)new/page.tsx` with RouteModal+LeaseForm, `(.)edit/[id]`, and `default.tsx`); the only layout rendering a `modal` slot is `(owner)/layout.tsx`, which maps to `(owner)/@modal` (tenants interceptors only). Soft navigations to `/leases/new` exist (`<Link href="/leases/new">` twice in leases/page.tsx and `router.push("/leases/new")` at dashboard/page.tsx:82), and interception is resolved by the router regardle

### [HIGH] `src/app/(owner)/maintenance/@modal/(.)new/page.tsx:7`
**The maintenance segment has no layout.tsx at all, so its `@modal` slot (New/Edit maintenance modals) has no layout to render it and can never be displayed.**

`src/app/(owner)/maintenance/` contains `@modal/(.)new`, `@modal/(.)edit/[id]`, and `@modal/default.tsx` but no `maintenance/layout.tsx`; parallel-route slots are only shown when the same-level layout renders the slot prop, so these modal pages are unreachable dead code. Soft navigation to /maintenance/new (links in maintenance-view.client.tsx:137/161, maintenance-view-tabs.tsx:41, maintenance-tab

> Verifier: src/app/(owner)/maintenance/ contains @modal/(.)new, @modal/(.)edit/[id], and @modal/default.tsx but no layout.tsx, and the only layout rendering a modal slot ((owner)/layout.tsx:61-74) is fed solely by (owner)/@modal — so the maintenance modal pages are unrenderable dead code. Soft navigation from the cited links (maintenance-view.client.tsx:137/161, maintenance-view-tabs.tsx:41, maintenance-table.client.tsx:88, dashboard/page.tsx:90) is claimed by the interceptor into the unrendered slot, changing the URL with nothing visible.

### [HIGH] `src/app/(owner)/properties/layout.tsx:9`
**The properties layout never renders the `@modal` parallel-route slot, so every modal under `src/app/(owner)/properties/@modal/` can never be displayed.**

`properties/@modal/` defines `(.)new`, `(.)edit/[id]`, and `default.tsx`, but the segment layout destructures only `{ children }` and returns `<>{children}</>` — the `modal` slot prop is silently dropped (only the root `(owner)/layout.tsx` renders a `modal` slot, and that maps solely to `(owner)/@modal`, i.e. the tenants interceptors). Next.js still activates the interception on soft navigation: c

> Verifier: `properties/layout.tsx:9` destructures only `{ children }` and returns `<>{children}</>`, while `properties/@modal/` defines `(.)new`, `(.)edit/[id]`, and `default.tsx` — parallel slots bind to the layout at their own segment level, and only the root `(owner)/layout.tsx` renders a `modal` prop (bound to `(owner)/@modal`, i.e. the tenants interceptors), so the properties modals are structurally unrenderable. Worse than dead code: the `(.)new` interceptor still claims soft navigations to `/properties/new` (router.push in properties/page.tsx:141 and dashboard/page.tsx:78, Links in dashboard-empty

### [HIGH] `src/app/(owner)/units/layout.tsx:9`
**The units layout never renders the `@modal` parallel-route slot, so the New/Edit unit modals under `units/@modal/` can never be displayed.**

Sibling instance of the properties/leases layout defect: the layout returns only `children`, dropping the `modal` slot that contains `units/@modal/(.)new` and `(.)edit/[id]`. The "Add Unit" link on the units list (units/page.tsx:271, `href="/units/new"`) soft-navigates into the interceptor whose output is never rendered, so nothing visibly happens until the user hard-reloads; the full pages at uni

> Verifier: `src/app/(owner)/units/layout.tsx:9` destructures only `{ children }` and returns `<>{children}</>`, so the `modal` slot prop that Next.js passes for `units/@modal/` (containing `(.)new/page.tsx`, `(.)edit/[id]`, and `default.tsx`) is silently dropped — contrast `src/app/(owner)/layout.tsx:61-74`, which correctly accepts and renders its `modal` slot. Clicking the units list's `<Link href="/units/new">` (page.tsx:271) soft-navigates into the interceptor, whose RouteModal output is never mounted, so the URL changes but nothing appears until a hard reload hits the full page at `units/new/page.tsx

### [HIGH] `src/components/billing/subscription-status-banner.tsx:94`
**The past_due and unpaid/canceled subscription banners link to `/owner/billing`, a route that does not exist, so the billing-recovery CTA 404s.**

Lines 94 ("Update billing") and 112 ("Reactivate") use `href="/owner/billing"`, but `(owner)` is a route group that never appears in the URL and there is no `owner/billing` page anywhere under src/app — billing lives at `/settings?tab=billing` and `/billing/plans`. A user whose payment fails mid-session (useSubscriptionStatus refetches client-side, so the banner appears without the proxy redirect 

> Verifier: `(owner)` is a route group (URL-invisible), there is no `src/app/owner/` directory, no `page.tsx` at `(owner)/billing/` (only `plans/` and `checkout/`), and no redirect/rewrite for `/owner/billing` in next.config.ts or proxy.ts — `/owner` isn't even in PRIVATE_ROUTE_PREFIXES, so it falls through to not-found.tsx as a 404. The banner is mounted in `src/app/(owner)/owner-dashboard-layout.tsx` across all owner pages (including `/billing/plans`, which is exempt from the subscription gate, so a past_due user reliably reaches it), and both the line-94 "Update billing" and line-112 "Reactivate" links

### [MEDIUM] `src/app/(owner)/leases/@modal/(.)edit/[id]/page.tsx:14`
**The edit-lease interceptor targets `/leases/edit/[id]` instead of `/leases/[id]/edit`, and it also lacks the terms-lock gate its full-page sibling enforces.**

Sibling instance of the properties `(.)edit/[id]` mis-nesting: all edit links go to `/leases/${id}/edit` (leases/page.tsx:161, lease-header.tsx:200) so this interceptor never matches. It has additionally drifted from its full-page sibling `leases/[id]/edit/page.tsx`, which bounces to the read-only detail via `isLeaseTermsLocked` when a lease is pending_signature/tenant-signed (lines 25-30 there); 

> Verifier: The interceptor's `(.)edit/[id]` path matches `/leases/edit/[id]`, but all edit navigations use `/leases/${id}/edit` (leases/page.tsx:161, lease-header.tsx:200) and no route or link for `/leases/edit/[id]` exists, so the modal is unreachable dead code. It also renders `LeaseForm mode="edit"` with no `isLeaseTermsLocked` check, unlike the full-page sibling `leases/[id]/edit/page.tsx:25-30` which redirects locked (pending_signature/tenant-signed) leases — a latent bypass if the routing were fixed without adding the gate. Severity is medium since no user-reachable wrong behavior exists today.

### [MEDIUM] `src/app/(owner)/leases/@modal/(.)new/page.tsx:20`
**The new-lease modal renders a plain single-step `LeaseForm` while its full-page sibling `/leases/new` renders the multi-step `LeaseCreationWizard`, dropping the tenant/property preselection handoff.**

The full page (leases/new/page.tsx:23) mounts `LeaseCreationWizard`, which reads `property`/`unit`/`tenant` query params for preselection (lease-creation-wizard.tsx:64-66, FORMFIX-04) and navigates to the created lease's detail on success; the modal mounts `LeaseForm mode="create"`, which reads no search params and lands on `/leases` (lease-form.tsx:94). `add-tenant-form.tsx:89` pushes `/leases/ne

> Verifier: Verified divergence: `leases/new/page.tsx:23` mounts `LeaseCreationWizard` which seeds selection from `?property/?unit/?tenant` (lease-creation-wizard.tsx:57-71, FORMFIX-04) and routes to `/leases/{id}` on success, while the intercepted modal mounts bare `<LeaseForm mode="create" />` which has zero `useSearchParams` usage (grep confirms) and lands on `/leases` (lease-form.tsx:94). `add-tenant-form.tsx:89` does `router.push('/leases/new?tenant=…&property=…')` — a soft navigation that the `(.)new` interceptor claims — after toasting "Complete the lease to finish assigning this tenant to the unit

### [MEDIUM] `src/app/(owner)/maintenance/@modal/(.)edit/[id]/page.tsx:14`
**The edit-maintenance interceptor targets `/maintenance/edit/[id]` instead of the real route `/maintenance/[id]/edit`, so it can never match a navigation.**

Sibling instance of the `(.)edit/[id]` mis-nesting class: edit actions navigate to `/maintenance/${id}/edit` (maintenance-details.client.tsx:213, columns.tsx:248, maintenance-header-card.tsx:89), which this interceptor's `/maintenance/edit/[id]` path never matches. The modal is dead code and has also drifted cosmetically from its sibling page (no "Edit maintenance request" heading/description that

> Verifier: The interceptor at `@modal/(.)edit/[id]` matches only `/maintenance/edit/[id]`, but no such route exists (real page is `maintenance/[id]/edit/page.tsx`) and grep confirms zero navigations to that path — all three edit actions (maintenance-details.client.tsx:213, columns.tsx:248, maintenance-header-card.tsx:89) push `/maintenance/${id}/edit`, which an interceptor would need to be `(.)[id]/edit` to catch. The modal is therefore unreachable dead code (the intended intercept UX never fires; users always get the full-page edit), matching the known `(.)edit/[id]` mis-nesting class from the v8.0 audi

### [MEDIUM] `src/app/(owner)/properties/@modal/(.)edit/[id]/page.tsx:23`
**The edit-property interceptor is nested as `(.)edit/[id]`, which intercepts the non-existent URL `/properties/edit/[id]` instead of the real edit route `/properties/[id]/edit`.**

`(.)` resolves the intercepted path relative to `/properties`, so this folder intercepts `/properties/edit/[id]` — a URL nothing links to and that 404s on hard navigation — while every edit action navigates to `/properties/[id]/edit` (properties/page.tsx:149, portfolio-columns.tsx:196, property-details.client.tsx:122). Even independent of the unrendered-slot layout bug, this interceptor can never 

> Verifier: The `(.)` marker matches at the `/properties` level (the `@modal` slot doesn't count as a segment), so `@modal/(.)edit/[id]` intercepts `/properties/edit/[id]` — a URL no code links to (grep for `properties/edit` across src returns nothing), while all three edit actions navigate to `/properties/${id}/edit` (page.tsx:149 router.push, property-details.client.tsx:122 Link). The interceptor therefore never fires and the modal is dead code (edit still works via the full page at `properties/[id]/edit/page.tsx`), contradicting the file's own doc comment; the working tenants interceptor confirms the c

### [MEDIUM] `src/app/(owner)/properties/@modal/(.)new/page.tsx:19`
**After a successful create in the new-property modal, the modal neither closes nor navigates — the form just resets to blank while the dialog stays open.**

The modal renders `PropertyForm mode="create" showSuccessState={false}` with no `onSuccess` prop; in property-form.client.tsx the create path only does `setIsSubmitted` when `showSuccessState` is true and then `form.reset()`, and `onSuccess?.()` is a no-op here, so nothing dismisses the RouteModal (which closes only via `router.back()`). The full-page sibling shows `PropertyFormSuccessState` with 

> Verifier: Line 19 passes `showSuccessState={false}` and no `onSuccess`, so in property-form.client.tsx the create path skips `setIsSubmitted` (line 194-196), unconditionally runs `form.reset()` (line 197), and `onSuccess?.()` (line 131) is a no-op — unlike the edit path, which calls `router.back()` when `onSuccess` is absent (lines 238-240), the create path never dismisses. RouteModal renders `<Dialog open>` and closes solely via `onOpenChange → router.back()` (route-modal.tsx lines 59-63, 82), so a successful create leaves the dialog open showing an emptied form; the flow is currently latent only becau

### [MEDIUM] `src/components/documents/documents-section.tsx:174`
**Document deletion is a single-click permanent destructive action with no confirmation dialog.**

`handleDelete` fires `deleteMutation.mutateAsync({ id, storagePath })` — which removes both the DB row and the storage object — directly from the "Remove" button click in the preview dialog (document-row.tsx:140 `onClick={() => onDelete(doc)}`). Every other destructive flow in the dashboard (property, unit, lease, tenant, maintenance, image deletes) is guarded by an AlertDialog or confirm(); one m

> Verifier: `handleDelete` (documents-section.tsx:174) calls `deleteMutation.mutateAsync` directly from the Remove button's `onClick={() => onDelete(doc)}` (document-row.tsx:140) with no AlertDialog or confirm(); the mutation (document-keys.ts:329) deletes the DB row then the storage blob, which is irreversible. Sibling destructive flows do confirm — e.g. `property-units-delete-dialog.tsx`, `property-image-gallery.tsx`, `terminate-lease-dialog.tsx`, and `maintenance/table/columns.tsx` all wrap deletes in AlertDialog — so one mis-click on the adjacent-to-nothing Remove button permanently destroys an upload

### [MEDIUM] `src/components/leases/detail/lease-sidebar.tsx:53`
**The "View Unit Details" quick action on the lease detail page links to `/properties/[id]/units/[unitId]`, a route that does not exist.**

The route list contains `/properties/[id]`, `/properties/units`, and `/units/[id]/edit`, but no `/properties/[id]/units/[unitId]` (nor even a `/units/[id]` detail page). Every lease with a unit renders this button, and clicking it 404s. Correct targets would be `/units/${unit.id}/edit` or the parent property detail `/properties/${unit.property_id}`.

> Verifier: Line 53 renders `<Link href={`/properties/${unit.property_id}/units/${unit.id}`}>`, but the only routes under `src/app/(owner)/properties/` are `page.tsx`, `new`, `units` (static), `[id]`, `[id]/edit`, and modal slots — there is no `[id]/units/[unitId]` segment nor any catch-all, and no `/units/[id]` detail page exists either (only `/units/[id]/edit`). The button renders for every lease whose `unit_id` resolves via `useUnitList()` (lease-details.client.tsx:77,205), so clicking it always yields a Next.js 404.

### [MEDIUM] `src/components/profiles/owner/recent-activity-section.tsx:17`
**The profile page's "View All" activity button pushes `/activity`, a route that does not exist, and the section shows hardcoded fake activity entries.**

There is no `activity` page anywhere under src/app, so clicking "View All" on the profile's Recent Activity card lands on the 404 page. The three "recent activity" rows beneath it ("Updated profile information", "Viewed properties dashboard", "Logged in to account" with static "Recently"/"Today" timestamps) are hardcoded placeholders presented as real user activity. Either back the section with re

> Verifier: Line 17 does `router.push("/activity")` but no `activity` route exists anywhere under src/app (only `financials/cash-flow/cash-flow-activity.tsx`, a component, not a route) and no redirect covers it, so clicking "View All" lands on the 404 page; the component is live, rendered at `src/app/(owner)/profile/page.tsx:249`. Lines 24-81 are three fully hardcoded rows ("Updated profile information"/"Recently", "Viewed properties dashboard"/"Today", "Logged in to account"/"Today") with no data fetch, presented as real user activity.

### [LOW] `src/app/(owner)/analytics/financial/_components/breakdown-list.tsx:18`
**The "View details" link in every financial breakdown card is a dead `Link href="#"`.**

Each BreakdownList (rendered for revenue/expense breakdowns on the financial analytics page) shows a "View details" affordance that navigates nowhere. Sibling instance of the `href="#"` class found on the parent page; point it at a real drill-down route or drop the link.

> Verifier: Line 18 of breakdown-list.tsx renders `<Link href="#">View details</Link>`, and BreakdownList is instantiated twice on the live financial analytics page (src/app/(owner)/analytics/financial/page.tsx lines 155 and 173), so clicking "View details" on either the revenue or expense breakdown just appends `#` and navigates nowhere. The claimed sibling `href="#"` also exists at page.tsx line 105, confirming the dead-affordance class.

### [LOW] `src/app/(owner)/financials/expenses/_components/expense-table.tsx:178`
**The expenses list empty states are ad-hoc div blocks instead of the `Empty` compound component.**

Sibling instance of the ad-hoc empty-state class: both the no-expenses state (lines 178-190) and the "No expenses match your filters" state (lines 163-175) are hand-rolled centered divs with a raw `<button>`, not the mandated `Empty` compound from `#components/ui/empty`.

> Verifier: Lines 163-175 ("No expenses match your filters" with a raw `<button>`) and 178-190 ("No expenses yet") are hand-rolled centered divs; the file imports nothing from `#components/ui/empty`. CLAUDE.md Components mandates the `Empty` compound from `#components/ui/empty` for list-page empty states, and sibling list pages (units/page.tsx, leases/page.tsx) do use it.

### [LOW] `src/app/(owner)/units/@modal/(.)edit/[id]/page.tsx:11`
**The edit-unit interceptor targets `/units/edit/[id]` instead of the real route `/units/[id]/edit`, so it can never match a navigation.**

Sibling instance of the `(.)edit/[id]` mis-nesting class: the units list links to `/units/${unit.id}/edit` (units/page.tsx:193), which resolves to the full page at `units/[id]/edit/page.tsx`, never to this interceptor's `/units/edit/[id]` path. The intended edit-in-modal UX is unreachable; correct nesting is `@modal/(.)[id]/edit`.

> Verifier: The interceptor lives at `units/@modal/(.)edit/[id]`, which per Next.js `(.)` semantics intercepts `/units/edit/{id}` — but the only edit navigation in the app is `Link href={/units/${unit.id}/edit}` (units/page.tsx:193) resolving to the full page `units/[id]/edit/page.tsx`, and a repo-wide grep finds zero references to `/units/edit/`, making the modal dead code (correct nesting would be `@modal/(.)[id]/edit`). Severity is low because the full-page edit route works, so users lose only the intended modal UX (additionally, `units/layout.tsx` never renders the `modal` slot, so the interceptor cou

### [LOW] `src/components/documents/documents-vault.client.tsx:571`
**The document vault defines a private local `EmptyState` component duplicating the mandated `Empty` compound component.**

Lines 571-590 declare a file-local `EmptyState` (icon/title/subtitle/action) used for both the error and zero-documents states (lines 483, 499), re-implementing what `Empty`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` from `#components/ui/empty` already provide. This is the ad-hoc empty-state class plus a component duplication; replace the local helper with the shared compound component.

> Verifier: Lines 571-590 declare a file-local `EmptyState` used at lines 483 (error) and 499 (zero-documents list state), while `src/components/ui/empty.tsx` exports the `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` compound component that CLAUDE.md mandates ("`Empty` compound component from `#components/ui/empty` for list-page empty states") and that 10+ other list pages (units, leases, reports, search, analytics) already use. No runtime defect, but it is a concrete violation of the project's component rule plus a duplicate implementation.

### [LOW] `src/components/inspections/inspection-list.client.tsx:135`
**The inspections list empty state is an ad-hoc div block instead of the `Empty` compound component.**

Sibling instance of the ad-hoc empty-state class: the "No inspections yet" state (lines 129-146) is hand-built from divs/h3/p instead of `Empty`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` from `#components/ui/empty` as CLAUDE.md mandates for list-page empty states.

> Verifier: Lines 129-146 hand-build the "No inspections yet" empty state from div/ClipboardList/h3/p while CLAUDE.md mandates the `Empty` compound component from `#components/ui/empty` for list-page empty states; `src/components/ui/empty.tsx` exists (Empty/EmptyMedia/EmptyTitle/EmptyDescription) and is used by sibling list pages (units, leases, reports), but no file under `src/components/inspections/` imports it. Convention violation only — no runtime defect.

### [LOW] `src/components/leases/detail/lease-sidebar.tsx:39`
**The lease detail "Maintenance Requests" quick action links to `/maintenance?unit_id=…`, but the maintenance page never reads a `unit_id` param, so the promised unit filter silently does nothing.**

`MaintenanceViewClient` only consumes the `tab` search param (maintenance-view.client.tsx:39-48) and no maintenance component reads `unit_id` from the URL; the user clicks a button scoped to one unit and gets the full unfiltered request list with no indication the filter was dropped. Either implement a URL-driven unit filter in the maintenance list or link to plain `/maintenance`.

> Verifier: lease-sidebar.tsx:39 links to `/maintenance?unit_id=${lease.unit_id}`, but `app/(owner)/maintenance/page.tsx` passes no searchParams and `MaintenanceViewClient` reads only `searchParams.get("tab")` (maintenance-view.client.tsx:39); a repo-wide grep finds zero code reading `unit_id` from URL params (only nuqs `page`/`perPage` and `tab`). The param is dead — clicking the unit-scoped action lands on the full unfiltered request list with no indication the filter was dropped.

### [LOW] `src/components/maintenance/maintenance-form-fields.tsx:153`
**The maintenance request form does not autoFocus its primary input, unlike the other key create forms.**

CLAUDE.md requires `autoFocus` on the primary input of key forms; the property form (property-info-section.tsx), add-tenant form (add-tenant-info-fields.tsx), lease wizard (selection-step.tsx), and login form all comply, but neither the title field (line 153) nor any other field in this form sets it, so opening /maintenance/new starts with no focused control.

> Verifier: CLAUDE.md's Forms rule mandates `autoFocus` on the primary input of key forms, and grep confirms zero `autoFocus` (and no programmatic focus) anywhere in maintenance-form-fields.tsx or its wrapper maintenance-form.client.tsx, while the sibling key forms all comply (property-info-section.tsx:26, add-tenant-info-fields.tsx:55, lease wizard selection-step.tsx:192, login-form.tsx:73). Opening /maintenance/new therefore starts with no focused control, an inconsistency with every comparable create form.

### [LOW] `src/components/maintenance/maintenance-view.client.tsx:121`
**The maintenance list zero-state is an ad-hoc div block instead of the `Empty` compound component.**

Sibling instance of the ad-hoc empty-state class: lines 121-147 hand-roll the "No maintenance requests" state with custom divs and a raw styled Link rather than `Empty` from `#components/ui/empty`, violating the project components rule and diverging visually from the leases/units list empty states.

> Verifier: Lines 121-147 hand-roll the "No maintenance requests" zero-state with custom divs and a raw styled Link, while CLAUDE.md's Components rule mandates the `Empty` compound component from `#components/ui/empty` for list-page empty states. Sibling list pages comply — e.g. `src/app/(owner)/leases/page.tsx:191` uses `Empty`/`EmptyMedia`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription` for the same pattern — so this instance both violates the rule and diverges visually from leases/units.

### [LOW] `src/components/settings/owner-emergency-contact-section.tsx:181`
**"Remove Contact" deletes the emergency contact on a single click with no confirmation.**

The button at line 181 calls `handleDelete`, which immediately runs `deleteMutation.mutateAsync()` (line 80-81) wiping the stored emergency-contact fields; every comparable destructive action in settings and the entity pages confirms first. A stray click silently erases data the owner must re-enter; guard it with the AlertDialog pattern.

> Verifier: Line 181 wires `onClick={handleDelete}` directly to the button and `handleDelete` (lines 80-84) immediately awaits `deleteMutation.mutateAsync()`, which nulls all three `emergency_contact_*` columns in `users` — no AlertDialog/ConfirmDialog anywhere in the file. Sibling destructive actions in settings do confirm first: subscription-cancel-section.tsx uses AlertDialog (line 223), active-sessions-section.tsx uses ConfirmDialog, and category deletion goes through category-delete-dialog.tsx. Impact is limited to three easily re-entered fields, so severity is low despite the confirmed inconsistency

### [LOW] `src/components/tenants/tenants.tsx:119`
**The tenants list empty state is an ad-hoc div block instead of the mandated `Empty` compound component from `#components/ui/empty`.**

CLAUDE.md requires the `Empty` compound component for list-page empty states; this file hand-rolls a centered div with a raw styled `<button>` for the zero-tenants state (lines 119-145) and another ad-hoc "No tenants match your filters" block at line 222, while sibling list pages (leases/page.tsx, units/page.tsx) correctly use `Empty`/`EmptyHeader`/`EmptyTitle`.

> Verifier: CLAUDE.md Components rule mandates the `Empty` compound component from `#components/ui/empty` for list-page empty states, yet tenants.tsx lines 119-145 hand-roll a centered div with a raw styled `<button>` for the zero-tenants state and lines 222-234 hand-roll the "No tenants match your filters" block. `src/components/ui/empty.tsx` exists and sibling list pages (`src/app/(owner)/units/page.tsx`, `src/app/(owner)/leases/page.tsx`) import it, confirming this file deviates from the established convention.

### [LOW] `src/components/units/unit-form-fields.tsx:56`
**The unit form does not autoFocus its primary input (`unit_number`), unlike the other key create forms.**

Sibling instance of the missing-autoFocus class: the unit create/edit form's first field at line 56 (and the rest of the form) has no `autoFocus`, while the equivalent property/tenant/lease/login forms focus their primary input on open per the project forms rule.

> Verifier: unit-form-fields.tsx has no autoFocus on any field, while the CLAUDE.md forms rule mandates autoFocus on key forms' primary input and every sibling applies it — including add-unit-panel.tsx:147, which sets autoFocus on the identical unit_number field.TextField, so the prop is supported and the convention demonstrably covers unit creation. Opening the standalone unit create form leaves no field focused, unlike property/tenant/lease/login forms.


## E-sign flow (7)

### [HIGH] `src/hooks/api/query-keys/lease-mutation-options.ts:96`
**Lease update payload includes a `version` field that does not exist as a column on `leases`, so every lease edit save fails with PGRST204.**

`leaseMutations.update()` builds `payload = omitUndefined(version ? { ...data, version } : { ...data })` and PATCHes it via PostgREST; `LeaseForm` (src/components/leases/lease-form.tsx:103) always passes `version: lease.version ?? 1`, so `version: 1` is always in the body. Verified against prod via SQL: `information_schema.columns` has zero `version` columns on `public.leases` (and no migration ever adds one), and PostgREST rejects unknown body columns with PGRST204 ("Could not find the 'version' column"). Concrete failure: owner opens /leases/[id]/edit on a draft lease, changes the rent, clicks save — the update always errors, so a draft can never be corrected before being sent for signature. Correct is to stop sending `version` (or add the column for real optimistic locking).

> Verifier: Prod `information_schema.columns` returns zero rows for a `version` column on `public.leases` (generated `src/types/supabase.ts` leases Row agrees, and no migration adds one — the `version?: number` lives only on phantom client types like `LeaseWithVersion` in core.ts, which is why typecheck passes). `lease-form.tsx:103` always passes `version: lease.version ?? 1`, which at runtime is always `1` (column doesn't exist, so `lease.version` is undefined), and `lease-mutation-options.ts:95-97` includes the truthy `version` in the PATCH body that `omitUndefined` keeps, so PostgREST rejects every edi

### [MEDIUM] `src/components/leases/sign-lease-form.tsx:150`
**After signing, the tenant permanently loses all access to the lease — no copy is emailed and the used token blocks the document endpoint.**

Signing sets `used_at` on the token, and the `document` action in sign-lease-token/index.ts:147 returns 404 for any non-valid token (used/expired/revoked), so reopening the emailed link can never re-serve the PDF; the post-sign success card only says "You can close this page" with no download link, and `finalizeSignedLease` emails nothing to the tenant. Concrete failure: a tenant signs a legally binding lease and has no way to retain or ever retrieve the executed document (the pre-sign blob URL is revoked after 60s) — an ESIGN record-retention gap as well as a dead end. Correct is to email the tenant the signed PDF (or a retrieval link) on finalize, or allow the document action for a used-but-authentic token.

> Verifier: All cited mechanics check out: `sign_lease_with_token` sets `used_at` (migration 20260618200203 line 90) and `get_lease_signing_context` returns `valid=false, reason='used_token'` for it, so the `document` action 404s at sign-lease-token/index.ts:147 for the tenant's emailed link after signing; the post-sign card (sign-lease-form.tsx:150-168) offers only "close this page" with no download; and `finalizeSignedLease` (_shared/lease-signing.ts:251-291) only renders/uploads to the owner-scoped `tenant-documents` bucket while the sole tenant emails in lease-signature/index.ts are the pre-sign send/

### [MEDIUM] `supabase/functions/_shared/lease-signing.ts:274`
**A failed signed-PDF finalize has no retry or regeneration path, leaving the download button in a permanent "Finalizing signed document…" state.**

`finalizeSignedLease` is invoked exactly once per lease — by whichever sign action observes `both_signed` — and on render/upload failure it only logs to Sentry and returns, leaving `signed_document_path` null while the lease is already active. `leaseQueries.signedDocument` (src/hooks/api/query-keys/lease-keys.ts:180-207) then reports `finalizing: true` forever, and its refetch/poll only re-reads the DB — no code path ever re-runs the render/upload (the comment "The PDF can be regenerated later" has no implementation; `preview` only renders the unsigned variant). Concrete failure: one transient Storage outage at the moment of the second signature permanently deprives the owner of the executed PDF despite the lease being active. Correct is to re-trigger finalize on demand (e.g., from the signed-document fetch or an owner action) since the PDF is deterministic from lease data.

> Verifier: `finalizeSignedLease` (lease-signing.ts:274-290) swallows render/upload failures (Sentry log + return, pointer stays null) and is invoked only at signing time — lease-signature/index.ts:519 (sign-owner) and sign-lease-token/index.ts:233 — with no other caller; the edge function's only actions are send/preview/resend/cancel/sign-owner, `preview` renders `{ signed: false }` (index.ts:167-169), and `cancel` is blocked for active leases (index.ts:414). The frontend `signedDocument` query (lease-keys.ts:174-207) and the button's manual re-check (download-signed-lease-button.tsx:85) only re-read `si

### [MEDIUM] `supabase/functions/sign-lease-token/index.ts:232`
**When the tenant signs first, the owner is never notified that a counter-signature is needed — the flow silently stalls in pending_signature.**

The `sign` action only calls `finalizeSignedLease` when `both_signed`, and the `sign_lease_with_token` RPC (supabase/migrations/20260618200203, lines 93-106) inserts the owner notification only inside `if v_lease.owner_signed_at is not null`. No email or in-app notification exists for the tenant-signed-first case, and the tenant's success screen even says "The landlord will be notified once all parties have signed" (sign-lease-form.tsx:165). Concrete failure: owner sends the lease, tenant signs the same day, owner receives nothing and the lease sits in pending_signature until the owner happens to open the detail page — potentially past the lease start date. Correct is a notification (and/or email) on the tenant-signature event itself.

> Verifier: In the current `sign_lease_with_token` (supabase/migrations/20260618200203, lines ~93-106) the owner notification insert is only inside `if v_lease.owner_signed_at is not null`, and sign-lease-token/index.ts only calls `finalizeSignedLease` (which emails the parties) when `result.both_signed` — so a tenant-first signature produces no email and no notifications row, and no trigger or other migration inserts one for that event. The send action (lease-signature/index.ts, draft→pending_signature) does not require the owner to have signed, so tenant-signs-first is a reachable normal path, and the o

### [LOW] `src/app/sign/[token]/sign-context.ts:79`
**The friendly "Already signed / Lease is active" completed-state cards are unreachable — a tenant revisiting their link after signing always gets the warning-styled "Signing link unavailable" card instead.**

`get_lease_signing_context` evaluates `used_at` before `tenant_already_signed`/`lease_active` (migration 20260618200203 lines 177-189), and signing always consumes the token while send/resend revoke all other live tokens, so the only token a signer can revisit with is a used one — reason `used_token`, which `isCompletedState` does not treat as terminal-success. Concrete failure: a tenant who just signed reopens the email link and sees an AlertCircle "Signing link unavailable / This signing link has already been used" card, reading as an error rather than confirmation their signature was recorded. Correct is to classify `used_token` (when the underlying lease shows tenant_signed/active) as a completed state, or order the RPC's reason cascade to prefer the signed/active reasons.

> Verifier: Migration 20260618200203 lines 177-186 order the reason cascade `revoked_token` → `used_token` → `expired_token` before `tenant_already_signed`/`lease_active`, and `sign_lease_with_token` (lines 89-91) sets `used_at` on the token at signing while send/resend/cancel in supabase/functions/lease-signature/index.ts (lines 250-256, 354-359, 423-428) revoke every other live token — so a tenant reopening their link after signing always gets reason `used_token`, which page.tsx line 91 routes past `isCompletedState` (sign-context.ts line 79-81, only `tenant_already_signed`/`lease_active`) into the Aler

### [LOW] `src/components/leases/lease-action-buttons.tsx:92`
**getStatusBadge keys badge variants on legacy uppercase statuses ("EXPIRED", "TERMINATED", "DRAFT") that can never match the lowercase lease_status values in the DB.**

Prod's CHECK constraint (verified via SQL) allows only lowercase `draft|pending_signature|active|ended|terminated|expired|inactive`, so the uppercase map keys never hit: terminated/expired leases render the fallback "outline" variant instead of "destructive"/"secondary", and the label fallback (`labels[status] || status`) prints raw lowercase strings like "terminated", "draft", "ended", "active" in both the action row (line 204) and the View dialog (line 231). This is the same status-value drift class as the confirmed subscription-status cast bug. Correct is lowercase keys covering the full status set with human-readable labels (cf. `getStatusConfig` in detail/lease-detail-utils.ts:184 which does it right).

> Verifier: `getStatusBadge` (src/components/leases/lease-action-buttons.tsx:92-94) keys `EXPIRED`/`TERMINATED`/`DRAFT` uppercase, while the current CHECK constraint (20260702214706_add_inactive_to_leases_lease_status_check.sql) allows only lowercase `draft|pending_signature|active|ended|terminated|expired|inactive`, so those keys are dead: expired/terminated leases fall through to the "outline" variant and `labels[status] || status` renders raw strings ("terminated", "active", "draft", "ended") at both call sites (lines 204, 231). The correct lowercase pattern exists in `getStatusConfig` (lease-detail-ut

### [LOW] `supabase/functions/sign-lease-token/index.ts:83`
**The unauthenticated `context` action rate-limits per token hash instead of per IP, so there is no per-IP ceiling at all on token probing.**

`rateLimit` is called with `identifier: tokenHash`, meaning every distinct token string an attacker sends lands in its own fresh 60/min bucket — a single IP can invoke the `get_lease_signing_context` RPC (plus an Upstash round-trip) at unbounded rate by rotating random tokens, and can probe token validity without ever being throttled. The 256-bit token space makes brute-force discovery infeasible, but this action deviates from the project rule of per-IP limits on unauthenticated functions and leaves the endpoint with zero aggregate protection (the sibling `document`/`sign` actions are per-IP). Correct is a second, coarser per-IP (or shared aggregate) limit layered on top of the per-token bucket, exempting or generously sizing the known Next.js egress.

> Verifier: Lines 79-84 of `supabase/functions/sign-lease-token/index.ts` pass `identifier: tokenHash` to `rateLimit`, and `rate-limit.ts` line 122 (`options.identifier ?? getClientIp(req)`) shows the identifier fully replaces the IP key — so every distinct token an attacker sends opens a fresh `lease-context` 60/min bucket, giving a single IP unbounded `get_lease_signing_context` RPC + Upstash invocations on this public (verify_jwt=false) endpoint, while the sibling `document` (30/min) and `sign` (10/min) actions default to per-IP. The keying is a deliberate documented tradeoff (comments lines 75-78, bec


## Public site UX (13)

### [HIGH] `src/components/pricing/pricing-card-featured.tsx:269`
**Sibling instance: the featured (Growth) pricing card's onComplete also ignores requiresEmailConfirmation and unconditionally attempts checkout.**

Identical bug class to pricing-card-standard.tsx:292 — onComplete destructures { email, tenant_id }, drops the requiresEmailConfirmation flag, and calls subscriptionMutation.mutateAsync, which cannot succeed without a session (no Bearer token → 401 from the stripe-checkout Edge Function). A confirmation-required signup on the most prominent pricing card ends in two error toasts ("Failed to start c

> Verifier: `onComplete` at line 269 destructures only `{ email, tenant_id }` from the dialog payload (which explicitly carries `requiresEmailConfirmation` — owner-subscribe-dialog.tsx:22-26, set true when signUp yields no session and signInWithPassword fails with `email_not_confirmed`) and unconditionally calls `subscriptionMutation.mutateAsync`. With no session, `createCheckoutSession` (stripe-client.ts:52) omits the Authorization header and the stripe-checkout Edge Function's `validateBearerAuth` returns 401 "Missing authorization header", so the mutation's onError fires "Failed to start checkout" and 

### [MEDIUM] `src/app/blog/[slug]/blog-post-page.tsx:59`
**The tax lead magnet promises a "ready-to-use spreadsheet" with "auto-calculated totals" but the email-gated download delivers a printable HTML page with blank write-in lines.**

LEAD_MAGNETS for the mortgage-interest post is titled "Free Tax Deduction Tracker Spreadsheet" and promises "ready-to-use spreadsheet ... auto-calculated totals", and LeadMagnetCta's unlock button says "Get Free Resource" after collecting the visitor's email — but downloadUrl is /resources/landlord-tax-deduction-tracker, a print-only page of dashed blank fields (no file download, no spreadsheet, n

> Verifier: LEAD_MAGNETS at blog-post-page.tsx:59-65 promises a "ready-to-use spreadsheet ... with auto-calculated totals" (resourceType "spreadsheet"), and LeadMagnetCta (src/components/blog/lead-magnet-cta.tsx) gates the link behind a required email submitted to newsletter-subscribe before showing the Download-icon "Get Free Resource" button. The target /resources/landlord-tax-deduction-tracker/page.tsx is a print-oriented HTML page whose own metadata calls it a "free printable" tracker, with dashed blank `<div>`/`<span>` write-in fields for every amount, category total, and the grand total — no file do

### [MEDIUM] `src/app/blog/page.tsx:200`
**Blog index category chips render the raw kebab-case slug (cat.name) instead of the human label, showing "software-vault (85)" / "lease-law (33)" to visitors.**

The get_blog_categories RPC returns name = blogs.category, and the category column stores kebab slugs (verified in prod: software-vault, maintenance, tenant-screening, lease-law, tax-prep). src/lib/seo/blog-categories.ts exists precisely to convert these slugs to display labels and documents itself as "the single source of truth" for that conversion, but the /blog index chips print {cat.name} verb

> Verifier: `src/app/blog/page.tsx:200` renders `{cat.name}` verbatim, and the `get_blog_categories` RPC (supabase/migrations/20260307120000_blog_categories_rpc.sql) returns `name = b.category`, where `blogs.category` stores kebab slugs — `src/lib/seo/blog-categories.ts` explicitly documents "the RPC therefore returns `name === slug` (both kebab)" and names itself the single source of truth for slug-to-label conversion. Every sibling surface (category page headings, breadcrumbs, llms.txt, llms-full.txt, post-page breadcrumb) uses `categoryLabel(slug)`, so the /blog index chips are the one public surface s

### [MEDIUM] `src/app/help/page.tsx:143`
**The Help Center's "Popular resources" cards promise "Quick access to the most requested help topics" but are non-interactive dead ends with no links.**

The four cards ("Set up the document vault", "Send a lease for e-signature", "Run reports for tax season", "Manage your team and billing") are plain CardLayout elements with no href, onClick, or route to any article — no help-article pages exist in src/app. Combined with the hero copy "Browse the help center below," visitors are invited to click content that goes nowhere. Correct is either linking

> Verifier: The four cards (lines 144-189) render via CardLayout, whose props are only title/description/children/footer/className — it renders a plain shadcn Card with no anchor or onClick capability, and no Link wraps any card. `src/app/help/` contains only page.tsx (no article sub-routes), so the copy "Quick access to the most requested help topics" (line 139), the hero's "Browse the help center below" (line 37), and the card text "everything the vault does in one walkthrough" (line 148) all promise navigable content that does not exist, while linkable targets like /resources/* and /blog do exist and a

### [MEDIUM] `src/components/landing/bento-features-section.tsx:49`
**All six feature-card CTAs on the public /features page deep-link into auth-gated app routes, dead-ending logged-out prospects at the login wall.**

BentoFeaturesSection (rendered on the public /features page via src/app/features/features-client.tsx:57) gives its cards hrefs of /properties, /documents/vault, /tenants, /maintenance, /leases, and /analytics/financial (lines 49, 58, 67, 76, 85, 94). Every one of those prefixes is in PRIVATE_ROUTE_PREFIXES in src/proxy.ts:24-40, so an anonymous marketing visitor clicking "Manage Properties" / "Ope

> Verifier: BentoCard renders each `href` as a real `<Link>` (src/components/ui/bento-grid.tsx:81), and the six hrefs (/properties, /documents/vault, /tenants, /maintenance, /leases, /analytics/financial at lines 49/58/67/76/85/94) all prefix-match PRIVATE_ROUTE_PREFIXES in src/proxy.ts:24-40, whose `!user` branch (proxy.ts:218-223) redirects anonymous visitors to /login?redirect=<path>. The section is rendered only on the public /features page (src/app/features/features-client.tsx:57), so every logged-out prospect clicking a card CTA hits a sign-in form instead of a marketing destination.

### [MEDIUM] `src/components/pricing/pricing-card-standard.tsx:292`
**The pricing card's OwnerSubscribeDialog onComplete ignores requiresEmailConfirmation and always fires the checkout mutation, which is guaranteed to 401 when signup did not produce a session.**

OwnerSubscribeDialog passes requiresEmailConfirmation in the onComplete payload specifically so callers can branch, but this onComplete destructures only { email, tenant_id } and unconditionally calls subscriptionMutation.mutateAsync. When Supabase email confirmations are enabled (the auth-email-send hook ships a dedicated signup-confirmation template, so this is a supported configuration), signUp

> Verifier: owner-subscribe-dialog.tsx:57-79 explicitly computes requiresEmailConfirmation (detecting email_not_confirmed after a no-session signUp — a config the codebase supports, per the signupConfirmationEmail template in supabase/functions/auth-email-send/index.ts:109) and passes it to onComplete, but pricing-card-standard.tsx:292 destructures only { email, tenant_id } and unconditionally awaits subscriptionMutation.mutateAsync; with no session, createCheckoutSession (stripe-client.ts:52) sends no Authorization header and stripe-checkout's validateBearerAuth (_shared/auth.ts:35-41) returns 401 "Missi

### [MEDIUM] `src/components/sections/hero-section.tsx:72`
**Hero CTAs on /faq, /about and /help are rendered as buttons driving router.push instead of links, so they expose no href.**

This shared HeroSection renders primaryCta/secondaryCta as `<Button onClick={() => router.push(...)}>` (lines 72-81) rather than `<Button asChild><Link href=...>` like every other marketing CTA in the codebase (e.g. src/components/landing/hero-section.tsx). Middle-click/cmd-click open-in-new-tab does nothing, the URLs are invisible to crawlers, and the controls announce as buttons instead of links

> Verifier: hero-section.tsx:72-81 renders both CTAs as `<Button onClick={() => router.push(...)}>` — a native `<button>` with no href — while the codebase's canonical pattern (src/components/landing/hero-section.tsx:29-52) uses `<Button asChild><Link href=...>`. The component is consumed only by the public /faq, /about, and /help pages, so those marketing CTAs lose cmd/middle-click open-in-new-tab, crawlable hrefs, and correct link semantics for assistive tech exactly as claimed.

### [LOW] `next.config.ts:137`
**/help-center and /rss-feed redirects are speculative aliases for URLs that never existed, violating the project's no-typo-courtesy-redirects rule.**

Git history (--all, --diff-filter=A) shows /terms-of-service and /privacy-policy genuinely existed as pages, so those two CRIT-06 redirects are legitimate — but no /help-center or /rss-feed page or route ever existed in any commit, and a repo-wide grep finds no other reference to either path. The project rule is explicit that redirects exist only for URLs that genuinely existed and that 404 is cor

> Verifier: `git log --all --diff-filter=A -- '*help-center*' '*rss-feed*'` returns nothing — no such route/page ever existed in any commit — and a repo-wide grep finds no reference to either path outside next.config.ts itself, while the sibling CRIT-06 entries are legitimate (`apps/frontend/src/app/terms-of-service.tsx` and `privacy-policy.tsx` genuinely existed). The project rule (feedback_no_typo_courtesy_redirects) explicitly forbids speculative redirects for URLs that never existed — 404 is correct — and the comment's own "may reference verbose forms" justification is speculation, so the lines 136-14

### [LOW] `src/app/auth/callback/route.ts:72`
**An invalid OTP type redirects /auth/callback to itself, which then re-runs and lands the user on /login with the misleading error "oauth_failed".**

When token_hash is present but type fails the allowlist, the handler redirects to "/auth/callback?error=invalid_type" — the same GET route. On the second pass tokenHash/code are absent, so it falls through to the final redirect "/login?error=oauth_failed". The user who clicked a malformed email link gets a two-hop redirect chain, the invalid_type signal is discarded, and the login page blames an O

> Verifier: Line 72-74 redirects to "/auth/callback?error=invalid_type" — the same GET route handler with no page to display it; on re-entry tokenHash/code are null so it falls through to line 124's "/login?error=oauth_failed", and grep confirms no code anywhere consumes invalid_type (login/page.tsx line 55 just router.replace-strips oauth_failed). The user with a malformed link gets a dead-end two-hop redirect and no accurate error, unlike the sibling path at lines 96-103 which correctly targets /auth/confirm-email?error=invalid_token; severity is low since it requires a malformed/crafted link and has no

### [LOW] `src/app/layout.tsx:100`
**The global "Skip to main content" link targets #main-content, which does not exist on /login, /auth/* or /sign/[token], leaving a dead skip link on those pages.**

The root layout renders the skip link on every route, and its comment says the target id lives in PageLayout and the dashboard shell — but the (auth)/login layout, src/app/auth/layout.tsx, and src/app/sign/[token]/page.tsx render neither: the sign page has a bare `<main>` with no id (line 39) and the auth trees have no main-content id at all (grep confirms). A keyboard/screen-reader user activatin

> Verifier: Root layout renders `href="#main-content"` on every route (layout.tsx:100), but grep shows the id exists only in `src/components/shell/app-shell.tsx:303` and `src/components/layout/page-layout.tsx:59`; `/login` (src/app/(auth)/login/page.tsx), `src/app/auth/layout.tsx` (returns bare children), and `src/app/sign/[token]/page.tsx` (`<main className="min-h-dvh ...">`, no id) render neither component and contain no `main-content` id, so activating the skip link on those pages is a no-op fragment navigation for keyboard/screen-reader users.

### [LOW] `src/app/pricing/complete/complete-client.tsx:188`
**Customer-facing payment-status page links "View details" to the merchant-only Stripe dashboard (dashboard.stripe.com), which no customer can access.**

/pricing/complete renders after checkout (reads ?session_id=) and, when a payment_intent_id exists, shows a "View details" link to `https://dashboard.stripe.com/payments/<id>` — the platform owner's Stripe admin dashboard. Any customer clicking it hits Stripe's dashboard login for an account they don't own instead of a receipt. Stripe's customer-appropriate artifact is the hosted receipt/invoice U

> Verifier: Line 188 renders `<a href="https://dashboard.stripe.com/payments/${payment_intent_id}">View details</a>` on a publicly routable page (proxy.ts allows `/pricing*`); dashboard.stripe.com requires login to the platform owner's Stripe account, so any customer clicking it hits an inaccessible login wall instead of a receipt. Severity is low because the active checkout flow no longer lands here — `stripe-checkout/index.ts:123` sets success_url to `/dashboard?checkout=success`, and the page needs a valid `?session_id=` to show the link, so it is effectively orphaned (robots.ts also disallows it).

### [LOW] `src/app/pricing/page.tsx:101`
**The StickyConversionCta on /pricing uses its default primaryHref="/pricing", making the floating "Start free" button a self-referential no-op.**

StickyConversionCta appears after the visitor scrolls 600px down the pricing page; clicking its primary "Start free" button navigates to /pricing — the page they are already on — which just scrolls them back to the top instead of into the plan cards where checkout actually starts. The page's own bottom CTA (pricing-content.tsx:177) correctly targets #plans; the sticky CTA should pass primaryHref="

> Verifier: page.tsx:101 renders `<StickyConversionCta />` with no props and the component defaults `primaryHref = "/pricing"` (sticky-conversion-cta.tsx:32), so on /pricing the primary button links to the page the visitor is already on; the page's own PricingCtaSection correctly targets `#plans` (anchor defined at page.tsx:75). Impact is minor since a same-route navigation scrolls to top where the plan cards sit above the fold.

### [LOW] `src/components/pricing/owner-subscribe-dialog.tsx:52`
**Signup emailRedirectTo points at /auth/confirm, a route that does not exist anywhere in src/app.**

The pricing signup dialog calls supabase.auth.signUp with emailRedirectTo `${origin}/auth/confirm`, but the app only defines /auth/callback, /auth/confirm-email, /auth/post-checkout, /auth/signout and /auth/update-password — a repo-wide grep shows no /auth/confirm page and no redirect for it. It is currently inert only because the auth-email-send hook rewrites all auth links to /auth/callback?toke

> Verifier: Line 52 sets `emailRedirectTo: ${window.location.origin}/auth/confirm`, but `src/app/auth/` contains only callback, confirm-email, post-checkout, signout, and update-password, and no redirect for `/auth/confirm` exists in next.config.ts, vercel.json, or proxy.ts — so that URL 404s. It is currently inert only because supabase/functions/auth-email-send/index.ts:104 hard-codes all confirmation links to `/auth/callback?token_hash=...` and ignores redirect_to; if the send-email hook is disabled or Supabase reverts to default templates, confirmation clicks land on a 404 (the only other signUp call, 


## Marketing content truthfulness (24)

### [HIGH] `src/components/pricing/pricing-comparison-table.tsx:45`
**Pricing comparison table advertises "Team members: 1 / 3 / Unlimited" for a feature that does not exist in the product.**

The "Property Management" category row claims Starter=1, Growth=3, Max=Unlimited team members, rendered on the public /pricing page. There is no invite, seat, role, or membership surface anywhere under `src/app/(owner)` or `src/components/settings`, and the data model is single-owner. This is a concrete paid-tier differentiator shown in the feature matrix that a subscriber cannot use. Remove the row or ship the feature.

> Verifier: Line 45 of src/components/pricing/pricing-comparison-table.tsx renders "Team members: 1 / 3 / Unlimited" as a paid-tier differentiator on the public /pricing page, but no team feature exists anywhere: migrations define no team/membership/seat/organization table (all owner-scoped via owner_user_id, single-owner data model), generated supabase.ts has no such tables, and grep of src/app/(owner) + src/components/settings finds zero invite/seat/role UI. The same fictitious claim also appears in src/config/pricing.ts:163 ("Team (3 users)" on the Growth plan), so a subscriber upgrading for seats gets

### [HIGH] `src/config/pricing.ts:163`
**Growth plan sells a "Team (3 users)" feature (and `limits.users` 1/3/unlimited) but no team/multi-user capability exists anywhere in the app.**

The Growth feature list includes "Team (3 users)" and every plan carries a `limits.users` value, but the product has no membership table, no invite flow, no seat management, and no roles UI — `src/app/(owner)/settings/` contains only layout/page/billing, RLS is strictly single-owner (`owner_user_id = auth.uid()`), and `src/types/supabase.ts` has no team/membership table. A landlord buying Growth (

> Verifier: Line 163 lists "Team (3 users)" in GROWTH's features (limits.users: 3 at line 151), rendered on /pricing via bento-pricing-section.tsx:36 and on /billing/plans via getAllPricingPlans(), yet no membership/invite/seat table exists in src/types/supabase.ts or any migration, the only "invite" code is the OTP-type allowlist and tenant-record form fields, and the architecture is strictly single-owner (owner_user_id = auth.uid()). A Growth subscriber paying $49/mo has no way to add any second user, so the advertised paid feature is nonexistent.

### [HIGH] `src/config/pricing.ts:197`
**Max plan advertises "API access" (also in its description, line 174) but no API access feature exists.**

The $149/mo Max tier lists "API access" and its description says "unlimited scale and API access", yet there is no API-key issuance, developer settings, token surface, or documented API anywhere in the app (`grep -i "api key\|api access"` across `src/app/(owner)`, `src/components/settings`, `src/hooks` returns nothing product-side). A Max subscriber cannot obtain API credentials. Renders on /prici

> Verifier: pricing.ts:197 lists "API access" in Max features and line 174's description says "unlimited scale and API access", rendered user-facing via plan.features.map in pricing-card-standard/featured.tsx (/pricing) and getAllPricingPlans() in (owner)/billing/plans/page.tsx. A repo-wide grep for API access/key/developer/token surfaces finds only this copy, faqs.ts (sibling claim), and an internal Supabase `apikey` header in the OG route; `(owner)/settings/` contains only billing, and src/types/supabase.ts has no API-key/table surface — a $149/mo Max subscriber has no way to obtain API credentials.

### [MEDIUM] `src/app/compare/[competitor]/compare-data.ts:27`
**Buildium metaDescription claims "TenantFlow offers the same features at half the price", contradicted by the page's own feature table and prices.**

The same competitor object marks Background Checks "no", ACH/Payment Processing "na", and HOA Management "na" for TenantFlow — so "the same features" is false by the page's own data. The price ratio is also not "half" at any tier pairing ($19 vs $58 ≈ 1/3; $49 vs $183 ≈ 1/4). This string is the meta description and OG/Twitter description for /compare/buildium.

> Verifier: The metaDescription (used as meta/OG/Twitter description per page.tsx:50,54,70) claims "the same features at half the price," but the same competitor object marks Background Checks "no", ACH/Payment Processing "na", and HOA Management "na" for TenantFlow while Buildium is "yes" on all three, and no tier pairing is half ($19/$58≈1/3, $49/$183≈1/4, $149/$375≈2/5). The heroSubtitle's own hedged wording ("same core features") shows the unhedged meta claim is inaccurate by the page's own data.

### [MEDIUM] `src/app/compare/[competitor]/compare-data.ts:25`
**Buildium card copy promises "a better tenant experience" from a product that has zero tenant-facing surface.**

The description ("...switching from Buildium to TenantFlow for lower costs, modern features, and a better tenant experience") renders on the /compare index cards (src/app/compare/page.tsx:67). TenantFlow is landlord-only — no tenant portal, logins, or tenant-facing features — so it cannot deliver any tenant experience, better or otherwise; the rest of the site actively markets the opposite ("Skip 

> Verifier: Line 25 verbatim reads "...switching from Buildium to TenantFlow for lower costs, modern features, and a better tenant experience" and renders publicly on the /compare index cards (compare/page.tsx:67), yet the product is landlord-only with zero tenant-facing surface — the homepage hero itself markets "Skip the tenant portal" / "tenants stay off the platform" (marketing-home.tsx:49-57) and CLAUDE.md pins "no tenant portal, no tenant auth accounts; tenants are records, not users". The claim promises a tenant experience the product cannot deliver and directly contradicts the site's own brand wed

### [MEDIUM] `src/app/compare/[competitor]/compare-data.ts:332`
**RentRedi feature table marks TenantFlow "Team Collaboration: yes — 3 users on Growth" for a nonexistent multi-user feature.**

The row (lines 332-337) affirmatively claims TenantFlow ships team collaboration with 3 users on Growth, directly comparing it against RentRedi's "Unlimited team members". No seat, invite, or membership capability exists in the codebase. The cell should be "no" until the feature ships.

> Verifier: compare-data.ts:332-337 affirms "Team Collaboration: yes — 3 users on Growth", but no membership capability exists: generated schema types (src/types/supabase.ts) contain zero team/member/seat/invitation tables, the (owner)/settings area has only billing (no team/invite UI), and the data model is strictly single-owner (every table scoped by owner_user_id + get_current_owner_user_id() RLS, so a second user could never see an owner's data). The only invite artifact is a generic auth email template in supabase/functions/_shared/auth-email-templates.ts with no product trigger; note the same false 

### [MEDIUM] `src/app/help/page.tsx:169`
**Help page instructs users to "Invite team members" — an operation the product does not support.**

The "Manage your team and billing" resource card (title line 167) says "Invite team members, switch plans, update payment methods, and export account data." There is no invite or member-management surface anywhere in `(owner)/settings` or elsewhere. A user following this help topic cannot perform the described action. Sibling of the pricing "Team (3 users)" claim.

> Verifier: Line 169 of src/app/help/page.tsx advertises "Invite team members" under the "Manage your team and billing" card, but no invite/member-management surface exists anywhere: `(owner)/settings/` contains only billing/layout/page, no edge function or migration defines team members/seats, and the only "invite" hits in src are the auth-callback OTP type allowlist and the lease wizard's tenant-record "inviteMode" (tenants are records, not users, per CLAUDE.md's landlord-only model). A user following this help topic cannot perform the described action — the capability claim is false.

### [MEDIUM] `src/app/pricing/pricing-content.tsx:42`
**Pricing FAQ claims "We accept all major credit cards, debit cards, and ACH transfers" but checkout is card-only.**

The checkout Edge Function the pricing CTAs call (`supabase/functions/stripe-checkout/index.ts:120`) pins `payment_method_types: ["card"]`, so ACH is never offered. A customer expecting to pay by bank transfer cannot. This answer is also emitted into the /pricing FAQPage JSON-LD. Correct copy is credit/debit cards via Stripe only (or enable `us_bank_account` in checkout).

> Verifier: pricing-content.tsx:41-42 states ACH transfers are accepted, but the sole checkout path `supabase/functions/stripe-checkout/index.ts:120` hardcodes `payment_method_types: ["card"]` and a repo-wide grep finds no `us_bank_account` or `automatic_payment_methods` enablement anywhere, so ACH is never offered. The false claim also propagates into search rich results: `pricingFaqs` (pricing-content.tsx:217) feeds FAQPage JSON-LD via `createFaqJsonLd` in src/app/pricing/page.tsx:37.

### [MEDIUM] `src/app/pricing/pricing-content.tsx:190`
**Pricing CTA bullet "14-day trial, all features" promises "generate and e-sign leases" in the trial, which is false for Starter trials.**

The bullet sits below all three plan cards, but e-signing is 402-gated to Growth/Max plans (`_shared/tier-gate.ts`) including during trials — a visitor who starts the Starter trial from this page cannot e-sign leases. Sibling of the home-faq "all features" claim; should be scoped to Growth/Max trials like `premium-cta.tsx` already does ("lease e-sign on Growth and Max").

> Verifier: pricing-content.tsx:190-191 promises "14-day trial, all features … generate and e-sign leases" on /pricing (rendered via PricingCtaSection at page.tsx:100 below all three plan cards), but lease-signature/index.ts:137-146 402-gates the e-sign `send` action via checkTierEntitlement with GROWTH_AND_MAX_PLANS, and tier-gate.ts:84 requires `hasActiveSub && onEntitledPlan` — "trialing" satisfies only the status half, so a Starter-trial user's plan fails the entitlement and e-sign is blocked during the trial. The site's own honest siblings (premium-cta.tsx:45, hero-section.tsx:24, comparison-table.ts

### [MEDIUM] `src/app/resources/page.tsx:32`
**Resources page advertises setup guides for "team billing", a feature that does not exist.**

The Help Center card description promises "Setup guides for the document vault, leases, maintenance, and team billing." There is no team billing (no seats, no team). Sibling echo of the team-claims class; also `pricing-content.tsx:105` ("how access works for your team") leans on the same nonexistent capability.

> Verifier: Line 32 promises "Setup guides for ... team billing" linking to /help, whose "Manage your team and billing" card (help/page.tsx:167-169) claims "Invite team members" — but no team/seat/invite capability exists anywhere: zero team/membership tables in supabase/migrations, no invite UI in (owner)/settings or /billing, and all data is single-user scoped via owner_user_id. The same nonexistent claim also appears at pricing-content.tsx:105, pricing-comparison-table.tsx:45 ("Team members 1/3/Unlimited"), and src/config/pricing.ts:163 ("Team (3 users)"), confirming a class-wide false feature claim.

### [MEDIUM] `src/components/blog/newsletter-signup.tsx:61`
**Blog newsletter signup repeats the undelivered "landlord operations guide" promise and the false "Check your inbox" success toast.**

Sibling of the lead-capture-modal finding: heading "Get the landlord operations guide" plus `toast.success("Subscribed! Check your inbox.")` (line 30) invoke the same `newsletter-subscribe` function that sends no email and delivers no guide. Both surfaces need honest copy ("You're on the list") or an actual delivered asset.

> Verifier: `newsletter-signup.tsx` line 61 promises "Get the landlord operations guide" and line 30 toasts "Subscribed! Check your inbox.", but `supabase/functions/newsletter-subscribe/index.ts` only POSTs to Resend `/contacts` (segment association) — it never calls any email-send endpoint, so no email or guide ever arrives; grep confirms no "guide" asset or send exists anywhere in `supabase/functions/`. Identical false copy exists in the sibling `src/components/marketing/lead-capture-modal.tsx` (lines 104/133), matching the claimed pattern.

### [MEDIUM] `src/components/landing/results-proof-section.tsx:48`
**Features-page section claims "Higher tiers unlock more e-sign volume, more storage, and team-member seats" — seats don't exist.**

The e-sign and storage claims track the pricing config, but "team-member seats" is another echo of the nonexistent team feature on the public /features page. Remove the seats clause.

> Verifier: Lines 47-48 contain the exact copy "Higher tiers unlock more e-sign volume, more storage, and team-member seats", and the component renders on the public /features page (src/app/features/features-client.tsx:64). No team/seat capability exists anywhere: src/types/supabase.ts has no team/membership/seat table, no migration creates one, (owner)/settings contains only billing/layout/page, and the only "invite team" grep hits are other marketing copy (pricing-content.tsx, help/page.tsx) already flagged as siblings — so the seats clause advertises a nonexistent feature.

### [MEDIUM] `src/components/marketing/lead-capture-modal.tsx:133`
**Lead-capture modal promises a "landlord operations guide" and toasts "Subscribed! Check your inbox." but no guide exists and no email is ever sent.**

The CTA is "Send me the guide" (line 160) and the success toast (line 104) tells the user to check their inbox, but the `newsletter-subscribe` Edge Function it calls only creates a Resend contact in the "Newsletter" segment — it sends no welcome email, no guide, nothing (verified in supabase/functions/newsletter-subscribe/index.ts, which contains no send call). No guide asset exists anywhere in th

> Verifier: The modal promises a guide (title line 133, CTA "Send me the guide" line 160) and toasts "Subscribed! Check your inbox." (line 104), but `supabase/functions/newsletter-subscribe/index.ts` only POSTs to Resend `/segments` and `/contacts` — it contains zero email-send calls (no `/emails`, no welcome template). No guide asset exists anywhere in the repo (only PDF in `public/` is `Richard_Hudson_Revenue_Operations.pdf`), so a subscriber is told to check an inbox that receives nothing and the lead magnet is never delivered.

### [MEDIUM] `src/components/pricing/pricing-comparison-table.tsx:96`
**Comparison table "Custom lease clauses" row (Starter ✗ / Growth ✗ / Max ✓) claims a Max capability that is not implemented.**

Sibling of the pricing-config claim: the /pricing feature matrix marks custom lease clauses as a Max differentiator, but the clause-builder UI provides no way to author custom clauses on any tier (hardcoded empty `customClauses` array in `lease-template-builder.client.tsx:127`). The row misrepresents what upgrading to Max buys.

> Verifier: pricing-comparison-table.tsx:96-100 marks "Custom lease clauses" as Max-only (rendered on /pricing via bento-pricing-section.tsx:146), but the only lease clause surface, lease-template-builder.client.tsx:127, hardcodes `const customClauses: CustomClause[] = []` with no setter or input UI, so `renderCustomClauses` always receives an empty array and no subscriber on any tier can author a custom lease clause. The repo's real clause-authoring component (`ClausesEditor`) is wired only to rental-application, tenant-notice, and property-inspection templates — never to leases — and nothing tier-gates 

### [MEDIUM] `src/components/sections/home-faq.tsx:36`
**Homepage FAQ claims the free trial includes "Everything. You get full access to all features" but trials are plan-scoped and a Starter trial lacks e-sign.**

The trial is a 14-day trial of whichever tier is checked out (`stripe-checkout/index.ts` `trial_period_days: 14` on the selected price), and the e-sign gate (`supabase/functions/_shared/tier-gate.ts` `GROWTH_AND_MAX_PLANS`) 402-blocks trialing Starter users; DB plan-cap triggers also enforce Starter's 5-property/25-unit caps during trial. Line 16 repeats "The 14-day free trial covers every feature

> Verifier: home-faq.tsx:36 ("Everything. You get full access to all features") and :16 ("covers every feature") render on the homepage (marketing-home.tsx:138), but the trial is a subscription on the selected tier's price (`trial_period_days: TRIAL_PERIOD_DAYS` in supabase/functions/stripe-checkout/index.ts:134), and e-sign is 402-gated to `GROWTH_AND_MAX_PLANS` in supabase/functions/_shared/tier-gate.ts (used by lease-signature/export-report/generate-pdf) — "trialing" satisfies only the status check, so a trialing Starter user is 402-blocked from e-sign. The site's own /llms-full.txt route (src/app/llms

### [MEDIUM] `src/components/sections/logo-cloud.tsx:16`
**Homepage logo cloud titled "Trusted integrations" with subtitle "Connect to the tools your portfolio already runs on" misrepresents TenantFlow's own infrastructure vendors as user-connectable integrations.**

The homepage renders `<LogoCloud />` with these defaults (src/app/marketing-home.tsx:93), listing Stripe, Supabase, Vercel, and Resend. Landlords cannot "connect" to any of them — they are TenantFlow's internal stack, there is no integrations surface in the app, and the FAQ itself says the only integration path is (nonexistent) Max API access plus CSV export. The features page passes an honest tit

> Verifier: logo-cloud.tsx:16-17 defaults to "Trusted integrations" / "Connect to the tools your portfolio already runs on" over Stripe/Supabase/Vercel/Resend, and marketing-home.tsx:93 renders `<LogoCloud />` bare so the homepage ships that copy; these four are TenantFlow's internal stack (CLAUDE.md: Supabase backend, Vercel hosting, Stripe billing, Resend email) with no user-facing connect flow anywhere in src/app/(owner). The product's own FAQ (src/data/faqs.ts:76-78) states the only integration paths are Max-plan API access and CSV export, and features-client.tsx:60-61 confirms the honest framing ("Bu

### [MEDIUM] `src/components/sections/testimonials-section.tsx:123`
**Testimonials render a hardcoded 5-star rating (`[...Array(5)]` filled stars) that no customer ever gave.**

Both the carousel (lines 122-126) and grid card (lines 222-226) print five filled stars above every quote regardless of data — `Testimonial` has no rating field, and `src/data/testimonials.ts` documents that these are product-team-drafted, author-approved quotes with fabricated metrics deliberately omitted. Attaching an invented 5/5 star rating to each quote reintroduces exactly the fabricated-soc

> Verifier: Both the carousel (lines 122-126) and grid TestimonialCard (lines 222-226) unconditionally render `[...Array(5)].map(... <Star fill-accent .../>)` above every quote; the `Testimonial` interface (src/types/sections/marketing.ts:10-18) has no rating field, so the 5/5 rating is data-free invention. src/data/testimonials.ts explicitly documents the anti-fabrication guardrails ("No fabricated metrics — `metric` field intentionally omitted") for these author-approved quotes, and the component ships with `realTestimonials` on the homepage (marketing-home.tsx:130) and /pricing (pricing/page.tsx:95), a

### [MEDIUM] `src/config/pricing.ts:196`
**Max plan advertises "Custom lease clauses" but the lease builder has no way to add a custom clause on any plan.**

`src/components/leases/template/lease-template-builder.client.tsx:127` hardcodes `const customClauses: CustomClause[] = [];` — a plain const with no state setter and no input UI, so `renderCustomClauses()` always receives an empty array. The Max-exclusive "Custom lease clauses" feature is unreachable for every subscriber. Either ship the input UI (with Max gating, per the marketing) or drop the cl

> Verifier: `src/components/leases/template/lease-template-builder.client.tsx:127` declares `const customClauses: CustomClause[] = []` as a plain const (every other builder input uses useState) with no input UI anywhere, so `renderCustomClauses()` (lease-template.ts:464) always gets an empty array and returns ""; the only add-clause component (`ClausesEditor`) is wired solely to rental-application/tenant-notice/property-inspection templates, never leases. The advertised Max feature (also in pricing-comparison-table.tsx:96 as a Starter ✗/Growth ✗/Max ✓ row) is therefore unreachable for every subscriber on 

### [MEDIUM] `src/config/pricing.ts:67`
**FREETRIAL plan copy "Try every feature for 14 days" / "14-day full-feature trial" contradicts the same object's own limits (1 property, 5 units, no e-sign).**

Lines 67-68 claim a full-feature trial while lines 77-92 cap the trial at 1 property/5 units with no e-sign feature, and `get_user_plan_limits` maps trial/unknown plans to 1 property/5 units. This card renders user-facing on /billing/plans (its `getAllPricingPlans()` mapping does not filter out the trial plan). The description and audienceTagline overstate what the trial tier includes.

> Verifier: Lines 67-68 claim "Try every feature" / "14-day full-feature trial" while the same object caps limits at 1 property/5 units (lines 77-83) and its features list (84-92) includes no e-sign; the latest `get_user_plan_limits` (20260510094421_phase_5_recognize_new_price_ids.sql) enforces the 1/5 caps for trial/unknown plans via its ELSE branch. The card is user-facing: `/billing/plans/page.tsx:47` builds `PLANS = getAllPricingPlans().map(toBillingPlan)` with no trial filter and renders every card at line 218 (unlike `/pricing`, which filters `planId !== "trial"` in bento-pricing-section.tsx:25), an

### [MEDIUM] `src/data/faqs.ts:78`
**FAQ answers claim "API access is available on the Max plan" (also line 58) for a nonexistent feature.**

The "Do you integrate with my existing systems?" answer states API access is available on Max, and line 58 repeats "Max supports unlimited properties with API access and a dedicated account manager." No API access surface exists in the product. These answers are also emitted as FAQPage JSON-LD on /faq, so the false claim propagates into search rich results.

> Verifier: src/data/faqs.ts:78 states "API access is available on the Max plan" and line 58 repeats "Max supports unlimited properties with API access", but grep across src/app/(owner), src/components/settings, src/hooks, and src/types/supabase.ts finds zero API-key issuance, developer-settings, or token surface (src/app/api contains only the /og renderer). These answers are emitted as FAQPage JSON-LD via createFaqJsonLd in src/app/faq/page.tsx:32-36, so the false feature claim propagates into search rich results.

### [LOW] `src/app/compare/[competitor]/compare-data.ts:341`
**RentRedi comparison marks TenantFlow "Unlimited Units: no — 25-100 by plan", contradicting the Max plan's unlimited units shown on the same page.**

`TENANTFLOW_PRICING` (lines 12-15, rendered in the pricing panel directly above the feature table) says "Max — Unlimited properties and units", and `PRICING_PLANS` sets Max units to -1 (unlimited). The feature row understates the product and contradicts the page's own pricing section. The cell should be "yes (Max)" or the note corrected to "25/100/unlimited by plan".

> Verifier: The rentredi entry (line 251) sets the "Unlimited Units" feature row to `tenantflow: "no"` with note "25-100 by plan" (lines 339-344), yet the same entry's `tenantflowPricing: TENANTFLOW_PRICING` (line 267) includes Max at "Unlimited properties and units" (lines 12-15), and both render on the same /compare/rentredi page via compare-sections.tsx (pricing at line 45, feature notes at line 137). Canonical `src/config/pricing.ts:186` confirms Max `units: -1` ("Unlimited units"), so the row understates the product and self-contradicts the page.

### [LOW] `src/app/compare/[competitor]/compare-data.ts:238`
**AppFolio claim "Save over $3,000/year at 30 units ($49/mo vs $298/mo minimum)" is arithmetically false — the cited numbers yield $2,988/year.**

($298 − $49) × 12 = $2,988, which is under $3,000, so "over $3,000/year" is not supported by the parenthetical it cites. The Buildium sibling (line 109, "over $1,600" = $1,608) is correct; this one overstates. Change to "nearly $3,000/year" or "$2,988/year".

> Verifier: Line 238 reads "Save over $3,000/year at 30 units ($49/mo vs $298/mo minimum)"; ($298 − $49) × 12 = $2,988, which is under $3,000, so the claim overstates its own cited parenthetical by $12/yr. The Buildium sibling at line 109 ("over $1,600" from $183 − $49 = $134 × 12 = $1,608) is arithmetically sound, confirming this line is the outlier. Fix: "nearly $3,000/year" or "$2,988/year".

### [LOW] `src/app/help/page.tsx:46`
**Stock Unsplash photo captioned as "TenantFlow support team helping landlords with their portfolios" fabricates team imagery.**

The hero image is a generic Unsplash office photo (`images.unsplash.com/photo-1556761175...`) whose alt text asserts it depicts the actual TenantFlow support team. This is the same fabricated-identity class the project purged (invented executives, fake testimonials) per the banlist in `marketing-copy-landlord-only.test.ts`. Use a neutral alt description that doesn't claim the people shown are Tena

> Verifier: Line 45-46 pairs a generic Unsplash stock photo (photo-1556761175) with alt text asserting it depicts the actual "TenantFlow support team", while the project's active banlist test (`src/app/__tests__/marketing-copy-landlord-only.test.ts` lines 63-77) documents that invented team members/attribution are "banned until real attribution data is available" after the fabricated "Meet the Team" purge — this string just evades the literal phrase list. Sibling pages follow the sanctioned neutral pattern (about: "Professional team collaborating on property management solutions"; faq: "Modern office work

### [LOW] `src/app/resources/security-deposit-reference-card/page.tsx:628`
**Security-deposit reference card is still labeled "as of 2025" in mid-2026.**

The disclaimer says the 50-state deposit data reflects laws "as of 2025" while the current date is July 2026; the page itself warns that these laws "change frequently", so the resource is a year-plus stale by its own standard. Sibling: `src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts:174` still cites the IRS standard mileage rate as "2025: 70 cents/mile" although the 2026 ra

> Verifier: Line 628 literally reads "overview of state security deposit laws as of 2025" while the current date is 2026-07-11, and the same sentence admits "Laws change frequently," making the resource stale by its own standard. The cited sibling is also real: src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts:174 still says "IRS standard mileage rate for rental property trips (2025: 70 cents/mile)" although the 2026 rate has been in effect since January. Content-vintage issue only, no functional defect, hence low severity.


## Marketing UI consistency (26)

### [HIGH] `src/app/search/page.tsx:72`
**Search page container is missing `mx-auto` and horizontal padding, so content hugs the left edge on wide screens and touches the viewport edge on mobile.**

`containerClass="max-w-6xl py-8"` is applied to PageLayout's `<main>`, which sits in a plain flex column — with `max-w-6xl` but no `mx-auto` the block is left-aligned on any viewport wider than 1152px, and with no `px-6 lg:px-8` (and none on any inner wrapper) the heading, form, and result grid run edge-to-edge on mobile. Every other marketing page uses the `max-w-* mx-auto px-6 lg:px-8` container. `py-8` also competes with `page-offset-navbar` (both set padding-top on the same element).

> Verifier: `PageLayout` renders `<main className={cn("flex-1", "page-offset-navbar", containerClass)}>` inside a plain `flex flex-col` wrapper, so `max-w-6xl py-8` (src/app/search/page.tsx:72) yields a 72rem-capped block with no `mx-auto` (left-pinned at cross-start above 1152px viewports) and no `px-*` on main or any inner wrapper (inner div is just `flex flex-col gap-6`), so content runs edge-to-edge on mobile — `marketing-page` has no CSS definition anywhere and `page-offset-navbar` only sets padding-top. This violates the CLAUDE.md Marketing Pages container rule (`max-w-7xl mx-auto px-6 lg:px-8`), an

### [HIGH] `src/app/terms/page.tsx:416`
**Live Terms of Service still contains unfilled template placeholders "[Your State/Location]" and "[Your State]".**

Section 11.2 says arbitration "will be conducted in [Your State/Location]" (line 416) and Section 14 says the Terms are governed by "the laws of [Your State]" (line 465). These are template placeholders shipped verbatim on the public legal page, leaving the governing-law and arbitration-venue clauses literally blank and reading as an unfinished document. They must be replaced with the actual jurisdiction.

> Verifier: /Users/richard/Developer/tenant-flow/src/app/terms/page.tsx line 416 literally renders "Arbitration will be conducted in [Your State/Location]." and lines 465-466 render "the laws of [Your State], without regard to conflict of law principles" — unfilled template placeholders in the arbitration-venue and governing-law clauses of the public /terms page (a public route per PUBLIC_ROUTES marketing pages).

### [HIGH] `src/components/landing/hero-section.tsx:8`
**Features-page hero re-adds `page-offset-navbar` inside PageLayout, doubling the navbar offset.**

PageLayout already applies `page-offset-navbar` to its `<main>` (src/components/layout/page-layout.tsx:62), and CLAUDE.md explicitly says "Never re-add page-offset-navbar to children." This HeroSection is rendered inside PageLayout by src/app/features/features-client.tsx:54, so /features gets `padding-top: var(--layout-navbar-spacing)` twice — roughly double the top gap of every other marketing page. Correct is to drop `page-offset-navbar` from the section class list.

> Verifier: src/components/landing/hero-section.tsx:8 includes `page-offset-navbar` on its `<section>`, and this component's sole consumer is features-client.tsx:54 which renders it inside `<PageLayout>` (line 33) whose `<main>` already applies `page-offset-navbar` when showNavbar is true (page-layout.tsx:62, default). Since the utility is `padding-top: var(--layout-navbar-spacing)` (globals.css:1147-1149), parent and child paddings stack, giving /features double the navbar offset of every other marketing page — a direct violation of the CLAUDE.md rule "Never re-add `page-offset-navbar` to children."

### [HIGH] `src/components/pricing/bento-pricing-section.tsx:139`
**The Max plan card is rendered with `variant="enterprise"`, forcing a "Contact Sales" CTA even though Max is a published self-serve $149/mo plan.**

`PricingCardStandard` treats `variant="enterprise"` as contact-only: its mutation short-circuits to `window.location.href = "/contact"` (pricing-card-standard.tsx:68–71) and the CTA label renders "Contact Sales" (lines 272–276), so the configured `stripePriceIds` for Max (src/config/pricing.ts:180–183) are never used. The same card displays "$149/mo", "Save $298/year", and sits under the "14-day free trial, no credit card" trust row — and pricing.ts:14–19 documents that Phase 5 "removed all 'Custom pricing, contact sales' strings." A visitor cannot start a Max trial from the pricing page; the card should use the default self-serve checkout path like Starter.

> Verifier: bento-pricing-section.tsx:134-141 renders the Max card with `variant="enterprise"`, and pricing-card-standard.tsx:68-71 short-circuits the mutation to `window.location.href = "/contact"` with the CTA labeled "Contact Sales" (lines 272-276) — so Max's configured self-serve Stripe price IDs (pricing.ts:180-183, `price_1TVTaQ...`/`price_1TVTaU...`) are unreachable from the pricing page. The same card displays "$149/mo" and "Save $298/year" under the "14-day free trial, no credit card" trust row, and pricing.ts:14-19 documents Phase 5 "removed all 'Custom pricing, contact sales' strings," so the c

### [HIGH] `src/components/sections/hero-section.tsx:57`
**Hero `<h1>` uses the undefined class `text-responsive-display-xl`, so about/faq/help/blog hero titles render at base h1 size (24–30px).**

`text-responsive-display-xl` is not defined anywhere — globals.css only defines `text-responsive-display` and `text-responsive-display-lg` (lines 1095–1103) and there is no tailwind.config. The h1 therefore falls back to the base h1 rule (`--text-title-1` = clamp 24–30px, globals.css:443), while the homepage hero h1 is `text-3xl sm:text-5xl lg:text-6xl xl:text-7xl`. Result: the hero headlines on /about, /faq, /help (via this component) plus /blog (src/app/blog/page.tsx:180) and /blog/category/[category] (page.tsx:178) render barely larger than body text — a drastic, unintended cross-page inconsistency. Replace with a defined display utility or explicit responsive text classes.

> Verifier: `text-responsive-display-xl` has no definition anywhere — globals.css only declares `@utility text-responsive-display-lg` (line 1095) and `@utility text-responsive-display` (line 1100), there is no `--text-responsive-display-xl` theme token, and no tailwind.config exists — so Tailwind v4 emits no rule and the h1 falls back to the base h1 rule (globals.css:443, `font-size: var(--text-title-1)` = clamp(1.5rem,3vw,1.875rem) = 24–30px). This hits hero-section.tsx:57 (consumed by /about, /faq, /help), blog/page.tsx:180, and blog/category/[category]/page.tsx:178, and premium-cta.tsx:25 uses the equa

### [MEDIUM] `src/app/compare/[competitor]/compare-sections.tsx:9`
**Compare pages use raw Tailwind palette colors (text-green-600/red-400/amber-500/blue-500) instead of the semantic tokens used by the equivalent homepage table.**

`FeatureIcon` renders `text-green-600` (line 9), `text-red-400` (11), `text-amber-500` (13), `text-blue-500` (15), and the Why-Switch lists use `text-green-600` (174) and `text-blue-500` (187) — while the same feature-support icons in src/components/sections/comparison-table.tsx use `text-success`/`text-warning`/`text-muted-foreground` tokens. Raw palette values are not tuned by the `.dark` token overrides (globals.css:647+), so these icons don't brighten in dark mode like every token-colored icon, and the two comparison tables visibly disagree on the same semantic colors.

> Verifier: compare-sections.tsx lines 9/11/13/15/174/187 do use raw `text-green-600`/`text-red-400`/`text-amber-500`/`text-blue-500` with no `dark:` companions, while the homepage comparison-table.tsx renders the identical yes/partial/na feature-support states with semantic tokens (`text-success` line 237, `text-muted-foreground` 246, `text-warning` 254) that are dark-tuned via globals.css `.dark` overrides (--color-success/--color-warning at lines 670-676). This violates the project's established icon-token pattern (vivid `text-success`/`text-warning` for icons per the WCAG token-companion convention) a

### [MEDIUM] `src/app/compare/page.tsx:57`
**Compare index cards use `hover:bg-accent` (vivid green) without switching text color, making card text unreadable on hover.**

This theme redefines `--color-accent` as a saturated green (oklch 0.6 0.17 160, globals.css:163), not shadcn's neutral gray, and the card's children keep `text-muted-foreground` (oklch ~0.55) — roughly 1:1 contrast on the green hover fill in light mode, and similarly bad in dark (0.74 text on 0.7 bg). The blog category chips handle this by pairing `hover:bg-accent` with `hover:text-accent-foreground` (src/app/blog/page.tsx:198). Sibling with the same missing pairing: src/components/blog/blog-pagination.tsx:35.

> Verifier: src/app/compare/page.tsx:57 applies `hover:bg-accent` (globals.css:163 light oklch(0.6 0.17 160), :664 dark oklch(0.7 0.17 160)) with no `hover:text-accent-foreground`, and computed WCAG contrast of the card's `text-muted-foreground` children on that green fill is 1.86:1 in light and 1.06:1 in dark (near-invisible), with `text-primary-text` at 2.07:1 — all far below AA 4.5:1. The cited correct pattern exists at src/app/blog/page.tsx:198 (`hover:bg-accent hover:text-accent-foreground`), and the sibling src/components/blog/blog-pagination.tsx:35 has the same missing pairing (default foreground o

### [MEDIUM] `src/app/faq/faq-accordion.tsx:20`
**`FaqsAccordion` exists as two byte-identical duplicate components.**

`src/app/faq/faq-accordion.tsx` and `src/components/faq-accordion.tsx` are identical (verified via diff). /faq imports the app copy while the homepage `HomeFaq` imports the components copy, so any styling/behavior fix will silently apply to only one of the two FAQ surfaces. Keep one file and import it from both callers.

> Verifier: `diff` shows the two files are byte-identical (both 2877 bytes), and grep confirms the split callers: `src/app/faq/page.tsx:4` imports `#app/faq/faq-accordion` while `src/components/sections/home-faq.tsx:3` imports `#components/faq-accordion`, so any edit to one FAQ accordion silently leaves the other surface unchanged.

### [MEDIUM] `src/app/features/features-client.tsx:35`
**/features shows two competing sticky CTAs simultaneously — a custom top-right floating button plus the shared bottom StickyConversionCta bar.**

features-client.tsx implements its own scroll-triggered fixed CTA at `top-4 right-4 z-50` (appears past 800px scroll), and src/app/features/page.tsx:34 also renders the shared `StickyConversionCta` (bottom-pinned bar, appears past 600px scroll). After scrolling, visitors see both surfaces at once, and the top-right button sits inside the fixed navbar's band (navbar is `fixed top-0 h-18 z-50`), overlapping the navbar's own "Start free" CTA region. Every other marketing page (/pricing, /faq, /compare/*) uses only the shared bottom bar; the bespoke top-right one should go.

> Verifier: features-client.tsx:35-53 renders a bespoke `fixed top-4 right-4 z-50` "Start free — no card" button visible at scrollY>800, while features/page.tsx:34 also renders the shared `StickyConversionCta` (`fixed bottom-4 ... z-40`, threshold 600px default), so past 800px both sticky CTAs show simultaneously; the top-right button sits at y≈16-60px inside the navbar's fixed `top-0 ... z-50` 72px (`h-18`) band, painting over the navbar's own right-side "Start free"→/pricing CTA (navbar.tsx:22-23,73) since it renders later in the DOM at equal z-index. Grep confirms /pricing, /faq, and /compare/[competit

### [MEDIUM] `src/app/help/page.tsx:45`
**Help-page hero loads a stock photo from the Unsplash image API.**

`image.src` is `https://images.unsplash.com/photo-1556761175-...` with alt text claiming it shows the "TenantFlow support team", which it does not — it is a generic stock photo. External-image-API + stock-photo violation, and the alt text is factually misleading.

> Verifier: Line 45 of src/app/help/page.tsx does load `https://images.unsplash.com/photo-1556761175-b413da4baf72` (a generic stock office photo) via next/image with `images.unsplash.com` whitelisted in next.config.ts:72, and the alt text at line 46 ("TenantFlow support team helping landlords with their portfolios") is factually false — no TenantFlow team appears in it, which misleads screen-reader users and violates the brand-honesty standard. One caveat: CLAUDE.md's "never add stock photos or image APIs" rule is scoped to blog covers, and Unsplash heroes are an established pattern across 7 marketing/aut

### [MEDIUM] `src/app/pricing/pricing-content.tsx:100`
**Pricing FAQ and CTA section headings use undefined class `text-section-title`.**

`text-section-title` appears in no CSS file, so the h2s at lines 100 and 167 fall back to base h2 styling instead of the intended section-title scale, diverging from the explicit `text-3xl`/`text-4xl` section headings used on sibling marketing sections. Dead class also used at src/components/auth/update-password-form.tsx:104. Replace with a defined typography utility (e.g. `typography-h2`).

> Verifier: `text-section-title` is generated nowhere — globals.css `@theme` has no `--text-section-title` font-size token (only `--text-title-*`, `--text-display-*`, etc.), there is no `@utility text-section-title`, and the only similar CSS class is the unrelated `.dashboard-section-title` in dashboard.css:43 — so Tailwind v4 emits no CSS and the h2s at pricing-content.tsx:100/167 (plus update-password-form.tsx:104) fall back to base `h2` styling (`--text-title-2` = 20-24px). Sibling marketing section headings render at `text-3xl lg:text-4xl xl:text-5xl font-bold` (30-48px), so the pricing FAQ/CTA headin

### [MEDIUM] `src/app/privacy/page.tsx:184`
**Privacy Policy lists "Railway: Backend API hosting" as a data processor, but the architecture has no Railway backend.**

The stack is Next.js on Vercel + Supabase (PostgREST/RPC/Edge Functions) with no custom backend, yet section 4.1 (line 184) names Railway as a service provider receiving user data and section 5 (line 231) claims hosting on "SOC 2 compliant platforms (Supabase, Vercel, Railway)". A privacy policy enumerating a processor that doesn't exist is a public accuracy defect; remove Railway from both lists.

> Verifier: /Users/richard/Developer/tenant-flow/src/app/privacy/page.tsx line 184 lists "Railway: Backend API hosting" and line 231 claims hosting on "SOC 2 compliant platforms (Supabase, Vercel, Railway)", but a repo-wide grep shows Railway appears nowhere else in the codebase or config, and CLAUDE.md defines the architecture as Vercel-hosted Next.js + Supabase with "PostgREST + RPCs only. No custom backend." The privacy policy therefore publicly names a nonexistent data processor.

### [MEDIUM] `src/app/resources/page.tsx:206`
**`section-content` class is undefined, leaving the resources CTA and pricing result pages with zero vertical padding.**

globals.css defines only `section-spacing`, `section-spacing-compact`, and `section-spacing-spacious` — there is no `@utility section-content` (and no tailwind.config), so the class emits no CSS. Affected siblings: src/app/pricing/cancel/page.tsx:20 and src/app/pricing/success/success-client.tsx:47,65 (cards render flush against the navbar offset with no breathing room), plus the same-family dead class `section-compact` in src/app/pricing/complete/complete-client.tsx:105. These sections visibly lack the 5rem padding every sibling `section-spacing` section gets; replace with the correct defined utility.

> Verifier: Grep of all CSS (globals.css + dashboard.css, no tailwind.config exists) shows only `@utility section-spacing`/`-compact`/`-spacious` are defined — `section-content` and `section-compact` are neither project utilities nor Tailwind built-ins, so they emit zero CSS. All cited usages verified (resources/page.tsx:206, pricing/cancel/page.tsx:20, pricing/success/success-client.tsx:47+65, pricing/complete/complete-client.tsx:105) and none of these elements have any other padding-block, so the sections render without the vertical padding CLAUDE.md's marketing-page `section-spacing` convention mandate

### [MEDIUM] `src/app/resources/seasonal-maintenance-checklist/page.tsx:294`
**`page-content` class is undefined, so all three printable resource pages start with no top spacing.**

`page-content` appears in no CSS file, so `max-w-4xl mx-auto px-6 lg:px-8 page-content pb-16` yields only bottom padding — the "Back to Resources" row starts immediately at the navbar offset, unlike sibling text pages (/terms, /privacy) that use `section-spacing`. Same dead class on src/app/resources/landlord-tax-deduction-tracker/page.tsx:42 and src/app/resources/security-deposit-reference-card/page.tsx:514. Swap for `section-spacing` (or a real padding utility).

> Verifier: `page-content` appears only as a className in the three cited files (seasonal-maintenance-checklist/page.tsx:294, landlord-tax-deduction-tracker/page.tsx:42, security-deposit-reference-card/page.tsx:514) and is defined nowhere — grep over globals.css and dashboard.css finds no `.page-content` or `@utility page-content` (only `content-section`/`content-padded`/`content-compact`), and it is not a Tailwind v4 built-in, so the wrapper gets only `pb-16` with zero top padding. Sibling text pages /terms/page.tsx:18 and /privacy/page.tsx:18 use `section-spacing` inside the same PageLayout, confirming 

### [MEDIUM] `src/app/resources/seasonal-maintenance-checklist/page.tsx:23`
**Resource pages hard-code light-only palette colors (bg-green-50/amber-50/blue-50 + text-*-900) that break dark mode.**

Dark mode is class-based token swapping (`.dark` overrides in globals.css), so fixed classes like `bg-green-50 border-green-200` / `bg-amber-100 text-amber-900` stay light in dark mode — equivalent to the banned `bg-white` — while table rows inside the same card use `bg-background/50`, which flips dark, producing dark rows inside pastel-light headers. Siblings: this file lines 23–24, 81–82, 139, 197–198; src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts:17–18, 43–44, 73–74, 189–190; src/app/resources/landlord-tax-deduction-tracker/page.tsx:69–70 (amber disclaimer box); src/app/resources/security-deposit-reference-card/page.tsx:542, 548, 601, 610, 625–626. Correct is semantic tokens (bg-success/10, text-warning-text, etc.).

> Verifier: Root layout mounts next-themes with `attribute="class"` + `enableSystem` (src/components/providers.tsx:32-38), so resource pages do receive `.dark` for dark-preference users, yet seasonal-maintenance-checklist/page.tsx:23-24/81-82/138-139/197-198 hard-code `bg-green-50 border-green-200` / `bg-amber-100 text-amber-900` etc. with no `dark:` variants while the rows inside the same card (line 354) use token-based `bg-background/50`/`bg-background/80` that flips dark — concretely: system dark mode renders semi-transparent dark rows with light `text-foreground` blended over a pastel-light card/heade

### [MEDIUM] `src/components/blog/blog-card.tsx:36`
**Blog cards display the raw kebab category slug (e.g. "lease-law") instead of the humanized label used everywhere else.**

`blogs.category` stores the kebab slug (documented in blog-post-breadcrumb.tsx:20–26 and blog/category/[category]/page.tsx:80–82), and every other surface humanizes it via `categoryLabel()` (post chip, breadcrumbs, category h1). BlogCard renders `{post.category}` verbatim, so every card on /blog, /blog/category/*, /search, related-articles, and compare pages shows "software-vault"-style text. Sibling: the category filter chips at src/app/blog/page.tsx:200 render `{cat.name}`, which the `get_blog_categories` RPC returns as the raw kebab column value (supabase/migrations/20260307120000_blog_categories_rpc.sql:14). Both should go through `categoryLabel()`.

> Verifier: `blogs.category` stores the kebab slug per the repo's own single-source-of-truth doc (src/lib/seo/blog-categories.ts:1-12: "stores the kebab slug directly... `get_blog_categories` RPC therefore returns `name === slug`"), and the mapper at src/hooks/api/query-keys/blog-keys.ts:106 passes it through raw, so BlogCard's `{post.category}` at blog-card.tsx:36 renders "lease-law"/"software-vault" verbatim on every card while breadcrumbs, the post chip (blog-post-page.tsx:137), and category h1/title all humanize via `categoryLabel()`. The sibling is also real: the filter chips at src/app/blog/page.tsx

### [MEDIUM] `src/components/pricing/pricing-comparison-table.tsx:128`
**Pricing comparison table grants "Priority email support" to Starter, contradicting the help/features pages which reserve priority support for Growth and Max.**

The Support category marks "Priority email support" true for all three tiers (lines 127–132), and src/config/pricing.ts:129–131 gives Starter `support: "Priority Email"` — but /help states "Email support on every plan. Phone and priority support on Growth and Max" (src/app/help/page.tsx:37,43,56–57) and the homepage features grid repeats it (src/components/sections/features-section.tsx:48). One of the two claims is wrong on a public commercial page; the copy must be reconciled.

> Verifier: pricing-comparison-table.tsx:127-132 marks "Priority email support" starter:true and src/config/pricing.ts:129-131 gives Starter "Priority email support"/support:"Priority Email", while src/app/help/page.tsx:37,43,56-57 says "Email support on every plan. Phone and priority support on Growth and Max" and features-section.tsx:48 repeats "Phone and priority support on Growth and Max" — the pricing surfaces and the help/homepage surfaces make directly contradictory claims about whether Starter includes priority support on public commercial pages.

### [MEDIUM] `src/components/sections/hero-section.tsx:26`
**Trust badge uses undefined class `inline-flex-center`, so the FAQ hero badge renders as a full-width block with stacked children.**

There is no `inline-flex-center` utility in any CSS file (only `flex-center`, globals.css:1421). Without it the pill `<div>` is display:block — it stretches to the container width and the pulse-dot `<div>` stacks above the label instead of sitting inline beside it. /faq passes `trustBadge="Built for landlords"` so this broken badge is live. Same dead class also appears in src/components/ui/toggle.tsx:6 and src/components/maintenance/maintenance-form.client.tsx:85.

> Verifier: `inline-flex-center` appears at hero-section.tsx:26, toggle.tsx:6, and maintenance-form.client.tsx:85, but the only `@utility` definitions in the repo's two CSS files (globals.css:1421 defines `flex-center`; dashboard.css has none) never define it, and Tailwind's built-in is `inline-flex` — so the class emits no CSS and the pill div falls back to display:block. `/faq` (src/app/faq/page.tsx:39) passes `trustBadge="Built for landlords"`, so the live badge renders full-width with the block pulse-dot div stacked above the inline label instead of an inline pill.

### [MEDIUM] `src/components/sections/premium-cta.tsx:25`
**Homepage Premium CTA headline uses undefined class `text-responsive-display-2xl`, collapsing to base h2 size.**

No `text-responsive-display-2xl` utility exists (globals.css tops out at `text-responsive-display-lg`), so the h2 falls back to the base h2 rule (`--text-title-2` clamp), far smaller than the intended 2xl display scale — while its nested span uses the defined `text-responsive-display-lg`, making the "highlight" line render LARGER than the main headline line. The homepage closing CTA hierarchy is visibly inverted.

> Verifier: `text-responsive-display-2xl` appears only at premium-cta.tsx:25 and is defined nowhere — globals.css `@utility` set tops out at `text-responsive-display-lg` (lines 1095-1103) and no `--text-responsive-display-2xl` theme token exists, so Tailwind v4 emits no CSS and the h2 falls back to the base h2 rule (globals.css:451, `--text-title-2` = clamp 20-24px). Meanwhile the nested span at line 31 uses the real `text-responsive-display-lg` (`--text-display-lg` = clamp 40-64px), so the "for your portfolio" line renders 2-3x larger than the main "Stop juggling" line — the headline hierarchy is concret

### [LOW] `src/app/blog/loading.tsx:27`
**Blog loading skeleton uses `pt-8` for the breadcrumb while the real page uses `pt-12`, causing a 16px layout shift on load.**

The streaming skeleton renders the breadcrumb container with `pt-8` but src/app/blog/page.tsx:162 renders it with `pt-12`, so content jumps down when the resolved page swaps in. The category page (src/app/blog/category/[category]/page.tsx:154) uses `pt-8`, so /blog and /blog/category/* also disagree with each other on breadcrumb offset. Pick one value across all three.

> Verifier: src/app/blog/loading.tsx:27 renders the breadcrumb container with `pt-8` (32px) while src/app/blog/page.tsx:162 renders the identical container with `pt-12` (48px), both inside the same PageLayout, so the streaming swap shifts all content down 16px. Additionally src/app/blog/category/[category]/page.tsx:154 uses `pt-8`, so /blog and /blog/category/* genuinely disagree on breadcrumb offset as claimed.

### [LOW] `src/app/help/page.tsx:157`
**Help resource badges alternate between the AA-safe `text-primary-text` token and the raw vivid `text-accent` token for text.**

Two badges use `bg-primary/10 text-primary-text` (lines 150, 164 — the `-text` companion tokens exist precisely for readable text) while the other two use `bg-accent/10 text-accent` (lines 157, 171) — accent has no `-text` companion (globals.css defines success/warning/destructive/primary/info `-text` only) and the vivid oklch(0.6 0.17 160) green is a poor text contrast on a light background. The 

> Verifier: help/page.tsx lines 150/164 use `bg-primary/10 text-primary-text` while sibling badges at 157/171 use `bg-accent/10 text-accent`; globals.css defines `-text` companions only for success/warning/destructive/primary/info (lines 181-185, 675-679) — no `--color-accent-text` exists — and `--color-accent` is vivid oklch(0.6 0.17 160) (line 163), the same vivid-token-as-text pattern the project's own vivid-token guidance flags as failing AA in light mode for 12px `text-xs` badge text.

### [LOW] `src/app/pricing/complete/page.tsx:19`
**/pricing/complete does not wrap in PageLayout — no navbar, footer, or grid background, unlike its sibling checkout-result pages.**

/pricing/success and /pricing/cancel both wrap in PageLayout (navbar + footer + page-offset), but this page renders CompleteClient bare, so the visitor lands on a chrome-less page with no way to navigate except the in-card links. This violates the "every marketing page wraps in PageLayout" rule and is an unintentional divergence within the same checkout-result page family.

> Verifier: Verified: `src/app/pricing/complete/page.tsx:16-20` renders `CompleteClient` bare while both siblings wrap in `PageLayout` (`success/page.tsx:20`, `cancel/page.tsx:19`), and no `layout.tsx` exists in `src/app/pricing/` nor does the root layout render navbar/footer — so /pricing/complete serves chrome-less (CompleteClient even carries its own legacy `min-h-screen` wrapper), violating the CLAUDE.md "PageLayout wraps all marketing pages" rule. Severity downgraded to low because no live flow reaches it: the stripe-checkout edge function's `success_url` points to `/dashboard?checkout=success` (`sup

### [LOW] `src/app/resources/page.tsx:228`
**CTA button references undefined class `gradient-background`.**

No `gradient-background` utility exists in any CSS file, so the intended gradient never renders and the button silently falls back to the Button default variant background with a stray `hover:opacity-90`. Either define the utility or drop the class so the styling intent and output match.

> Verifier: Line 228 of src/app/resources/page.tsx applies `gradient-background`, but a repo-wide grep (excluding node_modules/.next) finds that string nowhere else — no `@utility gradient-background` in globals.css (which defines its custom utilities via `@utility`, e.g. `hero-highlight`) and no such built-in Tailwind v4 class exists, so no CSS is generated for it. The button therefore renders with the Button default `bg-primary` plus a leftover `hover:opacity-90`; cosmetic only, so severity low.

### [LOW] `src/app/resources/page.tsx:100`
**Resources hero "highlight" span de-emphasizes instead of highlighting, diverging from the `hero-highlight` pattern used on every other hero.**

All other marketing heroes highlight the accent phrase with `hero-highlight` (primary color + underline bar), but this h1 wraps "landlords" in `text-foreground font-semibold` — the same color as the rest of the heading at a LOWER weight than the surrounding `font-bold`, so the "highlight" actually looks faded. The CTA heading at lines 215–217 repeats the same anti-pattern. Both look like an uninte

> Verifier: Line 101 wraps "landlords" in `text-foreground font-semibold` inside an h1 already `font-bold text-foreground`, so the span is identical color at a lower weight (600 vs 700) — visually faded, not highlighted — and lines 215-217 repeat the pattern in the CTA h2. The established `hero-highlight` utility (globals.css:685-702, primary color + underline bar) is used on every other marketing hero/heading (marketing-home.tsx:50, pricing/page.tsx:68, about/page.tsx:257, testimonials-section.tsx:104 which highlights the same word "landlords", plus 5 more), confirming this page is an unintentional diver

### [LOW] `src/components/landing/feature-backgrounds.tsx:24`
**Inline `style` attributes in marketing components violate the zero-tolerance no-inline-styles rule.**

`style={{ animationDelay: ... }}` at line 24 is applied to a `card-standard` element with no animation, so it's a dead inline style; line 249 sets `style={{ height: `${height}%` }}` for fake chart bars. Siblings: src/components/sections/hero-dashboard-mockup.tsx:107–110 (height + animationDelay) and src/app/pricing/pricing-content.tsx:70 (animationDelay on Card). CLAUDE.md rule 5 requires Tailwind utilities or CSS custom properties; the chart heights can use arbitrary-value classes or a CSS var, and the no-op animationDelay props should be deleted.

> Verifier: All cited inline styles exist as claimed: `src/components/landing/feature-backgrounds.tsx:24` has `style={{ animationDelay: ... }}` on a `card-standard` div, and `card-standard` (globals.css:1437) is only `rounded-lg border bg-card shadow-sm` with no animation — the delay is a dead no-op; line 249 sets `style={{ height: \`${height}%\` }}` from a hardcoded static array (expressible as Tailwind arbitrary-value classes), and siblings hero-dashboard-mockup.tsx:107-110 and pricing-content.tsx:70 match. CLAUDE.md zero-tolerance rule 5 ("No inline styles — Tailwind utilities or globals.css custom pro

### [LOW] `src/components/sections/features-section.tsx:66`
**Three homepage sections use `container px-4` instead of the standard `max-w-7xl mx-auto px-6 lg:px-8`, giving them different widths and gutters.**

FeaturesSectionDemo (`container px-(--spacing-4)`, this line), StatsShowcase (src/components/sections/stats-showcase.tsx:53) and PremiumCta (src/components/sections/premium-cta.tsx:20) use Tailwind's `container` (max-width up to 1536px) with 16px side padding, while the hero, HowItWorks, TestimonialsSection, and HomeFaq on the same homepage use `max-w-7xl` (1280px) with 24/32px padding. On wide screens alternate homepage sections are ~256px wider than their neighbors, and mobile gutters shrink from 24px to 16px — the documented container convention should be applied.

> Verifier: features-section.tsx:66 (`container px-(--spacing-4)`), stats-showcase.tsx:53 and premium-cta.tsx:20 (`container px-4`) all render on the homepage via src/app/marketing-home.tsx, while sibling sections (hero-section.tsx:40, how-it-works.tsx:68, testimonials-section.tsx:70/100, logo-cloud.tsx:48) use `max-w-7xl mx-auto px-6 lg:px-8` — the exact convention CLAUDE.md's Marketing Pages section mandates. globals.css defines no `@utility container` override, so Tailwind v4's default `container` applies (max-width 1536px at the 2xl breakpoint vs 1280px for max-w-7xl, i.e. ~256px wider on wide screens


## Accessibility (41)

### [HIGH] `src/app/(owner)/properties/units/components/unit-status-badge.tsx:42`
**Unit status badge text uses near-white `*-foreground` tokens on 10% tint backgrounds, making badge labels unreadable in light mode.**

Lines 26, 34, and 42 pair `bg-accent/10 text-accent-foreground`, `bg-primary/10 text-primary-foreground`, and `bg-destructive/10 text-destructive-foreground`. In light mode these `-foreground` tokens are near-white (globals.css:160/164/168, all oklch ~0.98 lightness) rendered over a 10% tint of the same hue on a white card — effectively white-on-white, so "Occupied", "Available", and "Maintenance" labels in the units table (columns.tsx:166) and unit detail dialog are illegible. Correct is the `-text` companion tokens (e.g. `text-destructive-text`) or the `status-badge-*` utilities already defined in globals.css:900.

> Verifier: In light mode `text-accent-foreground`/`text-primary-foreground`/`text-destructive-foreground` resolve to oklch 0.98-lightness near-white (globals.css:160/164/168) while the badge backgrounds are 10% alpha tints composited on a 0.99-lightness card — roughly 1:1 contrast; tailwind-merge in `cn()` makes these classes beat the Badge variant's solid `bg-primary`/`text-white`, so nothing rescues it, and the `dark:text-accent` overrides confirm only light mode is broken. Component is live in units columns.tsx, unit-detail-dialogs.tsx, and unit-actions.tsx, and the repo's own comment block (globals.c

### [MEDIUM] `src/app/(owner)/documents/templates/components/clauses-editor.tsx:51`
**Icon-only Trash2 remove-clause button has no aria-label.**

The Button at lines 51-58 contains only `<Trash2 className="size-4" />` with no aria-label, violating the icon-only-button rule. A screen-reader user editing template clauses hears an unnamed button next to each clause and cannot tell it deletes the clause. Correct is `aria-label={\`Remove clause ${index + 1}\`}`. Additionally the `<Label>Clause {index + 1}</Label>` at line 50 has no htmlFor and the Input at line 60 no id, so the clause input's only name is its placeholder.

> Verifier: Lines 51-58 of src/app/(owner)/documents/templates/components/clauses-editor.tsx render a Button whose only child is `<Trash2 className="size-4" />` — no aria-label, title, or sr-only text — directly violating the CLAUDE.md accessibility rule "Icon-only buttons: aria-label, not just title" (lucide icons render aria-hidden SVGs, so the button has an empty accessible name). The secondary claim also holds: the `<Label>Clause {index + 1}</Label>` at line 50 has no htmlFor and the Input at lines 60-64 has no id, leaving the input associated only with its placeholder.

### [MEDIUM] `src/app/(owner)/documents/templates/components/custom-fields-editor.tsx:58`
**Icon-only Trash2 remove-field button has no aria-label.**

The Button at lines 58-65 renders only a Trash2 icon with no accessible name — same defect class as clauses-editor. Screen readers announce an unnamed button per custom field. Correct is `aria-label={\`Remove field ${index + 1}\`}`. The adjacent `<Label>Field {index + 1}</Label>` (line 57) is also unassociated, and the Label/Value Inputs at lines 68/75 are named only by placeholders.

> Verifier: Lines 58-65 of src/app/(owner)/documents/templates/components/custom-fields-editor.tsx render a Button whose only child is `<Trash2 className="size-4" />` with no aria-label, title, sr-only text, or aria-labelledby, directly violating the CLAUDE.md rule "Icon-only buttons: `aria-label`, not just `title`" — screen readers announce an unnamed button for each field. The secondary points also hold: the `<Label>Field {index + 1}</Label>` at line 57 has no htmlFor/association, and the Inputs at lines 68 and 75 have only `placeholder` as a name source.

### [MEDIUM] `src/app/(owner)/documents/templates/components/dynamic-form.tsx:132`
**Icon-only Trash2 remove-list-item button has no aria-label.**

The Button at lines 132-144 (inside the list-field renderer) contains only a Trash2 icon with no accessible name; each list item's remove control is announced as an unnamed button. Correct is `aria-label={\`Remove ${field.itemLabel ?? "item"} ${index + 1}\`}`. The `<Label>{field.label}</Label>` at line 113 is likewise unassociated with its control (no htmlFor/id), and the item Inputs at line 190 are named only by placeholder.

> Verifier: Lines 132-144 of src/app/(owner)/documents/templates/components/dynamic-form.tsx render a Button whose only child is `<Trash2 className="size-4" />` with no aria-label, title, or sr-only text (and #components/ui/button adds none), so screen readers announce an unnamed button — a direct violation of the CLAUDE.md Accessibility rule "Icon-only buttons: `aria-label`, not just `title`". The secondary claims also hold: the `<Label>{field.label}</Label>` at line 113 has no htmlFor, and the item `<Input>`s at line 190 have no id linking them to the unassociated `<Label>` at line 187, leaving placehol

### [MEDIUM] `src/app/(owner)/documents/templates/components/form-builder-panel.tsx:150`
**Icon-only Trash2 remove-custom-field button has no aria-label.**

The Button at lines 150-157 contains only a Trash2 icon and no aria-label — an unnamed destructive control for screen-reader users. Correct is `aria-label={\`Remove custom field ${index + 1}\`}`.

> Verifier: Lines 150-157 of form-builder-panel.tsx render a Button whose only child is `<Trash2 className="size-4" />` with no aria-label, title, or sr-only text, so the destructive remove-field control has no accessible name. This directly violates the CLAUDE.md Accessibility rule "Icon-only buttons: `aria-label`, not just `title`".

### [MEDIUM] `src/app/(owner)/documents/templates/components/form-builder-panel.tsx:161`
**Form-builder field inputs have visible Labels that are not programmatically associated, leaving inputs with no accessible name.**

`<Label>Label</Label>` (161), `<Label>Field key</Label>` (170), `<Label>Type</Label>` (185), `<Label>Section</Label>` (205), and `<Label>Options (comma-separated)</Label>` (216) all lack htmlFor, and the paired Inputs at 162 and 171 have no id, no placeholder, and no aria-label — they are completely nameless to assistive tech (axe form-field-has-label failure). Clicking the label also does not focus the input. Correct is htmlFor/id pairs (e.g. `htmlFor={\`field-label-${index}\`}`).

> Verifier: Verified in src/app/(owner)/documents/templates/components/form-builder-panel.tsx — all five `<Label>`s (lines 161, 170, 185, 205, 216) render Radix `LabelPrimitive.Root` with no `htmlFor`, and the paired `<Input>`s (162, 171, 217) are plain `<input>`s (src/components/ui/input.tsx spreads props, no auto-id) with no `id`/`aria-label`/`aria-labelledby`/placeholder, so they have an empty accessible name (axe "label" rule failure, WCAG 4.1.2) and clicking the label does not focus the input; only the Section input (206) gets a fallback name from its placeholder.

### [MEDIUM] `src/app/(owner)/properties/units/components/unit-status-badge.tsx:50`
**Bare `dark:text-muted` uses the muted surface token as text color, violating the repo rule and producing dark-on-dark text.**

The "reserved" status config uses `dark:bg-muted/20 dark:text-muted` — `--muted` is a surface color, so in dark mode the "Reserved" label renders in a dark surface tone on a dark 20% muted tint, nearly invisible. CLAUDE.md mandates `text-muted-foreground` for muted text and forbids bare `text-muted`. Correct is `dark:text-muted-foreground`.

> Verifier: Line 50 of `src/app/(owner)/properties/units/components/unit-status-badge.tsx` contains `dark:bg-muted/20 dark:text-muted`, and in dark mode `globals.css` line 650 defines `--color-muted: oklch(0.22 0.02 255)` — a dark surface tone — while the badge sits on `--color-background: oklch(0.14 ...)` tinted with 20% muted, yielding roughly 1.1:1 contrast (near-invisible "Reserved" text); this directly violates CLAUDE.md's Accessibility rule "`text-muted-foreground` for muted text (never bare `text-muted`)". The sibling statuses get away with the `dark:text-<token>` pattern only because `primary`/`ac

### [MEDIUM] `src/components/data-table/data-table-date-filter.tsx:180`
**Clear-filter control is a role="button" div nested inside the popover trigger Button with no keyboard handler.**

Lines 179-186: same defect class as data-table-slider-filter.tsx:135 — `role="button" tabIndex={0}` div with onClick only, nested inside the trigger Button. Keyboard activation cannot reach onReset. Same fix applies.

> Verifier: Lines 179-187 of data-table-date-filter.tsx render a `role="button" tabIndex={0}` div with only `onClick={onReset}` (line 183) and zero `onKeyDown` handlers anywhere in the file; divs get no native Enter/Space activation, so a keyboard user who tabs to the focusable clear control cannot invoke onReset, violating the WAI-ARIA button pattern. It is also a nested interactive control inside the PopoverTrigger `<Button>` (invalid HTML), identical to the defect at data-table-slider-filter.tsx:135.

### [MEDIUM] `src/components/data-table/data-table-faceted-filter.tsx:83`
**Clear-filter control is a role="button" div nested inside the popover trigger Button with no keyboard handler.**

Lines 82-89: same defect class as the slider and date filters — nested role="button" div with onClick={onReset} and no onKeyDown. Keyboard users cannot clear the faceted filter. Same fix applies.

> Verifier: Lines 82-90 render a `role="button"` div with `tabIndex={0}` and `onClick={onReset}` but no `onKeyDown`, nested inside the PopoverTrigger `<Button>` — Tab lands on it (announced as "Clear {title} filter, button") yet Enter/Space do nothing since divs have no default activation and key events on a descendant do not activate the parent button, producing a focusable-but-inoperable dead control and invalid nested-interactive markup. Severity stays medium rather than high because a keyboard-reachable "Clear filters" CommandItem exists inside the popover (lines 168-178), so the function itself has a

### [MEDIUM] `src/components/data-table/data-table-slider-filter.tsx:135`
**Clear-filter control is a role="button" div nested inside the popover trigger Button with no keyboard handler.**

Lines 134-141 render `<div role="button" tabIndex={0} onClick={onReset}>` inside the `<Button>` PopoverTrigger — a nested interactive control (invalid ARIA) whose onClick has no matching onKeyDown, so Enter/Space on it either does nothing or opens the popover instead of clearing the filter. Keyboard users cannot clear the range filter. Correct is a sibling real `<button>` outside the trigger, or Enter/Space key handling plus un-nesting.

> Verifier: Lines 133-142 render `<div role="button" tabIndex={0} onClick={onReset}>` with no onKeyDown inside the PopoverTrigger's native `<button>` (button.tsx renders `Comp = "button"`), which is invalid nested-interactive ARIA/HTML, and Enter/Space on the focused div does nothing since divs have no default activation and the parent button only activates when it itself is focused — so the announced "Clear {title} filter" control is dead to keyboard users. Severity stays medium (not high) because a real `<Button>Clear</Button>` inside the PopoverContent (lines 227-234) gives keyboard users an alternate 

### [MEDIUM] `src/components/inspections/inspection-photo-upload.tsx:295`
**Hover-only-revealed remove-photo button is invisible when focused via keyboard.**

The pending-photo remove button (lines 291-298) uses `opacity-0 group-hover:opacity-100` with no focus-visible companion, so it disappears for keyboard users despite being in the tab order. Correct is `focus-visible:opacity-100`.

> Verifier: At line 295 the pending-photo remove button's classes are exactly `opacity-0 group-hover:opacity-100 transition-opacity` with no `focus-visible:opacity-100`/`focus:opacity-100` companion, and the parent tile (line 238) only exposes it via `group` hover. Since it is a native `<button>` with no `tabindex="-1"`, a keyboard user tabbing to it focuses a control that remains at opacity 0 — an invisible focused element (WCAG 2.4.7 failure); the sibling error-state buttons (lines 270-285) are always visible, so only this pending-state button is affected.

### [MEDIUM] `src/components/landing/feature-backgrounds.tsx:171`
**Vivid `text-success`/`text-warning` tokens on visible small text in landing feature previews fail WCAG AA contrast.**

Line 171 renders lease status text ("Renewing"/"Active") as `text-xs` with `text-warning`/`text-success`; line 38 renders occupancy percentages with `text-success font-medium`; line 241 renders "+12.5%" with `text-xs font-medium text-success`; lines 312-313 render document status badge text with `bg-success/10 text-success` / `bg-warning/10 text-warning`. These are visible text at small sizes where text-success (~2.59:1) and text-warning (~2.15:1) fail AA in light mode. Correct is `text-success-text`/`text-warning-text`.

> Verifier: All cited lines check out — line 38 `text-success font-medium`, line 171 `text-warning`/`text-success` on text-xs status text, line 241 `text-success` on "+12.5%", lines 311-313 `bg-success/10 text-success`/`bg-warning/10 text-warning` badges — and globals.css lines 173-183 explicitly documents that vivid `--color-success`/`--color-warning` fail WCAG AA as light-mode text (~2.6:1 / ~2.2:1) and that `--color-success-text`/`--color-warning-text` are the AA-safe companions, matching the project's vivid-token rule (text-X-text for TEXT, vivid for icons/fills). Mitigating context only: these previe

### [MEDIUM] `src/components/layout/navbar/navbar-mobile-menu.tsx:72`
**Mobile nav submenu can only be expanded by clicking a raw SVG chevron — no keyboard or screen-reader access.**

The dropdown toggle is an `onClick` handler placed directly on the `ChevronDown` icon (lines 67-77) nested inside a `<Link>`; the SVG is not focusable, has no role, no keyboard handler, and no aria-expanded. Keyboard and assistive-technology users cannot open the Features/Resources submenus in the mobile menu at all — pressing Enter on the Link navigates away instead. Correct is a separate `<button aria-expanded={...} aria-label="Toggle {item.name} submenu">` beside the Link.

> Verifier: Verified at src/components/layout/navbar/navbar-mobile-menu.tsx:66-77 — the submenu toggle is an `onClick` on the `ChevronDown` SVG nested inside the `<Link>`, with no tabindex, role, keyboard handler, or `aria-expanded`, so keyboard/AT users cannot expand the inline submenu (Enter on the Link navigates to `item.href`), a WCAG 2.1.1 Level A failure mirrored nowhere else in the component. Severity is medium not high because only "Resources" has a dropdown (types.ts:37-47; Features does not, as the claim asserts) and every submenu destination remains keyboard-reachable — Enter lands on the `/res

### [MEDIUM] `src/components/leases/table/leases-table-toolbar.tsx:49`
**Leases status filter select has no accessible name; search input is placeholder-only.**

The native `<select>` at lines 49-63 has no label, aria-label, or title — a `<select>` gets no name from its options, so screen readers announce an unnamed combobox (axe select-name failure). The search `<input>` at lines 29-35 relies on placeholder alone, which vanishes once text is entered. Correct is `aria-label="Filter by status"` on the select and `aria-label="Search leases"` on the input.

> Verifier: Lines 49-63 of leases-table-toolbar.tsx render a native `<select>` with no label/aria-label/title — options never contribute to a select's accessible name, so this is a concrete axe `select-name` failure (unnamed combobox to screen readers). The sibling `src/components/properties/property-toolbar.tsx` establishes the project pattern with `aria-label="Filter by status"` (line 52) and `aria-label="Search properties by name, address, or city"` (line 44), so both controls deviate from the codebase standard; note the input half is slightly overstated since placeholder does yield an accessible name 

### [MEDIUM] `src/components/leases/table/leases-table.tsx:229`
**Icon-only pagination buttons (previous/next page) have no aria-label.**

The buttons at lines 229-235 and 239-245 contain only `ChevronLeft`/`ChevronRight` icons with no aria-label, no title, and no sr-only text. Screen readers announce them as unnamed buttons, so users cannot tell they page the leases table. CLAUDE.md requires aria-label on icon-only buttons; correct is `aria-label="Previous page"` / `aria-label="Next page"`.

> Verifier: Lines 229-235 and 239-247 of src/components/leases/table/leases-table.tsx render `<button>` elements whose only child is `<ChevronLeft className="w-4 h-4" />` / `<ChevronRight className="w-4 h-4" />` with no aria-label, title, or sr-only text, so screen readers announce them as unnamed buttons. This directly violates the CLAUDE.md Accessibility rule "Icon-only buttons: `aria-label`, not just `title`".

### [MEDIUM] `src/components/maintenance/cards/maintenance-card.tsx:113`
**Hover-only-revealed "More options" button is invisible on keyboard focus and performs no action.**

The button (lines 108-117) uses `opacity-0 group-hover:opacity-100` with no focus reveal, so keyboard users focus an invisible control; its onClick only calls stopPropagation/preventDefault, so activating it does nothing at all — a focusable dead control announced as "More options". Correct is either wiring it to a real menu with focus-visible reveal, or removing it.

> Verifier: Line 113 classes are exactly `opacity-0 group-hover:opacity-100` with no `focus:`/`focus-visible:` reveal anywhere (grep of globals.css and maintenance components found none), and `opacity-0` keeps the button in tab order — so keyboard users land on an invisible control announced as "More options"; its onClick (lines 109-112) contains only `stopPropagation()`/`preventDefault()`, so activation does nothing (WCAG 2.4.7 failure plus a dead control). It is additionally rendered nested inside the outer wrapper `<button>` (line 156) or `<Link>` (line 163) via maintenance-sortable-card/kanban, which 

### [MEDIUM] `src/components/maintenance/detail/maintenance-header-card.tsx:94`
**Icon-only Download/export button has no aria-label.**

`<Button variant="outline" size="sm" onClick={onExport}>` at lines 94-96 contains only `<Download className="size-4" />` — no aria-label, title, or sr-only text. Screen-reader users on the maintenance detail page get an unnamed button next to Edit. Correct is `aria-label="Export request"`.

> Verifier: Lines 94-96 of src/components/maintenance/detail/maintenance-header-card.tsx render `<Button variant="outline" size="sm" onClick={onExport}>` whose only child is `<Download className="size-4" />` — no aria-label, title, or sr-only text anywhere in the element, so the button has no accessible name. This directly violates the CLAUDE.md Accessibility rule "Icon-only buttons: `aria-label`, not just `title`".

### [MEDIUM] `src/components/properties/property-image-gallery.tsx:128`
**Property gallery images open the lightbox via a clickable div with no keyboard access.**

Each image tile is a `<div ... onClick={() => goToImage(idx)}>` (lines 127-131) with `cursor-pointer` but no role, tabIndex, or key handler. Keyboard users cannot open the image lightbox at all — the only focusable element inside is the (editable-mode-only) delete button. Correct is a `<button>` wrapper or role="button" + tabIndex={0} + Enter/Space handling.

> Verifier: Lines 127-132 of src/components/properties/property-image-gallery.tsx render each tile as `<div ... onClick={() => goToImage(idx)}>` with no role, tabIndex, or key handler, and `goToImage` in src/hooks/use-lightbox-state.ts (lines 27-30) is the sole path that sets `lightboxOpen=true` — so a keyboard-only user has no focusable element that opens the lightbox (the editable-mode delete Button is the only focusable child and it stopPropagations into the delete dialog instead). This is a concrete WCAG 2.1.1 keyboard-operability failure, medium because it blocks a secondary view-enlargement flow, no

### [MEDIUM] `src/components/properties/property-image-gallery.tsx:154`
**Hover-only-revealed delete image button is invisible when focused via keyboard.**

The delete Button uses `opacity-0 group-hover:opacity-100` (line 154) with no `focus-visible:opacity-100` / `group-focus-within` companion. Tabbing to it leaves the button (and its focus ring) at opacity 0, so sighted keyboard users operate an invisible destructive control. Correct is adding `focus-visible:opacity-100` (or `group-focus-within:opacity-100`).

> Verifier: Line 154 of src/components/properties/property-image-gallery.tsx applies `opacity-0 group-hover:opacity-100` to a real, tab-focusable shadcn `<Button>` (aria-label "Delete image") with no `focus-visible:opacity-100`/`group-focus-within:opacity-100` anywhere in the file or globals.css; button.tsx's base classes add a focus ring but never restore opacity, so on keyboard Tab (no hover) the destructive button and its focus ring remain at opacity 0 — an invisible focused control (WCAG 2.4.7 failure).

### [MEDIUM] `src/components/properties/property-table-toolbar.tsx:36`
**Columns menu trigger lacks aria-expanded and the custom menu has no Escape handling.**

The "Columns" Button (lines 36-50) opens a hand-rolled dropdown (lines 52-88) closed only by clicking the invisible backdrop div at line 54. There is no `aria-expanded` on the trigger and no Escape key handling for the open menu, so keyboard users must Tab away or click elsewhere to dismiss it. Correct is aria-expanded + Escape handler, or the existing DropdownMenu primitive.

> Verifier: Lines 36-50 render the trigger Button with no `aria-expanded`/`aria-haspopup`, and the hand-rolled menu (lines 52-90) is dismissed only via the click-only backdrop div at line 54; grep for `Escape|keydown|addEventListener` in both this file and its sole parent `src/components/properties/property-table.tsx` (which owns `showColumnMenu` state via plain `useState`) returns nothing, so no Escape dismissal exists anywhere. This matches the project's own accessibility standard (CLAUDE.md requires Escape key handling on overlay UI, e.g. the mobile sidebar overlay) and the ARIA disclosure pattern; the

### [MEDIUM] `src/components/properties/sections/property-images-create-section.tsx:98`
**Hover-only-revealed remove-image button is invisible when focused via keyboard.**

The remove button (lines 92-102) uses `opacity-0 group-hover:opacity-100` without any focus-based reveal; keyboard users tab onto an invisible button over each pending upload preview. Same class as property-image-gallery.tsx:154. Correct is `focus-visible:opacity-100`.

> Verifier: Line 98 of property-images-create-section.tsx has exactly `opacity-0 group-hover:opacity-100 transition-opacity` on a focusable native `<button>` with no `focus-visible:opacity-100`, `focus:opacity-100`, or `group-focus-within` reveal; since `opacity: 0` keeps the element in tab order and also hides the browser focus outline, a keyboard user tabbing through pending previews lands on a fully invisible control (WCAG 2.4.7 failure). The identical pattern at property-image-gallery.tsx:154 is verified.

### [MEDIUM] `src/components/sections/hero-dashboard-mockup.tsx:211`
**Vivid `text-success`/`text-warning`/`text-info`/`text-destructive` tokens on visible small text fail WCAG AA contrast.**

Trend text at line 211 (`trendUp ? "text-success" : "text-destructive"` on a `text-xs` span rendering "+18.2%" etc.), the revenue delta span at line 93 (`text-xs text-success`), and the badge maps at lines 240-242 and 288-290 (`bg-warning/10 text-warning`, `bg-info/10 text-info`, `bg-success/10 text-success` on `text-xs` badge text) all put vivid tokens on visible text. Per this repo's measured values, text-success/text-warning are ~2.59/2.15:1 in light mode and text-destructive is 3.29:1 in dark — all below the 4.5:1 requirement for small text on the marketing homepage. TEXT must use the `-text` companion tokens; vivid tokens are for icons/backgrounds only.

> Verifier: The cited code is exactly as claimed — line 211 `trendUp ? "text-success" : "text-destructive"` and line 93 `text-xs text-success` render vivid tokens as small visible text, and the badge maps at lines 240-242/288-290 use `text-warning`/`text-info`/`text-success` on `text-xs` badges. The repo's own design system comment in `src/app/globals.css` (lines 173-180) states the vivid `--color-{success,warning}` tokens "are tuned for fills, not text" and fail WCAG AA on the light card (success ~2.6:1, warning ~2.2:1), providing `--color-*-text` companions (and `status-badge-*` utilities) specifically 

### [MEDIUM] `src/components/shell/main-nav.tsx:217`
**Collapsed sidebar submenu links remain keyboard-focusable while visually hidden.**

Collapsed sections hide children with `max-h-0 opacity-0` plus `overflow-hidden` (line 217) but the child `<Link>` elements stay in the DOM and tab order. A keyboard user tabbing through the sidebar lands on invisible Analytics/Reports/Financials links with no visible focus indicator, and screen readers announce items that appear absent. Correct is to also apply `invisible`/`hidden` or `inert` when collapsed, or conditionally render the children.

> Verifier: In src/components/shell/main-nav.tsx lines 215-244, collapsed sections wrap child `<Link>`s in a div with only `max-h-96/max-h-0 opacity-0 overflow-hidden` toggling — no `visibility`, `hidden`, `inert`, `aria-hidden`, or conditional rendering — and `expandedItems` initializes to an empty Set, so all 8 submenu links (Analytics x3, Reports x1, Financials x4) are clipped-invisible yet remain in the DOM. CSS `opacity:0` + ancestor `overflow:hidden; max-height:0` does not remove elements from tab order or the accessibility tree (only `display:none`/`visibility:hidden`/`inert` do), so a keyboard use

### [MEDIUM] `src/components/shell/main-nav.tsx:150`
**Settings dropdown trigger lacks aria-expanded/aria-haspopup and the menu has no Escape handling.**

The Settings disclosure button (lines 150-161) toggles a custom upward dropdown (lines 113-146) but exposes no `aria-expanded` or `aria-haspopup`, so assistive tech cannot tell the menu opens or is open. The menu also closes only via the click-only backdrop div (line 116) — pressing Escape does nothing, violating the project overlay rule. Correct is aria-expanded on the trigger plus an Escape keydown handler (or the shadcn DropdownMenu primitive).

> Verifier: The Settings trigger at src/components/shell/main-nav.tsx:150-161 renders a bare `<button>` with no `aria-expanded`/`aria-haspopup` (grep confirms zero `aria-expanded` in src/components/shell/), so a screen-reader user activating it gets no state change announced (WCAG 4.1.2). The menu's only dismissal is the click-only backdrop div at line 116; the sole Escape handler in the shell (app-shell.tsx:227-253) is gated on `sidebarOpen` and cannot reach SettingsMenu's local `isOpen` state, so pressing Escape with the dropdown open does nothing — contradicting the CLAUDE.md overlay pattern (Escape ke

### [MEDIUM] `src/components/tenants/tenant-detail-sheet.tsx:62`
**Custom tenant profile dialog has no focus management — focus never moves into the sheet and background stays tabbable.**

The portal-rendered `role="dialog"` sheet (line 62) handles Escape (lines 34-39) but never moves focus into the dialog on open, has no focus trap, and lacks `aria-modal="true"`. When a keyboard user opens a tenant profile, focus remains on the triggering element behind the overlay; Tab cycles through the obscured page instead of the sheet, and screen readers are not informed the rest of the page is inert. Project rule: overlays need Escape handling + focus management — half of that is missing.

> Verifier: `src/components/tenants/tenant-detail-sheet.tsx` contains no `focus()` call, ref, autoFocus, focus trap, `aria-modal`, or `inert` anywhere (only the Escape listener + body scroll lock at lines 32-49), so on open focus provably stays on the trigger and Tab walks the obscured background page. This violates the CLAUDE.md Accessibility rule that overlays need "Escape key handler + focus management," and it hand-rolls a portal dialog while bypassing the project's Radix-based `src/components/ui/sheet.tsx` which provides focus trap, focus restore, and `aria-modal` for free.

### [MEDIUM] `src/components/ui/bento-grid.tsx:79`
**Bento card CTA link is keyboard-focusable while hidden inside a hover-only reveal container.**

The CTA `<Link>` (lines 79-86) sits in a wrapper with `translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100`; the container only becomes visible on pointer hover, so tabbing to the link gives sighted keyboard users focus on an invisible, off-card element. Correct is a `group-focus-within:translate-y-0 group-focus-within:opacity-100` companion (or keeping the CTA always visible).

> Verifier: At src/components/ui/bento-grid.tsx:79 the CTA wrapper is hidden via `translate-y-full opacity-0` (clipped by the card's `overflow-hidden`) and revealed only by `group-hover:*` — no `group-focus-within` variant, no `visibility:hidden`, and no `tabIndex={-1}`, so the `<Link>` anchor stays in the tab order while invisible. Tabbing through the landing page (sole consumer, `src/components/landing/bento-features-section.tsx`, which adds no focus handling) lands focus on an off-card invisible link for each of the 6 cards — a WCAG 2.4.7 focus-visible failure exactly as claimed.

### [LOW] `src/app/(owner)/documents/templates/components/photo-evidence-card.tsx:28`
**Photo evidence file input has no label or aria-label.**

`<Input type="file" multiple accept="image/*" onChange={onUpload} />` (line 28) has no associated label, aria-label, or id — only the CardTitle above it, which is not programmatically linked. Screen readers announce a generic unnamed file chooser. Correct is `aria-label="Upload photo evidence"`.

> Verifier: Line 28 of src/app/(owner)/documents/templates/components/photo-evidence-card.tsx renders `<Input type="file" multiple accept="image/*" onChange={onUpload} />` with no id, aria-label, or wrapping/associated `<label>`; the shadcn Input component (src/components/ui/input.tsx) adds no labeling of its own, and the sole caller (property-inspection-template.client.tsx:230) passes only photos/onUpload/onRemove, so the file input has no accessible name — the CardTitle "Photo evidence" is a sibling heading, not programmatically linked. This gives screen readers an unnamed file chooser, failing WCAG 4.1

### [LOW] `src/app/(owner)/financials/expenses/_components/expense-table.tsx:69`
**Expense search input has no label or aria-label (placeholder only).**

The Input at lines 69-74 is named only by placeholder "Search expenses...". Correct is `aria-label="Search expenses"`.

> Verifier: expense-table.tsx lines 69-74 render `<Input placeholder="Search expenses..." value onChange className>` with no aria-label, id/label, or aria-labelledby — the only accessible name is the placeholder fallback, which fails WCAG best practice (placeholder disappears on input and is unreliable across AT). Sibling toolbars establish the project convention: tenant-toolbar.tsx:31 has `aria-label="Search tenants"` and property-toolbar.tsx:44 has `aria-label="Search properties by name, address, or city"`, so this input deviates from the established pattern. Low severity is correct since placeholder do

### [LOW] `src/app/(owner)/properties/units/components/unit-detail-dialogs.tsx:93`
**Unit detail/edit dialog Labels are not associated with their inputs.**

`<Label>Unit Number</Label>` (93), Bedrooms (98), Bathrooms (102), Square Feet (107), Rent Amount (111), and Status (62, 115) have no htmlFor, and the paired Inputs/SelectTrigger (94-117) have no ids — no programmatic label association, so the fields are announced without names. Correct is htmlFor/id pairs.

> Verifier: Labels at lines 62, 93, 98, 102, 107, 111, 115 have no htmlFor and none wrap their control — Label is Radix `LabelPrimitive.Root` (src/components/ui/label.tsx) which passes props through with no auto-association, and Input (src/components/ui/input.tsx) renders a bare `<input>` with no generated id, so the sibling Inputs (94-112) and SelectTrigger (117) have no accessible name and screen readers announce them as unnamed fields (the inputs being disabled does not remove them from the accessibility tree).

### [LOW] `src/app/faq/faq-accordion.tsx:84`
**Duplicate FAQ accordion component has the same missing aria-expanded defect.**

This file is a near-identical copy of src/components/faq-accordion.tsx; the toggle button at lines 84-97 likewise lacks aria-expanded/aria-controls on a custom disclosure. Same fix as the sibling file.

> Verifier: src/app/faq/faq-accordion.tsx lines 84-97 render a custom disclosure `<button>` with only onClick/className — no `aria-expanded`, no `aria-controls`, and the collapsible content div (lines 99-115) has no `id` — so screen readers get no expanded/collapsed state when toggling (WCAG 4.1.2 name/role/value). The component is live (imported by src/app/faq/page.tsx line 4) and is indeed a near-duplicate of src/components/faq-accordion.tsx, which grep confirms also contains zero aria-expanded/aria-controls attributes.

### [LOW] `src/components/blog/lead-magnet-cta.tsx:82`
**Lead magnet email input has no label or aria-label (placeholder only).**

Same defect class as newsletter-signup.tsx:73 — the email `<input>` (lines 82-88) is placeholder-only named. Correct is `aria-label="Email address"`.

> Verifier: In /Users/richard/Developer/tenant-flow/src/components/blog/lead-magnet-cta.tsx lines 82-88, the email `<input>` has only `placeholder="your@email.com"` — no `aria-label`, no `id`/`<label htmlFor>`, no `aria-labelledby`; the `aria-label="Download resource"` on line 80 names the `<form>`, not the input, so the field's accessible name relies on the placeholder fallback which vanishes once the user types (WCAG 4.1.2/3.3.2 failure). It is the identical placeholder-only pattern as newsletter-signup.tsx line 73-76.

### [LOW] `src/components/blog/newsletter-signup.tsx:73`
**Newsletter email input has no label or aria-label (placeholder only).**

The email `<input>` (lines 73-79) relies on placeholder "your@email.com" for its name; the enclosing form's aria-label does not name the field. Once typed into, the field has no visible or programmatic label. Correct is `aria-label="Email address"` on the input.

> Verifier: The input at src/components/blog/newsletter-signup.tsx:73-79 has no aria-label, no associated `<label>`, no id, and no title — only `placeholder="your@email.com"`; the `aria-label="Newsletter signup"` at line 71 is on the `<form>`, which does not name the input. Screen readers fall back to the placeholder as the accessible name, announcing the sample value "your@email.com" instead of a field name, and once text is typed there is no visible label at all (WCAG 3.3.2 placeholder-only labeling failure).

### [LOW] `src/components/data-table/data-table-toolbar.tsx:86`
**Data-table text and number filter inputs are placeholder-only named.**

The text filter Input (line 86) and number filter Input (line 97) receive only `placeholder={columnMeta.placeholder ?? columnMeta.label}` — no aria-label or associated label, so the accessible name disappears/degrades once a value is entered. Since columnMeta.label is available, correct is `aria-label={columnMeta.label}` on both.

> Verifier: Lines 86-91 and 97-104 of src/components/data-table/data-table-toolbar.tsx render filter Inputs with only `placeholder={columnMeta.placeholder ?? columnMeta.label}`, and `#components/ui/input` (src/components/ui/input.tsx) is a bare `<input>` passthrough with no label/aria-label injected, so these fields are placeholder-only labeled — once a user types a value the visible label vanishes and the field relies on the weak placeholder accname fallback (classic axe/WCAG 3.3.2 placeholder-as-label failure). `columnMeta.label` exists (src/types/data-table.ts ColumnMeta), and every other filter varian

### [LOW] `src/components/faq-accordion.tsx:84`
**Custom FAQ accordion toggle button lacks aria-expanded and aria-controls.**

The question button (lines 84-97) toggles the answer panel but exposes no `aria-expanded` or `aria-controls`; the only state signal is the rotated chevron. Screen-reader users cannot tell whether an answer is expanded. Correct is aria-expanded={isOpen} (or the existing Radix Accordion primitive in ui/accordion.tsx which provides this for free).

> Verifier: The toggle button at src/components/faq-accordion.tsx:84-97 has only `onClick` and `className` — no `aria-expanded`, no `aria-controls`, and the answer panel div (lines 99-115) has no `id` or `role="region"`; the sole state signal is the CSS chevron rotation (line 94), which is invisible to assistive tech. The component is live on real pages (src/components/sections/home-faq.tsx imports it), so screen-reader users on the homepage FAQ genuinely cannot determine expanded/collapsed state, violating the WAI-ARIA accordion pattern; the fix (aria-expanded={isOpen} + aria-controls to a panel id, or t

### [LOW] `src/components/layout/navbar/navbar-desktop-nav.tsx:95`
**Desktop nav dropdown trigger links lack aria-expanded/aria-haspopup.**

The nav `<Link>` triggers (line 95) open hover/arrow-key dropdown panels (line 118) and have solid keyboard support (Escape/arrows in handleKeyDown), but expose no `aria-expanded` or `aria-haspopup`, so screen-reader users get no indication a submenu exists or is open. Correct is `aria-haspopup="true" aria-expanded={openDropdown === item.name}` on items with hasDropdown.

> Verifier: The trigger `<Link>` at src/components/layout/navbar/navbar-desktop-nav.tsx:95-115 renders only `href`, `onKeyDown`, `aria-current`, and `className` — no `aria-expanded` or `aria-haspopup` — while the component tracks `openDropdown` state and conditionally renders a submenu panel at line 118 opened via hover/ArrowDown. A screen reader announces the item as a plain link with no collapsed/expanded state, so the ArrowDown-driven submenu (lines 53-63) is undiscoverable non-visually, violating WCAG 4.1.2 Name/Role/Value; the only open indicator is the visual ChevronDown rotation (line 111).

### [LOW] `src/components/leases/lease-action-buttons.tsx:214`
**Renewal dialog Labels are not associated with their disabled inputs.**

`<Label>Start Date</Label>` (214), End Date (218), Rent Amount (222), Security Deposit (226), and Status (230) all lack htmlFor while the adjacent disabled Inputs have no id, so screen readers reading the renewal summary encounter unnamed date/number fields. Correct is htmlFor/id pairs (or replacing the disabled inputs with plain text, since they are display-only).

> Verifier: Lines 213-232 of src/components/leases/lease-action-buttons.tsx have five sibling `<Label>` elements with no htmlFor next to disabled `<Input>`s with no id, and neither `src/components/ui/label.tsx` nor `input.tsx` auto-generates ids or associations, so the date/number fields have no accessible name for screen readers. One correction: this is the "Lease Details" view dialog (`showViewDialog`), not the renewal dialog — `RenewLeaseDialog` is a separate component rendered at line 239 — but the cited lines and defect are exact.

### [LOW] `src/components/maintenance/maintenance-view-tabs.tsx:74`
**Maintenance search input has no label or aria-label (placeholder only).**

The search `<input>` (lines 74-80) is named only by its placeholder "Search requests...", which disappears once the user types and is not a reliable accessible name. Correct is `aria-label="Search maintenance requests"`.

> Verifier: The input at src/components/maintenance/maintenance-view-tabs.tsx:74-80 has only `placeholder="Search requests..."` — no aria-label, no associated `<label>`, no id/title — so its accessible name relies on the placeholder fallback and the visible label vanishes on typing (WCAG 3.3.2). Every sibling search input in the repo (tenant-toolbar.tsx:31 `aria-label="Search tenants"`, property-toolbar.tsx:44, portfolio-data-table-toolbar.tsx:71, documents-vault.client.tsx:375) carries an aria-label, confirming this one deviates from the established project pattern.

### [LOW] `src/components/maintenance/vendors-page.client.tsx:187`
**Vendor search input has no label or aria-label (placeholder only).**

The Input at lines 187-195 is named only by placeholder "Search vendors...". Correct is `aria-label="Search vendors"`.

> Verifier: The Input at src/components/maintenance/vendors-page.client.tsx:187-195 has only `placeholder="Search vendors..."` — no aria-label, no id, no associated label, and the base `src/components/ui/input.tsx` adds none. Every sibling search input in the codebase carries an explicit accessible name (tenant-toolbar.tsx:31 `aria-label="Search tenants"`, property-toolbar.tsx:44, portfolio-data-table-toolbar.tsx:71, documents-vault.client.tsx:375), so this one violates the established project pattern and leaves the field placeholder-named (fails WCAG 4.1.2 once text is typed and the placeholder disappear

### [LOW] `src/components/properties/property-table-toolbar.tsx:60`
**Column visibility toggle buttons convey checked state only visually via a fake checkbox div.**

Each toggle (lines 60-87) is a plain `<button>` whose on/off state is shown solely by a styled div with a Check icon (lines 69-79); there is no `aria-pressed`/`role="menuitemcheckbox"`/`aria-checked`, so screen-reader users hear only the column name and cannot tell whether the column is currently visible. Correct is `aria-pressed={isColumnVisible(column.id)}`.

> Verifier: Lines 60-87 render each toggle as a plain `<button>` with no `aria-pressed`/`aria-checked`/`role="menuitemcheckbox"`; the on/off state is conveyed only by the styled div + conditional `<Check>` icon at lines 69-80, so a screen reader announces just "Address, button" with no visibility state. This also brushes the CLAUDE.md components rule against custom CSS toggle divs (shadcn primitives with built-in ARIA are the mandated pattern).

### [LOW] `src/components/shell/main-nav.tsx:202`
**Collapsible sidebar section buttons (Analytics/Reports/Financials) expose no aria-expanded.**

The section toggle buttons (lines 201-214) convey expansion only via a rotating ChevronDown icon; there is no `aria-expanded` (the only aria-expanded in all of src/app+src/components is in blog-review-client.tsx), so screen-reader users cannot tell whether a section is open. Correct is `aria-expanded={isExpanded}` on each toggle button.

> Verifier: In src/components/shell/main-nav.tsx lines 201-214 the section toggle `<button>` has only `onClick` and `className` — no `aria-expanded` (nor `aria-controls`), with state conveyed solely by the rotated ChevronDown; a grep of src confirms the sole `aria-expanded` in the codebase is blog-review-client.tsx:117. A screen-reader user focusing the Analytics/Reports/Financials toggle gets no open/closed state (WCAG 4.1.2 name/role/value), and the collapsed children are hidden only via `max-h-0 opacity-0`, so `aria-expanded={isExpanded}` is the correct fix as claimed.

### [LOW] `src/components/shell/quick-actions-dock.tsx:59`
**Quick-actions dock tooltips appear on hover only, never on keyboard focus.**

Each icon-only Link (aria-label present) shows its visible label via a `group-hover:opacity-100` tooltip span (lines 59-61) with no `group-focus-visible`/`focus-visible` reveal, so sighted keyboard users tabbing across the dock see icons with no visible text label. Correct is adding a focus-based reveal (e.g. `group-focus-visible:opacity-100`) or using the Tooltip primitive which handles focus.

> Verifier: Line 59 of src/components/shell/quick-actions-dock.tsx reveals the tooltip span with only `opacity-0 group-hover:opacity-100` — no `group-focus-visible`/`group-focus` variant anywhere in the file — and the `title` attribute only surfaces on mouse hover, so keyboard-focusing the icon-only Links (rendered live by default via app-shell.tsx:351) shows no visible label. This matches the WAI-ARIA tooltip pattern requirement (show on focus as well as hover); aria-label covers screen readers but not sighted keyboard users, so low severity is right.


## Routing & SEO (9)

### [MEDIUM] `src/app/blog/category/[category]/page.tsx:149`
**Category-page breadcrumb JSON-LD mints a "/blog/category" node that HTTP-404s and drifts from the visible breadcrumb.**

The page uses the generic `createBreadcrumbJsonLd("/blog/category/<slug>")` splitter, which emits a 4-item list including `{"name":"Category","item":"https://tenantflow.app/blog/category"}` — no route exists at /blog/category (confirmed HTTP 404 in prod), and the visible breadcrumb (lines 155-173) renders only Home > Blog > {label}. Verified live on https://tenantflow.app/blog/category/lease-law: 

> Verifier: Line 149 calls the generic `createBreadcrumbJsonLd("/blog/category/<slug>")`, whose splitter (breadcrumbs.ts:28-41) emits a non-last "Category" ListItem with `item: https://tenantflow.app/blog/category` — a URL with no route (`src/app/blog/category/` has only the `[category]` dir, no page.tsx) and no redirect. The schema thus has 4 items while the visible breadcrumb (lines 155-173) renders only Home > Blog > {label}, the exact 404-node + visible-vs-schema drift that `createBlogPostBreadcrumbJsonLd` (breadcrumbs.ts:53-58) documents as a defect to avoid.

### [MEDIUM] `src/app/sitemap.ts:153`
**Sitemap uses the cookie-aware Supabase client, which forces dynamic rendering and silently defeats the declared 24h ISR cache.**

`createClient()` from `#lib/supabase/server` calls `cookies()` (src/lib/supabase/server.ts:12), a Dynamic API that opts the route out of static/ISR rendering, so `export const revalidate = 86400` (line 7) and the header comment "crawlers never hit a live DB call" are both dead. Verified in production: consecutive fetches of https://tenantflow.app/sitemap.xml return `x-vercel-cache: MISS` with `cac

> Verifier: `createClient()` calls `cookies()` (src/lib/supabase/server.ts:12), a Dynamic API that opts the sitemap route out of ISR, so `revalidate = 86400` (line 7) and the "crawlers never hit a live DB call" comment are dead code. Verified live: consecutive fetches of https://tenantflow.app/sitemap.xml both return `x-vercel-cache: MISS`, `age: 0`, `cache-control: public, max-age=0, must-revalidate` — every crawler request executes the blogs query, and a DB blip during a Googlebot fetch hits the catch branch and silently drops all blog/category URLs.

### [LOW] `public/_redirects:2`
**Stale Netlify `_redirects` file maps /webhook/* to a NestJS endpoint that no longer exists.**

The file contains `/webhook/* /api/v1/stripe/webhook 200`, a Netlify-format rewrite from the retired custom-backend era (the project is PostgREST/RPC/Edge Functions only — no /api/v1 routes exist). Vercel does not read `_redirects`, so it performs no routing; instead it is served verbatim as a public static file at https://tenantflow.app/_redirects, advertising a nonexistent internal webhook path.

> Verifier: The file exists verbatim ("/webhook/* /api/v1/stripe/webhook 200" with a "proper NestJS endpoint" comment), yet the only route under src/app/api/ is `og` — no /api/v1 exists — and neither vercel.json nor next.config.ts references `_redirects`, so on Vercel it performs zero routing and is merely served as a dead public static file pointing at a retired backend path.

### [LOW] `src/app/feed.xml/route.ts:66`
**feed.xml declares `revalidate = 86400` but the cookie-aware Supabase client makes the route dynamic, so ISR never applies.**

Same defect class as sitemap.ts: `createClient()` from `#lib/supabase/server` calls `cookies()`, opting the GET handler out of the ISR cache declared on line 8 ("Cache the feed for 24h via ISR" comment is false). The route is only saved by its manual `Cache-Control: s-maxage=86400` header (CDN HIT confirmed in prod), meaning the origin re-renders with a live DB query on every CDN revalidation rath

> Verifier: `createClient()` (src/lib/supabase/server.ts:12) awaits `cookies()`, a Dynamic API that opts the handler out of ISR — the repo's own production build manifest (.next/prerender-manifest.json) proves it: cookie-free `/robots.txt` is prerendered, while `/feed.xml` (and `/sitemap.xml`) are absent from the prerendered routes despite `revalidate = 86400`, and blog/[slug]/page.tsx documents this exact defect class with the cookie-less anon-key client as the fix. Severity is low because the manual `Cache-Control: public, s-maxage=86400` header (line 130) still yields 24h CDN caching, so the cost is on

### [LOW] `src/app/llms-full.txt/route.ts:116`
**llms-full.txt declares `revalidate = 3600` but the cookie-aware Supabase client makes the route dynamic, so ISR never applies.**

Same sibling defect: `createClient()` from `#lib/supabase/server` (line 3 import) triggers `cookies()` and disables the ISR declared on line 7; only the manual s-maxage header provides caching. Fix with the cookie-less anon-key client per the pattern documented in src/app/blog/[slug]/page.tsx:112-125.

> Verifier: Line 116 calls `createClient()` from `#lib/supabase/server`, which invokes `await cookies()` (src/lib/supabase/server.ts:12) — a Dynamic API that opts the route handler out of static generation, making the `export const revalidate = 3600` on line 7 dead. The repo itself documents this exact defect and mandates the cookie-less anon-key client for public reads (src/app/blog/[slug]/page.tsx:112-125), and blogs are anon-readable via `status='published'` RLS so no session is needed. Impact is limited to origin-side caching (every CDN miss runs the DB query) because the manual `s-maxage=3600` header

### [LOW] `src/app/llms.txt/route.ts:86`
**llms.txt declares `revalidate = 3600` but the cookie-aware Supabase client makes the route dynamic, so ISR never applies.**

`buildBlogSection()` calls `createClient()` from `#lib/supabase/server`, which calls `cookies()` and opts the handler out of the ISR cache declared on line 7. Behavior survives only via the manual `Cache-Control: s-maxage=3600` header; the origin runs the `get_blog_categories` RPC + blogs query live on every CDN revalidation. Sibling of the sitemap.ts/feed.xml instances; fix with the cookie-less a

> Verifier: `createClient()` (src/lib/supabase/server.ts:12) unconditionally awaits `cookies()`, a Dynamic API that opts the handler out of static/ISR rendering, so `export const revalidate = 3600` (line 7) is dead config; no cookie-less anon client exists in src/lib/supabase/. Impact is limited because the manual `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` header (line 155) still gives hourly CDN caching — only the origin re-runs the RPC + blogs query on each cache miss.

### [LOW] `src/app/robots.ts:12`
**PRIVATE_PATHS omits 9 of the 15 auth-gated route prefixes that proxy.ts treats as private.**

robots.txt's disallow list ("Private + transactional surface area that should never appear in the SERP") covers /admin, /dashboard, /tenant, /settings, /profile, /billing but omits /analytics, /documents, /financials, /inspections, /leases, /maintenance, /properties, /reports, /units — all listed in PRIVATE_ROUTE_PREFIXES in src/proxy.ts:24-40. The (owner)/layout.tsx meta `noindex` never reaches a

> Verifier: proxy.ts:24-40 gates 15 prefixes but robots.ts PRIVATE_PATHS only prefix-matches 6 of them (/admin, /billing, /dashboard, /profile, /settings, /tenant→/tenants); /analytics, /documents, /financials, /inspections, /leases, /maintenance, /properties, /reports, /units are all real routes under src/app/(owner)/ with no matching disallow entry, and robots.test.ts's drift guard never references proxy's PRIVATE_ROUTE_PREFIXES. The (owner)/layout.tsx `robots: { index: false }` (line 33) never reaches an unauthenticated crawler because the proxy 307-redirects to /login before render, so robots.txt is t

### [LOW] `src/app/sitemap.ts:78`
**The /compare hub page is missing from the sitemap while its three child pages are included.**

`comparePages` maps only the competitor slugs (buildium/appfolio/rentredi); no `${baseUrl}/compare` entry exists anywhere in the file. /compare is a real, indexable public page (HTTP 200, canonical /compare via createPageMetadata in src/app/compare/page.tsx:16-21) and is even a redirect destination for two entries in src/lib/seo/blog-redirects.ts. Verified against the live sitemap: only the 3 /com

> Verifier: sitemap.ts has no `${baseUrl}/compare` entry anywhere — `comparePages` (lines 78-86) emits only `/compare/buildium|appfolio|rentredi`, and no other block adds the hub. `/compare` is a real indexable page (src/app/compare/page.tsx sets `createPageMetadata({ path: "/compare" })` with no noindex, not blocked in robots) and is the destination of two blog-redirect entries (src/lib/seo/blog-redirects.ts lines 272 and 373), so the hub should appear alongside the children with `STATIC_PAGES_LAST_UPDATED`. Severity is low because sitemap omission doesn't deindex the page — it remains crawlable via inte

### [LOW] `src/lib/generate-metadata.ts:47`
**Root-default `alternates.canonical: SITE_URL` is inherited by the four metadata-less /auth pages, which serve the homepage title, an explicit "index, follow" robots meta, and a canonical pointing at the homepage.**

`/auth/confirm-email`, `/auth/post-checkout`, `/auth/signout`, and `/auth/update-password` are "use client" pages with no metadata export and no metadata in src/app/auth/layout.tsx, so they inherit the root defaults wholesale. Verified in production: https://tenantflow.app/auth/update-password renders `<title>TenantFlow | Property Management Software for Independent Landlords</title>`, `<meta name

> Verifier: The inheritance chain is real: root layout's `generateMetadata` returns the defaults from generate-metadata.ts (robots "index, follow…" line 43-44, canonical: SITE_URL line 46), and `/auth/confirm-email`, `/auth/post-checkout`, `/auth/signout`, `/auth/update-password` are all "use client" pages with no metadata export anywhere (src/app/auth/layout.tsx exports only `dynamic`), so they emit the homepage title, index/follow robots meta, and a homepage canonical; `/auth/update-password` is indeed the `/.well-known/change-password` redirect target (next.config.ts:108). Severity is low because all f


## Performance & bundle (6)

### [MEDIUM] `src/app/(owner)/properties/page.tsx:70`
**Properties page issues two PostgREST queries per property (N+1 fan-out via useQueries) instead of one consolidated query.**

After `propertyQueries.list()` resolves (default limit 50), the page fires `useQueries` with `unitQueries.listByProperty(p.id)` per property (line 70) and a second `useQueries` with `propertyQueries.images(p.id)` per property (line 90) — up to 100 additional network round-trips per page load, all gated behind the list query (request waterfall). The codebase already has `propertyQueries.withUnits()

> Verifier: page.tsx:66 fetches `propertyQueries.list()` (default limit 50, property-keys.ts:41), then line 70 fires `useQueries` with `unitQueries.listByProperty(p.id)` (one PostgREST request per property, unit-keys.ts:107-125) and line 90 fires a second `useQueries` with `propertyQueries.images(p.id)` (another request per property, property-keys.ts:165-193) — up to 1+2N=101 round-trips, all waterfalled behind the list query since `rawProperties` is empty until it resolves. The consolidated alternative `propertyQueries.withUnits()` with embedded `units(*)` already exists at property-keys.ts:89-105, so th

### [MEDIUM] `src/app/blog/[slug]/markdown-content.tsx:18`
**The full markdown pipeline (react-markdown + remark-gfm + rehype-raw + rehype-sanitize) ships in the client bundle for every blog post view.**

`MarkdownContent` is imported statically into the `"use client"` `blog-post-page.tsx` (line 19), so react-markdown and its remark/rehype plugin chain (rehype-raw embeds an HTML parser) are downloaded and the entire article body re-rendered/hydrated client-side on every `/blog/[slug]` visit — the highest-traffic public surface (~218 posts). The file's own comment concedes it is a Client Component i

> Verifier: blog-post-page.tsx line 1 is `"use client"` and line 19 statically imports MarkdownContent (no next/dynamic), so react-markdown + remark-gfm + rehype-raw (parse5 HTML parser) + rehype-sanitize are pulled across the client boundary and hydrate the full article body on every /blog/[slug] visit — markdown-content.tsx's own header comment (lines 1-7) concedes this. Nothing in MarkdownContent needs client APIs; the server page.tsx could render it and pass it as a slot, preserving the SSR/SEO win while dropping the bundle cost, and CLAUDE.md's Performance rule explicitly lists react-markdown as a he

### [MEDIUM] `src/app/marketing-home.tsx:1`
**Marketing homepage root declares "use client" with zero client-only constructs, dragging all static marketing sections into the client bundle.**

The file contains no hooks, event handlers, or browser APIs — it is pure JSX composition — yet the `"use client"` directive makes it and every non-directive import (features-section.tsx, how-it-works.tsx, home-faq.tsx, premium-cta.tsx, logo-cloud.tsx, stats-showcase.tsx, hero-dashboard-mockup.tsx — all verified hook-free with no own directive) client modules that ship and hydrate on the LCP-critic

> Verifier: marketing-home.tsx:1 has `"use client"` yet the file contains no hooks, event handlers, or browser APIs, and grep confirms features-section, hero-dashboard-mockup, home-faq, how-it-works, logo-cloud, premium-cta, stats-showcase, page-layout, footer, border-beam, and section-skeleton are all directive-free and hook-free — the root directive alone pulls them into the client bundle and hydrates them on `/` (page.tsx is a server component with `force-static`). All genuinely interactive leaves (LazySection, BlurFade, NumberTicker, TestimonialsSection, FaqsAccordion, Navbar) already declare their ow

### [MEDIUM] `src/components/dashboard/components/kpi-sparkline.tsx:15`
**Static recharts import in KpiSparkline puts recharts in the initial /dashboard chunk, defeating the route's dynamic-import isolation.**

`import { Area, AreaChart } from "recharts"` (plus the value import of `ChartContainer` from `#components/ui/chart`, which does `import * as RechartsPrimitive from "recharts"`) is reached statically via kpi-bento-row.tsx:24 → dashboard.tsx:23 → src/app/(owner)/dashboard/page.tsx:7. CLAUDE.md requires recharts to load via `next/dynamic` with `ssr:false`, and dashboard.tsx does exactly that for Reve

> Verifier: kpi-sparkline.tsx:15 statically imports `Area, AreaChart` from recharts (and line 17 imports `ChartContainer`, whose src/components/ui/chart.tsx:5 does `import * as RechartsPrimitive from "recharts"`), reached via the fully static chain page.tsx:7 → dashboard.tsx:23 → kpi-bento-row.tsx:24, so recharts lands in the eager dashboard client bundle. This directly violates CLAUDE.md's Performance rule ("Dynamic-import heavy libs (recharts...) via next/dynamic with ssr: false") and nullifies the `dynamic()` + skeleton wrappers dashboard.tsx:34-48 already use for RevenueAreaChart/OccupancyDonutChart, 

### [MEDIUM] `src/components/inspections/inspection-list.client.tsx:150`
**Inspections list renders every inspection with no pagination or virtualization, backed by an unbounded list query.**

`inspections.map(...)` renders one `InspectionRow` per record with no page window, `useVirtualizer`, or cap, and the backing `inspectionQueries.list()` (src/hooks/api/query-keys/inspection-keys.ts:44-50) has no `.limit()`/`.range()` — violating both "All list queries MUST have .limit() or .range()" and the virtualize-long-lists rule. Each row also carries embedded `properties`, `units`, and `inspe

> Verifier: `inspectionQueries.list()` (src/hooks/api/query-keys/inspection-keys.ts:44-50) issues `.select(..., { count: 'exact' }).order(...)` with no `.limit()`/`.range()`, directly violating the CLAUDE.md rule "All list queries MUST have `.limit()` or `.range()`", and `useInspections()` feeds that unbounded result to `inspections.map(...)` at line 150 with no `useVirtualizer` or page window. Sibling list views (tenant-table, leases-table, property-table, portfolio-data-table) all use `useVirtualizer`, so N inspections means N rows fetched (with properties/units/inspection_rooms embeds) and N DOM rows o

### [LOW] `src/components/admin/deliverability-table.tsx:1`
**Purely presentational DeliverabilityTable declares "use client" and is imported by a Server Component page, needlessly client-rendering it.**

The component has no hooks, event handlers, or browser APIs — it sorts a prop array and renders static table markup — yet the directive makes it a client boundary. Its sole consumer, src/app/(admin)/admin/analytics/page.tsx (a Server Component that fetches via `Promise.all` server-side), therefore serializes the stats as client props and ships/hydrates the table JS instead of rendering it to zero-

> Verifier: deliverability-table.tsx:1 declares "use client" but the component has no hooks, event handlers, or browser APIs (only prop sorting, Intl.NumberFormat, and server-safe Table/Empty primitives which themselves lack the directive), directly violating the CLAUDE.md rule "Server Components by default; 'use client' only for hooks / event handlers / browser APIs". Its sole consumer, src/app/(admin)/admin/analytics/page.tsx:94, is an async Server Component fetching via Promise.all, so the directive forces prop serialization plus shipping/hydrating table JS that deleting line 1 would eliminate with no 


## Client state (Zustand) (13)

### [MEDIUM] `src/app/(owner)/leases/page.tsx:155`
**`currentPage` persists in the module-level leases store across page visits and is never clamped to the recomputed `totalPages`, stranding the user on an empty, unrecoverable page.**

The store keeps `currentPage` (src/stores/leases-store.ts:99) forever; only `setSearchQuery`/`setStatusFilter` reset it. Scenario: owner with 12 leases pages to page 2, opens a lease detail and deletes leases there (delete only exists on the detail page), returns to /leases — now 8 leases means `totalPages = 1` but `currentPage` is still 2, so `paginatedLeases` slices to an empty array AND the pagination footer is hidden entirely (`totalPages > 1` guard at src/components/leases/table/leases-table.tsx:221), leaving a table with zero rows and no visible way back except touching a filter. The persisted `selectedRows` set similarly retains ids of leases deleted on the detail page. Correct is clamping `currentPage` to `totalPages` when data shrinks (or resetting page state on mount) and pruning selection against the fetched id set.

> Verifier: `currentPage` lives in a module-level Zustand store whose `reset()` is never called anywhere and page.tsx:154-158 slices without clamping, while leases-table.tsx:221 hides the footer when `totalPages <= 1` and the "no leases match" fallback (line 251) only fires when the filtered set is empty — so a stranded out-of-range page renders an empty tbody with no recovery control, exactly as claimed; `selectedRows` is likewise never pruned. One correction to the cited trigger: no delete action is actually reachable (list page's `openDeleteDialog` is never invoked and `LeaseActionButtons` is imported 

### [MEDIUM] `src/hooks/api/use-auth.ts:159`
**Sign-out never resets any Zustand store, leaking the previous user's search terms, filters, selections, and an in-memory Lease entity to the next user in the same tab.**

`clearAuthData()` clears only the TanStack Query cache and `REACT_QUERY_OFFLINE_CACHE`; the module-singleton stores (leases, properties, tenants, dashboard, dashboard-presets, navigation) are untouched — every store's `reset()` action has zero callers (verified by grep). Sign-out (app-shell.tsx:296) and subsequent login (`router.push` at src/app/(auth)/login/page.tsx:169) are pure SPA navigations with no page reload, so user B signing in on the same tab inherits user A's `searchQuery` (e.g. a tenant name typed into /tenants), `statusFilter`, `selectedRows`/`selectedIds` sets, and `leases-store.selectedLease` (a full Lease row with rent/deposit data) still resident in memory. Additionally the persisted `tenantflow-dashboard-presets` localStorage key is not user-scoped and is not removed on logout, so user A's saved preset names and property-search filter strings appear in user B's preset 

> Verifier: `clearAuthData()` (src/hooks/api/use-auth.ts:159-203) only nulls TanStack Query keys and removes `REACT_QUERY_OFFLINE_CACHE`; grep confirms `reset()` in leases/properties/tenants stores (e.g. leases-store.ts:209) has zero callers, and every sign-out/sign-in path is reload-free SPA navigation (app-shell.tsx:296 `signOutMutation.mutate()` with no redirect, signout page `router.push("/login")`, mobile-nav server-action `redirect("/login")` which is a client-side App Router transition, login page.tsx:169 `router.push(destination)`), so module-singleton store state — `tenants-store.searchQuery`/`se

### [MEDIUM] `src/stores/leases-store.ts:51`
**`selectedLease` caches a full server Lease entity in a global Zustand store, and the open-dialog flags persist across unmounts, so back/forward navigation reopens the renew/terminate dialog with a stale lease snapshot.**

This violates the architecture rule that TanStack Query owns server state: once `openRenewDialog(lease.original)` stores the row, mutations/refetches (`refetchOnWindowFocus: true`) update the query cache but never this copy. Because nothing resets the store on unmount, a user who opens the Renew dialog on /leases, presses the browser Back button (dialog flags stay `showRenewDialog: true`, `selectedLease` set), then returns to /leases gets the dialog auto-reopened rendering the stale snapshot (src/app/(owner)/leases/page.tsx:293-316 passes the persisted flags straight to `LeasesDialogs`, which only guards `selectedLease === null` at leases-dialogs.tsx:33) — even if the lease was modified or terminated in the meantime. Correct is to key dialogs on a lease id and read the entity from the query cache, and/or reset dialog state on page unmount.

> Verifier: The store is a global module-level Zustand store with no persist-clearing on unmount — `closeAllDialogs`/`reset` exist (leases-store.ts:199, 209) but grep shows zero callers anywhere in src, and page.tsx has no unmount cleanup, so `showRenewDialog: true` + `selectedLease` survive SPA navigation and page.tsx:293-297 feeds them straight back to `LeasesDialogs`, whose only guard is `!selectedLease` (leases-dialogs.tsx:33), auto-reopening the dialog on return. The snapshot is genuinely stale server state: `RenewLeaseDialog` reads `lease.end_date`/`lease.rent_amount` directly from the stored copy (

### [MEDIUM] `src/stores/loading-store.ts:93`
**The entire loading store is read-only dead state — no production code ever starts a loading operation, so the mounted GlobalLoadingIndicator can never appear.**

`startLoading`/`stopLoading`/`startCategoryLoading`/`startModalLoading`/`updateProgress` have zero callers outside `src/stores/loading-store.ts` and its tests (verified by grep across src/). Yet `GlobalLoadingIndicator` (src/components/ui/global-loading-indicator.tsx:10) subscribes to `isLoading` and is mounted app-wide in src/components/providers.tsx:55. `isLoading` can never become true, so the global loading pill never renders for any operation — a 267-line store plus a permanently-invisible component ship in the bundle as a nonfunctional feature. Correct is either wiring mutations/queries to the store or deleting the store and the indicator.

> Verifier: Exhaustive grep across src/ and tests/ shows the only non-test consumer of `useLoadingStore` is `GlobalLoadingIndicator` (src/components/ui/global-loading-indicator.tsx:10, mounted in src/components/providers.tsx:55), which only reads state; no production code ever calls `startLoading`/`startModalLoading`/`startCategoryLoading`/`updateProgress` (all writers are the store itself at src/stores/loading-store.ts and the two test files). Since `isLoading` initializes false (line 95) and can only flip true inside those uncalled actions via `computeLoadingMetrics`, the indicator can never render — th

### [MEDIUM] `src/stores/properties-store.ts:34`
**`selectedRows` retains ids of properties deleted via the single-delete flow, and a subsequent bulk status edit on the phantom ids can silently resurrect a soft-deleted property.**

Single delete (`confirmDelete` at src/app/(owner)/properties/page.tsx:156-161) fires `deleteProperty` (soft-delete to `status: 'inactive'`) but never removes the id from the store's `selectedRows`; only the bulk path clears selection (properties-filters.tsx:133). Scenario: select property X plus others, delete X via its row action, then open Bulk Edit and apply status "active" — `handleBulkEditSubmit` (properties.tsx:92-108) maps over all of stale `selectedRows` including X, flipping the just-soft-deleted property back to `active` and un-deleting it. The PropertyActionBar also keeps showing a selection count that includes rows no longer rendered. Correct is pruning `selectedRows` on any delete and/or intersecting selection with visible ids before bulk mutations.

> Verifier: `selectedRows` is a global Zustand set (src/stores/properties-store.ts:34) pruned only by toggleSelect/selectAll/clearSelection; the single-delete flow (src/app/(owner)/properties/page.tsx:121-161) soft-deletes and invalidates queries but never touches the store, so the id survives while the row vanishes from the `.neq('status','inactive')`-filtered list (property-keys.ts:52). `handleBulkEditSubmit` (properties.tsx:92-103) then maps over the stale set and `propertyMutations.update()` (property-keys.ts:224-234) does an unguarded `.update(payload).eq('id', id)`, so applying status "active" resur

### [MEDIUM] `src/stores/toast-store.ts:81`
**The toast store is a dead parallel toast system — nothing ever writes a toast into it; all production code calls sonner directly.**

`addToast`/`addModalToast` have zero production callers (grep: only the store file and its tests). Every real toast in ~50 files goes through `toast()` from `sonner` directly, so `toasts`, `toastHistory`, categories, priorities, persistent toasts, and all bulk/query operations are dead state. The only consumer chain is `useToast()` (src/hooks/use-toast.ts:12) -> `Toaster` (src/components/ui/toast.tsx:12), whose store→sonner sync effect (toast.tsx:19-43) iterates a permanently-empty array. Two toast systems exist with one completely dead; the store plus the sync effect should be removed (the `<Sonner>` render is the only live part).

> Verifier: Grep across src confirms `useToastStore` is imported only by `src/hooks/use-toast.ts:7`, whose sole consumer is `Toaster` in `src/components/ui/toast.tsx:12` (mounted in `src/app/layout.tsx:13`); no production code calls `addToast`/`addModalToast` or `useToastStore.getState()` (only `src/stores/__tests__/toast-store.test.ts`), so the store's `toasts` array is permanently empty and the toast.tsx:19-43 store→sonner sync effect never fires. Meanwhile 64 non-test files import `sonner` directly, confirming the store (~280 lines of state, history, categories, priorities, bulk ops) is a dead parallel

### [LOW] `src/stores/error-boundary-store.ts:90`
**The `isInErrorState` computed getter is both unconsumed and broken — Zustand's `set()` freezes it into a stale plain boolean after the first state update.**

Zustand v5's `setState` merges via `Object.assign({}, state, next)`, which invokes the getter during the merge (while `get()` still returns the pre-update state) and copies the result as a plain data property; after `setError()` runs, `isInErrorState` is a frozen `false` (the old `hasError`), permanently one update behind and no longer a getter. No code reads `isInErrorState` (grep: zero consumers), so today it is dead code with a latent trap for the first future consumer. Correct is the pattern the sibling stores use — recompute the flag inside every `set()` (as loading-store/toast-store do) — or delete the property.

> Verifier: Grep shows `isInErrorState` appears only at its definition (src/stores/error-boundary-store.ts:33,90) — zero consumers. Zustand 5.0.13's `setState` (node_modules/zustand/vanilla.js) merges via `Object.assign({}, state, nextState)`, which invokes the getter while `get()` still returns the pre-update state and copies the result as a plain data property, so after the first `setError()` the new state object carries a frozen plain `isInErrorState: false` (getter destroyed, never recomputed on later sets). Sibling stores avoid this by recomputing flags inside each `set()`, so the claim's mechanism, 

### [LOW] `src/stores/leases-store.ts:183`
**The delete-dialog slice of the leases store is write-never: `openDeleteDialog` has zero callers, so `showDeleteDialog` can never become true.**

Grep across src/ finds no caller of `openDeleteDialog`; `LeasesTable` exposes no delete action (no onDelete/Trash affordance in leases-table.tsx). The leases page still destructures `showDeleteDialog`/`closeDeleteDialog`, instantiates `useDeleteLeaseMutation` (page.tsx:107), and renders the "Delete Lease" `ConfirmDialog` (leases-dialogs.tsx:49-57) — all permanently unreachable dead code (lease deletion actually lives on the detail page via lease-action-buttons.tsx). Correct is either wiring a delete action on the list rows or removing `openDeleteDialog`/`showDeleteDialog`, the ConfirmDialog, and the page's delete mutation.

> Verifier: Grep across src/ shows `openDeleteDialog` exists only in src/stores/leases-store.ts (definition at line 183 plus interface/initial-state lines) with zero callers, and leases-table.tsx has no onDelete/Trash affordance, so `showDeleteDialog` can never become true. Yet page.tsx:78/83/107/297-314 still destructures `showDeleteDialog`/`closeDeleteDialog`, instantiates `useDeleteLeaseMutation`, and wires the delete ConfirmDialog in leases-dialogs.tsx:50-55 — all unreachable, while actual lease deletion lives in lease-action-buttons.tsx via local `useState` (lines 51, 182). Dead code only, no user-fa

### [LOW] `src/stores/navigation-store.ts:29`
**The breadcrumbs/navigation-history/active-route subsystem of the navigation store (roughly 70 percent of the file) has zero production consumers — a second, real breadcrumb system exists elsewhere.**

The only production consumer is navbar.tsx:38-40, which uses `isMobileMenuOpen`/`toggleMobileMenu`/`closeMobileMenu`. `setBreadcrumbs`, `addBreadcrumb`, `clearBreadcrumbs`, `setActiveRoute`, `addToHistory`, `clearHistory`, `goBack`, and `canGoBack` are set/read nowhere outside the store and its tests (verified by grep); actual app breadcrumbs are computed from the pathname via `generateBreadcrumbs` in src/components/shell/app-shell.tsx:47 (src/lib/breadcrumbs.ts), so the store's `breadcrumbs`/`navigationHistory`/`activeRoute` state is dead weight that can silently diverge from reality. Correct is trimming the store to the mobile-menu slice.

> Verifier: The only production consumer chain is navbar.tsx:38-39 → `useNavigation()` (src/hooks/use-navigation.ts, a thin `useNavigationStore()` wrapper), which destructures only `isMobileMenuOpen`/`toggleMobileMenu`/`closeMobileMenu`; grep across src/ shows `setBreadcrumbs`, `addBreadcrumb`, `clearBreadcrumbs`, `setActiveRoute`, `addToHistory`, `clearHistory`, `goBack`, `canGoBack`, `navigationHistory`, and `activeRoute` referenced nowhere outside src/stores/navigation-store.ts itself (the only other `addBreadcrumb` hits are unrelated Sentry calls in frontend-logger.ts/mutation-error-handler.ts). Actua

### [LOW] `src/stores/preferences-store.ts:27`
**`viewPreferences.properties` is a dead field duplicating `properties-store.viewMode` — two competing sources of truth for the same grid/table preference, only one of which is ever used.**

Grep shows the only `viewPreferences` consumer is maintenance-view.client.tsx:33-64, which reads/writes the `maintenance` key exclusively; nothing anywhere reads or writes `viewPreferences.properties`. The actual properties grid/table toggle lives in `usePropertiesStore.viewMode` (src/stores/properties-store.ts:26, consumed in properties.tsx:51). If a future caller follows this store's documented contract ("properties: 'grid' | 'table'") it will silently desync from the real toggle. Correct is removing the `properties` key (and its default at line 32) or migrating the properties toggle here.

> Verifier: `viewPreferences.properties` is declared in src/stores/preferences-store.ts:27 with default at line 32, but the sole viewPreferences consumer is maintenance-view.client.tsx (reads `viewPreferences?.maintenance` at line 37, writes only `setViewPreference("maintenance", view)` at line 64) — nothing reads or writes the `properties` key. The live properties grid/table toggle is `usePropertiesStore.viewMode` (src/stores/properties-store.ts:26, default "grid" at line 77, consumed in src/components/properties/properties.tsx:50/160/175), so the field is a dead duplicate source of truth exactly as clai

### [LOW] `src/stores/preferences-store.ts:78`
**`setViewPreference` is the only preference setter that does not persist, so the maintenance kanban/table choice silently resets to kanban on every reload.**

`setDataDensity` persists via `persistDataDensity` (line 74-77) and theme persists via `persistThemeMode` in the provider, but `setViewPreference` only calls `set()` in memory, and `PreferencesStoreProvider` (src/providers/preferences-provider.tsx) rehydrates only theme and density from localStorage. Concrete failure: a user switches maintenance to "table" view (maintenance-view.client.tsx:64), reloads or comes back next session, and is back on "kanban" — an inconsistent persistence contract inside a store whose entire purpose is durable preferences. Correct is persisting viewPreferences with the same localStorage pattern (or via `persist()` middleware) and rehydrating it in the provider.

> Verifier: `setViewPreference` (preferences-store.ts:78-84) only calls `set()` with no localStorage write, while `setDataDensity` persists via `persistDataDensity` (lines 74-77) and theme persists via `persistThemeMode` in the provider; `PreferencesStoreProvider` (preferences-provider.tsx:62-71) rehydrates only theme and density, so `viewPreferences` resets to `DEFAULT_VIEW_PREFERENCES` (maintenance: "kanban") on every mount. The maintenance view switch (maintenance-view.client.tsx:64) writes only to this in-memory store — no URL/nuqs sync (only `tab` uses searchParams) and grep shows no other persistenc

### [LOW] `src/stores/tenants-store.ts:33`
**`selectedIds` is never pruned when a tenant is deleted via the single-delete flow, leaving a phantom selection count and a bulk-delete that targets already-deleted tenants.**

`confirmDeleteTenant` (src/app/(owner)/tenants/page.tsx:68-73) deletes the tenant but never touches `tenants-store.selectedIds`; only the bulk path clears selection after confirmation. Scenario: check tenant X's checkbox, delete X via the row Delete action — X vanishes from the list but `TenantActionBar` stays visible showing "1 selected" (tenants.tsx:238-244, `isVisible={selectedIds.size > 0}`) with nothing visibly selected, and pressing its Delete fires `onBulkDelete` against the already-deleted id. Correct is removing deleted ids from the selection in the delete success path or reconciling selection against fetched ids.

> Verifier: `confirmDeleteTenant` (src/app/(owner)/tenants/page.tsx:68-73) only calls `deleteTenant` + `setTenantToDelete(null)` and neither it, `useDeleteTenantMutation` (src/hooks/api/use-tenant-mutations.ts:62-78), nor any effect in tenants.tsx/tenant-table.tsx/tenant-grid.tsx ever prunes `selectedIds`; `clearSelection` is invoked only via confirmed bulk delete, bulk export, or the action-bar close. Since the zustand store is module-global and `TenantActionBar` renders on `isVisible={selectedIds.size > 0}` (tenants.tsx:238-244), row-deleting a checked tenant leaves a phantom "1 selected" bar whose Dele

### [LOW] `src/stores/toast-store.ts:228`
**`addModalToast` discards its defining `modalId` parameter — a no-op filter statement is executed and the id is never stored, so modal toasts are untrackable even if the store were used.**

Line 228 (`state.toasts.filter((t) => t.metadata?.modalId === modalId);`) computes a filtered array and throws it away, and the created toast object never receives `metadata.modalId` — `modalId` is used only in that dead statement and a log line. Consequently `clearModalToasts(modalId)` and `getModalToasts(modalId)` (which filter on `t.metadata?.modalId`) can never match a toast created through `addModalToast`, making the modal-scoped API self-inconsistent. Correct is `metadata: { ...toastData.metadata, modalId }` on the created toast and deletion of the no-op statement (moot if the dead store is removed per the sibling finding).

> Verifier: Line 228 of src/stores/toast-store.ts computes and discards a filter (pure no-op), and the toast object created at lines 219-224 never receives `metadata.modalId`, so `clearModalToasts`/`getModalToasts` (which match on `t.metadata?.modalId`, lines 253/279) can never match toasts created via `addModalToast`. Impact limited: grep shows no production callers of `addModalToast` (store used only via use-toast.ts passthrough and its own tests).


## Admin surface (8)

### [MEDIUM] `src/app/(admin)/admin/analytics/page.tsx:34`
**All three admin analytics RPC errors are silently swallowed — failures render as "No data yet" empty states with no Sentry capture.**

`deliverabilityResult.error`, `funnelResult.error`, and `gateResult.error` are never checked anywhere in the page; the code only inspects `.data` (lines 47-65) and falls back to `[]`/`null`. Any RPC failure — a transient PostgREST timeout, or `get_funnel_stats` raising `'Invalid window: p_to cannot be in the future'` when the Vercel clock is ahead of the DB clock (p_to is computed as JS `now()` at line 32 and validated against Postgres `now()` in 20260419040000_drop_first_rent_funnel_step.sql:37) — renders the same "No deliverability/funnel/paywall data yet" Empty states as genuinely-empty data, masking outages from both the admin and Sentry. The sibling admin page (src/app/(admin)/admin/blog/page.tsx:26-28) captures its fetch error to Sentry; this page should do the same for each of the three results.

> Verifier: src/app/(admin)/admin/analytics/page.tsx destructures the three RPC results at line 34 and only ever reads `.data` (lines 47-65) — no `.error` check or Sentry capture exists anywhere in the file (grep for `deliverabilityResult.error|funnelResult.error|gateResult.error` returns zero hits repo-wide), so any RPC failure falls through to `[]`/`null` and renders the components' genuine-empty states ("No deliverability data yet" at deliverability-table.tsx:44, etc.). The cited failure mode is real: `get_funnel_stats` raises `'Invalid window: p_to (%) cannot be in the future'` (20260419040000_drop_fi

### [LOW] `src/app/(admin)/admin/blog/blog-review-client.tsx:75`
**Review queue displays `word_count`, but no writer ever populates `blogs.word_count`, so every draft shows a fabricated "0 words".**

`BLOG_REVIEW_COLUMNS` selects `word_count` and line 75/87 renders `{draft.word_count ?? 0} words`, but the only blog writer — the n8n-blog-ingest Edge Function — omits `word_count` from its insert row (supabase/functions/n8n-blog-ingest/index.ts:374-383), and the `validate_blog_post` trigger (20260510214935) computes `v_word_count` only to gate, never assigning `NEW.word_count`. Consequently `word_count` is NULL on every factory row, the reviewer sees "0 words" for a 1,200-3,000-word draft, and the generated column `reading_time` (`GREATEST(1, word_count / 200)`, 20251209120000_create_blogs_table.sql:14) is NULL too — it is also selected/mapped in BLOG_REVIEW_COLUMNS but never rendered. Correct is either populating `NEW.word_count` in the trigger/ingest or dropping the misleading metric from the review row.

> Verifier: Verified end-to-end: `blog-review-client.tsx:75/87` renders `draft.word_count ?? 0` as "{n} words", `BLOG_REVIEW_COLUMNS` (blog-keys.ts:87) selects it, but no writer anywhere populates the nullable `blogs.word_count` (20251209120000:13) — the n8n-blog-ingest insert row (index.ts:374-389) omits it, the `validate_blog_post` trigger (20260510214935) only uses local `v_word_count` and never assigns `NEW.word_count`, and repo-wide grep finds zero other insert/update paths — so any queued draft shows "0 words" and the generated `reading_time` is NULL (selected/mapped, never rendered). Downgraded to 

### [LOW] `src/app/(admin)/admin/blog/blog-review-client.tsx:104`
**The destructive Reject action archives a draft on a single click with no confirmation dialog.**

`onClick={() => reject.mutate({ id: draft.id })}` immediately flips the row to `status='archived'` via `rejectBlogPost`; there is no AlertDialog, no undo, and no admin surface that lists or restores archived posts, so a misclick on the Reject button (which sits directly beside Approve, line 94-108) silently destroys a queued draft. The codebase convention for destructive actions is an AlertDialog confirmation (e.g. src/components/properties/property-units-delete-dialog.tsx, property-image-gallery.tsx:204); Reject should follow it.

> Verifier: Line 104 of blog-review-client.tsx is exactly `onClick={() => reject.mutate({ id: draft.id })}` with no AlertDialog/confirm anywhere in the file, and `rejectBlogPost` (src/app/actions/blog-publish.ts:147-150) immediately flips `blogs.status` to 'archived'; the admin area contains only `analytics` and `blog` (review queue) with zero references to archived posts, so there is no in-app restore path, while the cited convention files (property-units-delete-dialog.tsx, property-image-gallery.tsx) do use AlertDialog for destructive actions. Downgraded to low because the row is soft-archived (content 

### [LOW] `src/app/(admin)/admin/blog/page.tsx:24`
**Admin review-queue fetch is an unbounded list query with no .limit() or .range().**

The `blogs` select at lines 20-24 filters `status='in-review'` and orders, but has no bound, violating the CLAUDE.md rule "All list queries MUST have .limit() or .range() — no unbounded select('*')". Each row includes full `content` (1,200-3,000 words), so a backlog of parked drafts (the blog factory produced 218 posts before pausing) transfers megabytes and renders hundreds of rows with no virtualization. Correct is `.limit(N)` matching what the review UI can reasonably display.

> Verifier: src/app/(admin)/admin/blog/page.tsx:20-24 selects BLOG_REVIEW_COLUMNS (which includes full `content` per blog-keys.ts:86-87) with `.eq("status","in-review").order(...)` and no `.limit()`/`.range()`, violating the CLAUDE.md "All list queries MUST have .limit() or .range()" rule; the identical unbounded query also exists in the `reviewQueue()` factory at src/hooks/api/query-keys/blog-keys.ts:173-177, so a fix should cover both.

### [LOW] `src/app/(admin)/layout.tsx:43`
**The admin shell's <main> lacks id="main-content", breaking the root layout's skip-to-content link on every /admin page.**

src/app/layout.tsx:99-104 renders a mandated skip link targeting `#main-content`, whose comment says the id is set on `<main>` in PageLayout and the dashboard shell (app-shell.tsx:303, page-layout.tsx:59). The (admin) layout renders its own `<main>{children}</main>` without the id, so on /admin/analytics and /admin/blog the skip link is a dead anchor — keyboard/screen-reader users activating it go nowhere. Correct is `<main id="main-content">` in this layout.

> Verifier: src/app/(admin)/layout.tsx:43 renders bare `<main>{children}</main>` while the root layout (src/app/layout.tsx:99-104) renders the skip link targeting `#main-content` on every route; grep shows `id="main-content"` exists only in src/components/shell/app-shell.tsx:303 and src/components/layout/page-layout.tsx, neither of which is used by the admin pages (analytics, blog), so on /admin/* the skip link points at a nonexistent anchor.

### [LOW] `src/app/(admin)/layout.tsx:23`
**No page or redirect exists at /admin, so the natural admin entry URL 404s for authenticated admins.**

The (admin) route group contains only /admin/analytics and /admin/blog; there is no src/app/(admin)/admin/page.tsx and no /admin redirect in next.config.ts, yet the layout's own login redirect (line 23) treats /admin/analytics as the de-facto index, and the admin header (lines 38-42) offers no navigation links between the two admin pages. An admin who types /admin passes the proxy and layout gates and then hits the 404 page. Correct is a redirecting page.tsx at (admin)/admin/ (to /admin/analytics) — plus nav links in the header so /admin/blog is discoverable at all.

> Verifier: The (admin) group contains only `admin/analytics/page.tsx` and `admin/blog/page.tsx` — no `src/app/(admin)/admin/page.tsx` exists, `next.config.ts` redirects() has no `/admin` entry (only well-known/signup/legal/blog-ghost redirects), and vercel.json has none, so a bare `/admin` request from an admin passes proxy.ts (line 336 only bounces non-admins) and 404s. The layout's own line 23 redirect target (`/login?redirect=/admin/analytics`) confirms analytics is the de-facto index, and the header (lines 38-42) renders only an "Admin" h1 with zero nav links — a repo-wide grep finds no `href` to `/a

### [LOW] `src/components/admin/gate-conversion-table.tsx:1`
**GateConversionTable is a purely presentational component carrying an unnecessary "use client" directive (sibling of the confirmed DeliverabilityTable case).**

The component uses no hooks, no event handlers, and no browser APIs — only Table/Empty primitives, lucide icons, `cn`, and array sorting over serializable props from the server-rendered analytics page. Per CLAUDE.md ("Server Components by default; 'use client' only for hooks / event handlers / browser APIs") the directive is a violation and needlessly pulls the component into the client bundle. funnel-chart.tsx legitimately needs the directive (next/dynamic with ssr:false) — this file does not.

> Verifier: gate-conversion-table.tsx:1 carries `"use client"` yet contains zero hooks, event handlers, or browser APIs — only Table/Empty primitives (both server-compatible, no directive of their own), a lucide icon, `cn`, and an array sort over serializable props. Its sole caller is the async Server Component `src/app/(admin)/admin/analytics/page.tsx`, so the directive needlessly creates a client boundary and ships the component plus table.tsx/empty.tsx into the client bundle, violating CLAUDE.md's "Server Components by default" rule.

### [LOW] `src/hooks/api/query-keys/blog-keys.ts:177`
**blogQueries.reviewQueue() is the client-side sibling of the same unbounded list query — no .limit() or .range().**

The review-queue queryFn (lines 173-177) issues the identical unbounded `blogs` select (full `content` column, `status='in-review'`, no bound), and it refetches on every approve/reject invalidation and on window focus. Same rule violation and failure mode as the server fetch in src/app/(admin)/admin/blog/page.tsx:24; both sites need a bound.

> Verifier: blog-keys.ts lines 173-177 show `reviewQueue()` selecting `BLOG_REVIEW_COLUMNS` (line 86-87, which includes the full `content` column) from `blogs` with `.eq("status","in-review").order(...)` and no `.limit()`/`.range()`, violating the CLAUDE.md rule that all list queries must be bounded — identical to the server fetch at src/app/(admin)/admin/blog/page.tsx:20-24. It does refetch on approve/reject: blog-review-client.tsx uses this query and its mutations invalidate `blogQueries.all()` (per lines 27-33), plus the global `refetchOnWindowFocus: true` applies once the 2-minute BLOG staleTime lapse


## Code hygiene (CLAUDE.md rules) (40)

### [MEDIUM] `src/components/contact/contact-form.tsx:191`
**Static inline backgroundImage pointing at a hardcoded remote Unsplash stock photo**

`style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-...')" }}` is a fully static inline style (rule 5 violation — belongs in a class/utility) whose value is a third-party stock-photo URL loaded at runtime from images.unsplash.com. Beyond the inline-style rule, this hardcodes an external image dependency on the contact page (brand-inconsistent with the project's generated-art-only stance and subject to the strict CSP/remote-host availability); correct is a locally hosted asset referenced via CSS.

> Verifier: src/components/contact/contact-form.tsx:189-195 contains exactly the cited static inline `style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-...')" }}` — a direct violation of CLAUDE.md Zero Tolerance Rule 5 (no inline styles; Tailwind utilities or globals.css only), with nothing dynamic justifying it. Worse than claimed: the vercel.json CSP applied to `/(.*)`` sets `img-src 'self' data: blob: https://*.supabase.co`, which does not include images.unsplash.com, so this CSS background (fetched directly, unlike next/image URLs proxied via `/_next/image`) is blocked in

### [MEDIUM] `src/components/dashboard/expiring-leases-widget.tsx:29`
**Ad-hoc queryOptions with string-literal key segment defined in a component instead of the query-keys factories**

`queryKey: [...leaseQueries.all(), "expiring-enriched", 60]` builds a lease query key with inline string literals inside a dashboard component, while `lease-keys.ts:119` already hosts the sibling `expiring(days)` factory (`[...all(), "expiring", days]`). Rule 9 requires this queryOptions (key + queryFn) to live in `src/hooks/api/query-keys/lease-keys.ts`; as written, the "expiring-enriched" cache entry is invisible to anyone auditing the factory file for invalidation coverage.

> Verifier: `src/components/dashboard/expiring-leases-widget.tsx:28-29` defines `queryOptions({ queryKey: [...leaseQueries.all(), "expiring-enriched", 60], ... })` inside the component, while CLAUDE.md rule 9 and the Query Key Factories section require all queryOptions factories to live in `src/hooks/api/query-keys/` — where the sibling `expiring(days)` factory already exists at `lease-keys.ts:117-119` with the identical `[...all(), "expiring", days]` pattern. The consequence is concrete: lease mutations in `use-lease-mutations.ts` invalidate `leaseQueries.lists()` + `leaseQueries.stats().queryKey` (not `

### [MEDIUM] `src/components/leases/table/lease-utils.ts:15`
**Duplicate `UnitWithProperty` conflicting with src/types/relations.ts**

`lease-utils.ts:15` exports `UnitWithProperty extends Unit { property?: Property }` while `src/types/relations.ts:135` exports `UnitWithProperty extends Unit { property: Property; leases: Array<Lease & { tenant: Tenant }> }`. Same exported name, same domain, different optionality and members — code handling the relations version assumes `property` is always present, code handling the lease-utils version cannot. Rule 3 blocking duplicate.

> Verifier: Both definitions exist exactly as claimed — `src/components/leases/table/lease-utils.ts:15` exports `UnitWithProperty extends Unit { property?: Property }` while `src/types/relations.ts:135` exports `UnitWithProperty extends Unit { property: Property; leases: Array<Lease & { tenant: Tenant }> }` — same exported name, same domain, incompatible shapes (optional vs required `property`, missing `leases`). CLAUDE.md Rule 3 states a type existing in `src/types/` must be used and "creating a local duplicate is a blocking violation"; the lease-utils copy is actively consumed (`use-lease.test.tsx:26` i

### [MEDIUM] `src/components/leases/wizard/selection-step.tsx:83`
**Three inline string-literal query keys in the lease wizard selection step (lines 83, 101, 126)**

`useQuery({ queryKey: [...propertyQueries.all(), "list"], ... })` (line 83), `[...unitQueries.all(), "by-property", data.property_id, "available"]` (line 101), and `[...tenantQueries.all(), "list-for-lease"]` (line 126) hand-assemble keys with string literals inside the component instead of using/adding factories, violating rule 9. Worse, line 83's key `["properties","list"]` is byte-identical to `propertyQueries.lists()` — the prefix under which `propertyQueries.list(filters)` caches `PaginatedResponse<Property>` — while this query caches a bare partial-column `Property[]`, so any prefix-scoped `setQueriesData`/`getQueryData` against `lists()` now encounters two incompatible shapes under one namespace.

> Verifier: Lines 83/101/126 hand-assemble query keys with string literals and inline queryFns in the component instead of `queryOptions()` factories — a direct rule-9 violation — and line 83's key `["properties","list"]` is byte-identical to `propertyQueries.lists()` (property-keys.ts:33). Concretely: opening the lease wizard caches a partial-column `Property[]` (id/name/address_line1/city/state only) under that key, and `useProperty()` (use-properties.ts:29) passes `propertyQueries.lists()` to `useEntityDetail`, whose `getQueriesData` prefix match includes the wizard's exact-match cache and whose `findI

### [MEDIUM] `src/components/maintenance/detail/maintenance-details.client.tsx:43`
**Inline string-literal expenses query key duplicated in two places within the component (lines 43 and 73)**

`queryKey: [...maintenanceQueries.all(), id, "expenses"]` is hand-built in the component for the expenses query (line 43) and then re-typed character-for-character in `handleRefresh`'s invalidateQueries (line 73). Rule 9 exists precisely to prevent this: the literal must stay in sync in both places by hand, and expense mutations defined in `expense-keys.ts` (root key `["expenses"]`) have no factory describing this `["maintenance", id, "expenses"]` entry, so nothing outside this file can correctly invalidate it. It belongs in maintenance-keys.ts as a factory.

> Verifier: Lines 43 and 73 of maintenance-details.client.tsx both hand-build `[...maintenanceQueries.all(), id, "expenses"]` (inline useQuery with a literal key segment, no factory), and maintenance-keys.ts contains no expenses factory (only list/detail/stats/urgent/photos/overdue) — a direct Rule 9 violation. The invalidation gap is real: useCreateExpenseMutation/useDeleteExpenseMutation (use-expense-mutations.ts:63,76) invalidate only `expenseKeys.all` (["expenses"]), financialKeys.all, and ownerDashboardKeys.all, none of which prefix-match ["maintenance", id, "expenses"], so an expense soft-deleted fr

### [MEDIUM] `src/components/maintenance/detail/maintenance-utils.ts:72`
**Duplicate maintenance `TimelineEvent` shadowing src/types/sections/maintenance.ts**

`src/types/sections/maintenance.ts:105` already exports a maintenance `TimelineEvent` (typed by `MaintenanceTimelineEventType`, `actor?` field); `maintenance-utils.ts:72` re-defines and exports a second maintenance `TimelineEvent` with an inline type union and `user?` instead of `actor?`. Same name, same domain (maintenance timeline), diverging shapes that must now be kept in sync manually. The section type should be the single source.

> Verifier: src/types/sections/maintenance.ts:105-112 exports maintenance `TimelineEvent` (`type: MaintenanceTimelineEventType` — 8-value union incl. "assigned"/"note_added" — and `actor?: string`), while src/components/maintenance/detail/maintenance-utils.ts:72-85 exports a second maintenance `TimelineEvent` with a diverged inline 6-value union and `user?: string`, and timeline-card.tsx:3 imports the duplicate instead of the section type. This directly violates CLAUDE.md Zero Tolerance Rule 3 ("No duplicate types") and the Type Lookup Order clause "If a type exists in `src/types/`, use it. Creating a loc

### [MEDIUM] `src/components/properties/types.ts:34`
**Parallel duplicate type system (`Property`, `Unit`, `PropertyType`, `PropertySummary`) shadowing canonical src/types definitions**

This actively-imported file (used by property-transforms.ts, properties-store.ts, properties.tsx, property-table-row.tsx, etc.) re-defines `Property` (line 34), `Unit` (line 23), `PropertyType` (line 3), and `PropertySummary` (line 54), all of which already exist in src/types (`core.ts:120/121/182`, `relations.ts:235`). The local `PropertyType` union is lowercase ("single_family"...) while the canonical constants-backed union is uppercase ("SINGLE_FAMILY", "TOWNHOUSE", "OTHER"), and the local `PropertySummary` (portfolio totals) has a completely different shape than relations.ts `PropertySummary` (single-property card data) — the same import name resolves to incompatible types depending on path. Rule 3 makes each of these a blocking duplicate.

> Verifier: `src/components/properties/types.ts` re-defines `Property` (line 34), `Unit` (line 23), `PropertyType` (line 3), and `PropertySummary` (line 54) — all names that already exist in `src/types/core.ts` (lines 120/121/182) and `src/types/relations.ts:235` — and the file is live (imported by property-transforms.ts, properties-store.ts, properties.tsx, property-table-row.tsx, properties-filters.tsx, property-bulk-edit-dialog.tsx, etc.), violating CLAUDE.md Rule 3 ("creating a local duplicate is a blocking violation"). The duplicates are incompatible: local `PropertyType` is lowercase `"single_family

### [MEDIUM] `src/components/tenants/tenant-detail-sheet.tsx:66`
**Static inline `maxWidth: "28rem"` overrides and dead-codes the `sm:max-w-80` Tailwind class on the same element**

The sheet's className declares `sm:max-w-80` (20rem) but the inline `style={{ maxWidth: "28rem" }}` wins at every breakpoint because inline styles beat classes, so the responsive class can never apply and the two declarations silently disagree about the sheet width. Rule 5 forbids the inline style; the static 28rem value is exactly Tailwind's `max-w-md` and should replace both.

> Verifier: Line 66 of src/components/tenants/tenant-detail-sheet.tsx has a static `style={{ maxWidth: "28rem" }}` on the same div whose className (line 65) declares `sm:max-w-80` (20rem); inline styles win over non-!important stylesheet utilities, so the responsive class is dead at every breakpoint and the two widths silently conflict. The value is static (no dynamic computation justifying inline), directly violating CLAUDE.md Zero Tolerance Rule 5 ("No inline styles — Tailwind utilities or globals.css custom properties only"), and 28rem is exactly Tailwind's `max-w-md`.

### [MEDIUM] `src/hooks/api/query-keys/lease-keys.ts:15`
**Duplicate `LeaseFilters` conflicting with src/types/api-contracts.ts**

`lease-keys.ts:15` exports `LeaseFilters` (with `unit_id`, `search`) while `src/types/api-contracts.ts:237` exports a different `LeaseFilters` (with `start_date`, `end_date`, no `unit_id`/`search`). Two exported interfaces with the same name and same purpose but different fields; filter objects valid against one silently drop fields against the other. One canonical definition in src/types should be used by the key factory.

> Verifier: Both exports exist exactly as claimed: `src/hooks/api/query-keys/lease-keys.ts:15` defines `LeaseFilters` with `unit_id`/`search` (no date fields), while `src/types/api-contracts.ts:237` defines a different `LeaseFilters` with `start_date`/`end_date` (no `unit_id`/`search`); a repo-wide grep shows the api-contracts version is used nowhere while the factory uses its local copy. This directly violates CLAUDE.md Zero Tolerance Rule 3 ("No duplicate types — search src/types/ before creating any type") and the Type Lookup Order mandate ("If a type exists in src/types/, use it. Creating a local dupl

### [MEDIUM] `src/hooks/api/query-keys/lease-keys.ts:26`
**Duplicate `SignatureStatus` conflicting with src/types/api-contracts.ts**

`lease-keys.ts:26` defines `SignatureStatus` with `status`, `sent_for_signature_at`, `both_signed`, while `src/types/api-contracts.ts:247` defines `SignatureStatus` with `owner_signature_ip`/`tenant_signature_ip` and none of those fields. Same exported name, same e-sign domain, incompatible shapes — mappers or components importing the wrong one compile against fields the RPC never returns. Rule 3 violation.

> Verifier: Two incompatible exported `SignatureStatus` interfaces exist: lease-keys.ts:26 (has `status`/`sent_for_signature_at`/`both_signed`, no IP fields) vs api-contracts.ts:247 (has `owner_signature_ip`/`tenant_signature_ip`, none of the others), and api-contracts.ts:257 `SignatureStatusResponse` is a near-exact structural duplicate of the lease-keys local type — a direct Rule 3 / mandatory type-lookup-order violation ("if a type exists in src/types/, use it; a local duplicate is a blocking violation"). Impact is latent, not active: every current consumer (lease-signature-status.tsx, tests) imports t

### [MEDIUM] `src/hooks/api/query-keys/lease-keys.ts:38`
**Duplicate `LeaseListItem` with a different Pick set than src/types/api-contracts.ts**

`lease-keys.ts:38` exports `LeaseListItem` picking 10 lease columns (incl. `owner_user_id`, `updated_at`) while `src/types/api-contracts.ts:147` exports `LeaseListItem` picking 8 (no `owner_user_id`/`updated_at`, and no `created_at` overlap mismatch). Two same-named list-view types drift independently; a component switching import paths gains/loses columns silently. Consolidate to the api-contracts definition per the type lookup order.

> Verifier: Both exports verified: `src/hooks/api/query-keys/lease-keys.ts:38` defines `LeaseListItem` as Pick of 10 lease columns (adding `owner_user_id` and `updated_at`) and is used by the `expiring:` queryFn at line 120, while `src/types/api-contracts.ts:147` exports a same-named `LeaseListItem` picking only 8 columns — two divergent shapes under one name. This directly violates CLAUDE.md Zero Tolerance rule 3 ("No duplicate types — search `src/types/` before creating any type") and the Type Lookup Order clause that calls a local duplicate of an existing `src/types/` type a blocking violation.

### [MEDIUM] `src/hooks/api/query-keys/property-keys.ts:19`
**Duplicate `PropertyFilters` conflicting with src/types/relations.ts**

`property-keys.ts:19` exports `PropertyFilters` (`status?: PropertyStatus`, `search`, `limit`, `offset`) while `src/types/relations.ts:275` exports `PropertyFilters` with `minUnits`/`maxUnits`/`minRent`/`maxRent`/`city`/`state` and a hardcoded status union. Same exported name, incompatible fields, both live. Rule 3 requires the factory to import the canonical type (or the stale relations copy to be removed) rather than a second definition.

> Verifier: Both definitions exist exactly as claimed — `src/hooks/api/query-keys/property-keys.ts:19` exports `PropertyFilters { status?: PropertyStatus; property_type?; search?; limit?; offset? }` while `src/types/relations.ts:275` exports an incompatible `PropertyFilters { property_type?; status?: "active"|"inactive"|"maintenance"; minUnits?; maxUnits?; minRent?; maxRent?; city?; state? }`. The only consumer (`src/hooks/api/use-properties.ts:15`) imports the property-keys copy, leaving the src/types/ version live-but-shadowed, which is precisely CLAUDE.md Rule 3 ("If a type exists in `src/types/`, use 

### [MEDIUM] `src/hooks/api/use-vendor.ts:27`
**`vendorKeys` queryOptions factory with string-literal root key defined outside src/hooks/api/query-keys/**

`vendorKeys` (line 27, root `all: ["vendors"] as const` at line 28) is a full query-key factory living in `use-vendor.ts`, violating rule 9's requirement that all factories live in `src/hooks/api/query-keys/` (the file even imports `vendorMutations` from `./query-keys/maintenance-keys`, so the sanctioned home exists). Only `authKeys` in use-auth.ts is a documented exception. The factory should move to a `query-keys/vendor-keys.ts` file so invalidation sweeps that browse the factories directory see the "vendors" keys.

> Verifier: `vendorKeys` (src/hooks/api/use-vendor.ts:27-88) is a full query-key factory (all/lists/list/details/detail with `queryOptions()`) defined outside `src/hooks/api/query-keys/`, while zero-tolerance rule 9 and the "Query Key Factories" section of CLAUDE.md both require factories to live in that directory; the only documented exception is `authKeys` in use-auth.ts. The sanctioned home demonstrably exists for this domain — the sibling `vendorMutations` factory lives in `query-keys/maintenance-keys.ts` (line 446) and is imported by this same file — and no `query-keys/vendor-keys.ts` exists, so dire

### [MEDIUM] `src/hooks/use-supabase-upload.ts:9`
**Module-level Supabase client created at import time, violating the "No module-level Supabase client" rule**

`const supabase = createClient();` sits at module scope (line 9) instead of inside the query/mutation/callback functions that use it, which CLAUDE.md's Hook Organization section explicitly forbids. The client is instantiated as a side effect of importing the hook, before any component runs, and is shared for the module's lifetime instead of being created per call like every other hook in the codebase. Correct is calling `createClient()` inside `onUpload`/`onDrop` where the client is actually used.

> Verifier: Line 9 of /Users/richard/Developer/tenant-flow/src/hooks/use-supabase-upload.ts is literally `const supabase = createClient();` at module scope, used inside `onUpload` (line 90), directly violating CLAUDE.md's Hook Organization rule "No module-level Supabase client — `createClient()` inside each mutation/query function". A repo-wide grep confirms this is the sole hook file with a module-level client — every other hook creates it per-call, so this is an isolated, unambiguous rule violation (medium: import-time side effect, no demonstrated runtime bug since the browser client is effectively a si

### [MEDIUM] `src/lib/constants/status-types.ts:382`
**Duplicate `SecurityEventType` with a completely different value set than the one in src/types/core.ts**

`src/types/core.ts:63` defines `SecurityEventType` as a dot-namespaced union ("auth.login", "auth.failed_login", "user.created", ...) while `src/lib/constants/status-types.ts:382` independently exports a `SecurityEventType` derived from SECURITY_EVENT_TYPES with snake_case values ("cors_violation", "malicious_request", "account_takeover", ...). The two unions share no members, so code importing the wrong one type-checks against event names that the other half of the system will never emit or accept. Rule 3 (no duplicate types) requires a single canonical definition in src/types.

> Verifier: Both exports exist exactly as claimed — `src/types/core.ts:63` defines `SecurityEventType` as the dot-namespaced union that matches the prod DB CHECK constraint (`security_events_event_type_check` in `supabase/migrations/20251231081143_migrate_enums_to_text_constraints.sql:436`, values like 'auth.login'), while `src/lib/constants/status-types.ts:382` exports a same-named type from SECURITY_EVENT_TYPES whose 19 snake_case values ('cors_violation', 'account_takeover', ...) share zero members and would ALL be rejected by that DB constraint. This directly violates CLAUDE.md Rule 3 (no duplicate ty

### [MEDIUM] `src/lib/stripe/stripe-client.ts:13`
**Duplicate `CreateCheckoutSessionRequest` with a conflicting shape vs src/types/core.ts**

`src/types/core.ts:101` exports `CreateCheckoutSessionRequest` requiring `productName`, `tenantId`, `domain`, while `stripe-client.ts:13` defines a local interface of the same name requiring `priceId`, `planName` with optional `tenant_id`/`source`. Same name, same checkout domain, incompatible contracts — a developer importing the core type to build a checkout payload sends fields the Edge Function does not read. Rule 3: search src/types first and keep one canonical request type.

> Verifier: `src/types/core.ts:101` exports `CreateCheckoutSessionRequest` (required `productName`/`tenantId`/`domain`) while `stripe-client.ts:13` defines a same-named local interface with a conflicting shape (required `priceId`/`planName`, optional `tenant_id`/`source`) — a direct CLAUDE.md Rule 3 violation ("creating a local duplicate is a blocking violation"). The core.ts variant has zero importers and is misleading: the stripe-checkout Edge Function reads only `body.price_id ?? body.priceId` and `body.source` (index.ts:55,82), so a developer building a payload from the core type would send required f

### [MEDIUM] `src/lib/utils/currency.ts:8`
**Duplicate `BillingInterval` with a different union than src/types/stripe.ts**

`currency.ts:8` exports `BillingInterval = "monthly" | "annual" | "month" | "year"` while `src/types/stripe.ts:25` exports `BillingInterval = BillingPeriod` (`"monthly" | "annual"`). Same exported name, divergent members: code typed against the currency version accepts "month"/"year" values that the stripe-side type (and any switch/assertNever over it) rejects. One canonical type in src/types should be extended or mapped instead of redefined.

> Verifier: Both definitions exist as claimed — `src/lib/utils/currency.ts:8` exports `BillingInterval = "monthly" | "annual" | "month" | "year"` while `src/types/stripe.ts:25` exports `BillingInterval = BillingPeriod` (`"monthly" | "annual"` at line 20), same exported name with divergent members. This directly violates CLAUDE.md Zero Tolerance Rule 3 ("No duplicate types — search src/types/ before creating any type; creating a local duplicate is a blocking violation"), and a value typed as currency's `BillingInterval` (e.g. `"month"`) is not assignable to the stripe-side type. Mitigating context: no code

### [MEDIUM] `src/lib/validation/leases.ts:217`
**Validation file re-exports duplicate type names `Lease` (217), `LeaseUpdate` (218), `LeaseFormData` (265) already defined in src/types**

`Lease` duplicates `src/types/core.ts:123`, `LeaseUpdate` duplicates `api-contracts.ts:214`, and `LeaseFormData` collides with the unrelated `src/types/lease-generator.types.ts:79` `LeaseFormData` (lease-generator PDF payload) — the last pair is two structurally different types under one name in two importable locations. Rule 3 blocking duplicates.

> Verifier: src/lib/validation/leases.ts exports `Lease` (line 217), `LeaseUpdate` (218), and `LeaseFormData` (265) while `src/types/core.ts:123` defines `Lease = Tables<"leases">`, `api-contracts.ts:214` defines `LeaseUpdate = TablesUpdate<"leases">`, and `lease-generator.types.ts:79` defines a structurally different `LeaseFormData` interface (lease-generator PDF payload vs all-string form fields) — CLAUDE.md Rule 3 states a local duplicate of a type existing in src/types/ is a blocking violation. The duplicate is live, not dead code: `lease-mutation-options.ts:19` imports `LeaseUpdate` from the validati

### [MEDIUM] `src/lib/validation/maintenance.ts:225`
**Validation file re-exports duplicate type names `MaintenanceRequest` (225) and `MaintenanceRequestUpdate` (226) already defined in src/types**

`MaintenanceRequest` duplicates `src/types/core.ts:124` (`Tables<"maintenance_requests">`) and `MaintenanceRequestUpdate` duplicates `api-contracts.ts:220`. Same names, zod-inferred shapes diverging from the DB row types; rule 3 violation.

> Verifier: src/lib/validation/maintenance.ts:225-228 exports `MaintenanceRequest` (z.infer of maintenanceRequestSchema) and `MaintenanceRequestUpdate` (z.infer of maintenanceRequestInputSchema.partial()), while `src/types/core.ts:124` already exports `MaintenanceRequest = Tables<"maintenance_requests">` and `src/types/api-contracts.ts:220` exports `MaintenanceRequestUpdate = TablesUpdate<"maintenance_requests">` — identical names with diverging shapes (zod uses `.optional()`/undefined and omits row columns vs the DB row's `| null` fields), violating CLAUDE.md rule 3 ("a type exists in src/types → creatin

### [MEDIUM] `src/lib/validation/properties.ts:194`
**Validation file re-exports duplicate type names `Property` (194), `PropertyUpdate` (195), `PropertyStats` (199) already defined in src/types**

`export type Property = z.infer<typeof propertySchema>` collides with `src/types/core.ts:120` `Property = Tables<"properties">`; `PropertyUpdate` collides with `api-contracts.ts:202` `TablesUpdate<"properties">`; `PropertyStats` collides with `stats.ts:10`. The z.infer shapes are not identical to the DB row types, so `import type { Property }` resolves to different structures depending on the path — exactly what rule 3 ("no duplicate types") forbids. Unique names (e.g. `PropertySchemaOutput`) or reusing the canonical types is correct.

> Verifier: src/lib/validation/properties.ts:194-199 exports `Property`, `PropertyUpdate`, `PropertyStats` colliding with canonical types at core.ts:120, api-contracts.ts:202, and stats.ts:10, with genuinely different shapes (z.infer `Property` lacks `acquisition_cost`/`acquisition_date`/`date_sold`/`sale_price`/`search_vector` and has `address_line2?: string` vs `string | null`; z.infer `PropertyStats` has `active/inactive/sold/units/occupied_units` while stats.ts has `occupied/vacant/totalMonthlyRent/averageRent`). The collision is live, not latent — `src/hooks/api/query-keys/property-keys.ts:12` import

### [MEDIUM] `src/lib/validation/tenants.ts:158`
**Validation file re-exports duplicate type names `TenantInput` (158), `Tenant` (159), `TenantUpdate` (160), `EmergencyContact` (163) already defined in src/types**

`TenantInput`/`TenantUpdate` duplicate `src/types/core.ts:127-128` (TablesInsert-based), `Tenant` duplicates `core.ts:122`, and `EmergencyContact` duplicates `api-contracts.ts:374`. Four same-named exported types with different (zod-inferred) shapes than the canonical ones — rule 3 blocking duplicates.

> Verifier: src/lib/validation/tenants.ts:158-163 exports `TenantInput`, `Tenant`, `TenantUpdate`, `EmergencyContact` with zod-inferred shapes that collide with the canonical `Tenant`/`TenantInput`/`TenantUpdate` in src/types/core.ts:122,127-128 (Tables/TablesInsert-based) and `EmergencyContact` in src/types/api-contracts.ts:374 (row shape with id/tenant_id/timestamps vs zod's name/phone/relationship only). Both `TenantUpdate` shapes are live simultaneously — src/types/api-contracts.ts:21 imports it from `#lib/validation/tenants` while tenant-keys/tenant-mappers import `Tenant` from `#types/core` — so the

### [MEDIUM] `src/lib/validation/units.ts:140`
**Validation file re-exports duplicate type names `Unit` (140), `UnitUpdate` (141), `UnitStats` (143) already defined in src/types**

`Unit` duplicates `src/types/core.ts:121` (`Tables<"units">`), `UnitUpdate` duplicates `api-contracts.ts:208`, and `UnitStats` duplicates `stats.ts:36`. Same exported names with schema-inferred shapes that differ from the canonical DB types, creating import-path-dependent type identities in violation of rule 3.

> Verifier: src/lib/validation/units.ts:140-143 exports `Unit`, `UnitUpdate`, `UnitStats` while canonical same-name types exist at src/types/core.ts:121 (`Unit = Tables<"units">`), api-contracts.ts:208 (`UnitUpdate = TablesUpdate<"units">`), and stats.ts:36 (`interface UnitStats`, whose shape differs — `averageRent`/`totalPotentialRent` vs the schema's `average_rent_amount`/`total_rent_amount`), violating CLAUDE.md rule 3 ("creating a local duplicate is a blocking violation"). The divergence is live, not theoretical: src/hooks/api/query-keys/unit-keys.ts:20 imports `UnitUpdate` from the validation file (a

### [LOW] `src/components/dashboard/components/portfolio-data-table.tsx:217`
**Fully static inline style objects (lines 217, 225, 237) where Tailwind utilities exist**

`style={{ display: "grid" }}` on the table (217), `style={{ display: "grid", position: "sticky", top: 0, zIndex: 1 }}` on TableHeader (225), and `style={{ display: "flex", width: "100%" }}` on the header row (237) contain only static values with direct utility equivalents (`grid`, `grid sticky top-0 z-1`, `flex w-full`). Unlike the neighboring virtualizer styles (dynamic flex-basis/translate/height), these three have no runtime-computed values and violate rule 5 as written.

> Verifier: Lines 217, 225-230, and 237 of src/components/dashboard/components/portfolio-data-table.tsx contain style objects with only static literal values (`display:"grid"`, `position:"sticky"/top:0/zIndex:1`, `display:"flex"/width:"100%"`) — unlike the genuinely dynamic `flex: 1 1 ${header.getSize()}px` at line 250 — violating CLAUDE.md Zero Tolerance Rule 5 ("No inline styles — Tailwind utilities or globals.css custom properties only"). The ui `TableHeader`/`TableRow` primitives merge `className` via `cn()` (src/components/ui/table.tsx lines 24, 57-59) and apply no conflicting display/position classe

### [LOW] `src/components/leases/detail/lease-detail-utils.ts:15`
**Exported `TimelineEvent` name collides with the existing src/types TimelineEvent**

`lease-detail-utils.ts:15` exports a lease-domain `TimelineEvent` while `src/types/sections/maintenance.ts:105` already exports `TimelineEvent` (and maintenance-utils.ts adds a third). Three exported types named `TimelineEvent` in one codebase; rule 3 mandates checking src/types first and using a distinct name (e.g. `LeaseTimelineEvent`) or a shared generic timeline type in src/types.

> Verifier: Three exported `TimelineEvent` types verified: `src/types/sections/maintenance.ts:105` (canonical, in src/types), `src/components/leases/detail/lease-detail-utils.ts:15`, and `src/components/maintenance/detail/maintenance-utils.ts:72`. The lease type is a near-structural duplicate of the src/types one — identical fields `{ id, type, title, description, timestamp, actor? }` differing only in the `type` string union — violating CLAUDE.md rule 3 and the mandatory Type Lookup Order ("if a type exists in src/types/, use it; creating a local duplicate is a blocking violation"); the codebase's own co

### [LOW] `src/components/leases/wizard/lease-creation-wizard.tsx:102`
**Ad-hoc inline query keys bypassing detail factories (lines 102, 115, 128)**

The wizard builds `[...propertyQueries.all(), selectionData.property_id]`, `[...unitQueries.all(), selectionData.unit_id]`, and `[...tenantQueries.all(), selectionData.primary_tenant_id]` inline with bespoke queryFns instead of the existing `detail(id)` factories (which key as `[..., "detail", id]`). Rule 9 requires queryOptions factories; these ad-hoc keys create parallel cache entries for the same entities that mutation invalidations targeting `details()` prefixes do not describe, and the fetched `{id, name}` snapshots live outside any factory the invalidation sweep audits.

> Verifier: Lines 101-144 of src/components/leases/wizard/lease-creation-wizard.tsx build three ad-hoc keys (`[...propertyQueries.all(), id]`, `[...unitQueries.all(), id]`, `[...tenantQueries.all(), id]`) with inline queryFns, while `detail(id)` queryOptions factories exist in all three key files (property-keys.ts:109, unit-keys.ts:132, tenant-keys.ts:103) keying as `[..., "detail", id]` — violating CLAUDE.md rule 9 / the Query Key Factories section ("All query keys use queryOptions() factories in src/hooks/api/query-keys/"). Consequence is real but minor: e.g. `['tenants', <id>]` is not matched by the wi

### [LOW] `src/components/maintenance/detail/maintenance-header-card.tsx:30`
**Local `MaintenanceRequest` interface duplicates the canonical type name from src/types/core.ts**

The component defines `interface MaintenanceRequest` (id/title/status/priority/scheduled_date/estimated_cost/actual_cost) at line 30 while `src/types/core.ts:124` exports `MaintenanceRequest = Tables<"maintenance_requests">`. All fields exist on the canonical row type, so this should be `Pick<MaintenanceRequest, ...>`; defining a fresh same-named interface is exactly the local duplicate rule 3 calls a blocking violation.

> Verifier: Line 30 of src/components/maintenance/detail/maintenance-header-card.tsx defines a local `interface MaintenanceRequest` whose 8 fields (id, title, description, status, priority, scheduled_date, estimated_cost, actual_cost) all exist on the canonical `MaintenanceRequest = Tables<"maintenance_requests">` exported at src/types/core.ts:124 (verified against the generated row type in src/types/supabase.ts). The file already imports `MaintenancePriority`/`MaintenanceStatus` from `#types/core` on line 17, so this same-named local re-definition is exactly the CLAUDE.md rule-3 "local duplicate is a blo

### [LOW] `src/components/maintenance/kanban/maintenance-kanban.client.tsx:136`
**Local `KanbanColumnProps` duplicates the exported KanbanColumnProps in src/types/sections/maintenance.ts**

`src/types/sections/maintenance.ts:182` exports `KanbanColumnProps` for the maintenance kanban, but the kanban component defines its own conflicting `KanbanColumnProps` (column/requests/columnIndex/onView) at line 136. Same name, same feature, different shapes — the section type is now dead weight or a trap for the next import. Rule 3 violation.

> Verifier: `src/types/sections/maintenance.ts:182` exports `KanbanColumnProps` (title/count/colorClass/icon/requests: MaintenanceRequestItem[]/onView?/onUpdateStatus?/columnIndex) and repo-wide grep shows it is imported nowhere; `maintenance-kanban.client.tsx:136` defines a same-named local interface with a conflicting shape (column: ColumnConfig, requests: MaintenanceDisplayRequest[], columnIndex, onView) for the same kanban column component. This violates CLAUDE.md rule 3 / Type Lookup Order ("If a type exists in src/types/, use it. Creating a local duplicate is a blocking violation"), leaving the expo

### [LOW] `src/components/shared/blog-empty-state.tsx:29`
**Static inline width/animationDelay styles (lines 29, 33, 37, 39, 42)**

Sibling instances of the same class as blog-loading-skeleton.tsx: fixed literals such as `style={{ width: "100%", animationDelay: "0ms" }}` and `style={{ width: "60%" }}` that map 1:1 to Tailwind utilities (`w-full`, `w-[60%]`). No dynamic values are involved; rule 5 violation.

> Verifier: Lines 29 (`style={{ width: "100%", animationDelay: "0ms" }}`) and 39 (`style={{ width: "60%" }}`) in src/components/shared/blog-empty-state.tsx are fully static literals mapping 1:1 to Tailwind utilities (`w-full`, `[animation-delay:0ms]`, `w-[60%]`), and lines 33/37/42 also use the inline `style` attribute (width literals like "85%"/"92%" plus `var(--duration-*)` delays expressible as `[animation-delay:var(--duration-300)]` arbitrary utilities). CLAUDE.md zero-tolerance rule 5 bans inline styles, and the identical pattern exists in the cited sibling blog-loading-skeleton.tsx, so this is a rea

### [LOW] `src/components/shared/chart-loading-skeleton.tsx:14`
**Static inline height/animationDelay styles (lines 14, 18, 22, 26, 30)**

Each chart-skeleton bar hardcodes `style={{ height: "40%", animationDelay: "0ms" }}`-style objects with fixed literals (`h-[40%]` etc. in Tailwind). Same static-inline-style class as the blog skeletons; five instances, all rule 5 violations.

> Verifier: Lines 14, 18, 22, 26, 30 of src/components/shared/chart-loading-skeleton.tsx each pass a static-literal `style={{ height: "40%", animationDelay: ... }}` object, violating CLAUDE.md rule 5 (no inline styles — Tailwind utilities only); every value is a fixed constant expressible as `h-[40%]`/`[animation-delay:var(--duration-200)]` classes. The codebase's canonical pattern already does exactly that — loading-spinner.tsx uses `[animation-delay:var(--duration-200)]` arbitrary-value classes and grid-pattern.test.tsx (TOKEN-02) asserts on that class form — so this file is an outlier against both the 

### [LOW] `src/components/tenants/tenant-action-bar.tsx:36`
**Static inline style object trivially expressible as Tailwind utilities**

The floating toolbar sets `style={{ bottom: "24px", left: "50%", transform: "translateX(-50%)" }}` — all static values with exact Tailwind equivalents (`bottom-6 left-1/2 -translate-x-1/2`) that belong in the adjacent className per rule 5 (no inline styles; Tailwind utilities or globals.css custom properties only).

> Verifier: Lines 36-40 of src/components/tenants/tenant-action-bar.tsx set `style={{ bottom: "24px", left: "50%", transform: "translateX(-50%)" }}` — three static values with exact Tailwind equivalents (`bottom-6 left-1/2 -translate-x-1/2`) that could join the existing `className` on line 35, directly violating CLAUDE.md Zero Tolerance rule 5 ("No inline styles — Tailwind utilities or globals.css custom properties only"). No dynamic computation justifies the style object; cosmetic/convention-only impact, so severity stays low.

### [LOW] `src/components/units/unit-form-fields.tsx:10`
**Local `Property` interface duplicates the canonical Property type name**

`interface Property { id: string; name: string }` at line 10 re-declares the name of `src/types/core.ts:120`'s `Property`. It should be `Pick<Property, "id" | "name">` from `#types/core` (as sibling selection-step.tsx does); a from-scratch same-named interface is a rule 3 duplicate.

> Verifier: `src/components/units/unit-form-fields.tsx:10` declares a from-scratch `interface Property { id; name }` that shadows the canonical `Property` (`src/types/core.ts:120`, `Tables<"properties">`), while the data it types actually comes from `propertyQueries.list()` rows (unit-form.client.tsx:46-49) — real Property rows. The established sibling pattern exists at `src/components/leases/wizard/selection-step.tsx:40,52` (`import { Property as SharedProperty }` then `type Property = Pick<SharedProperty, ...>`), so this is a rule-3/Type-Lookup-Order violation per CLAUDE.md ("If a type exists in src/typ

### [LOW] `src/env.ts:156`
**Emoji characters in code strings (lines 156 and 166) violating the no-emojis rule**

The env validation error messages embed the emojis U+274C and U+1F4CB (line 156: "Invalid environment variables" prefixed with the cross-mark and clipboard emojis; line 166: another cross-mark). Rule 7 is "No emojis in code — Lucide Icons for UI". Plain-text prefixes like "ERROR:" are the compliant form.

> Verifier: src/env.ts line 156 contains U+274C and U+1F4CB in the onValidationError thrown message, and line 166 contains another U+274C in the onInvalidAccess message — literal emoji characters in code strings, which CLAUDE.md Zero Tolerance Rule 7 ("No emojis in code — Lucide Icons for UI") prohibits.

### [LOW] `src/hooks/api/query-keys/maintenance-keys.ts:36`
**Duplicate `MaintenanceFilters` vs src/types/api-contracts.ts**

`maintenance-keys.ts:36` exports `MaintenanceFilters` while `api-contracts.ts:276` exports a near-identical `MaintenanceFilters` that additionally has `search`. Two exported same-named filter interfaces in the same domain; the factory should import the canonical one instead of redefining it.

> Verifier: `src/hooks/api/query-keys/maintenance-keys.ts:36` exports a local `MaintenanceFilters` (unit_id/property_id/priority/status/limit/offset) while `src/types/api-contracts.ts:276` already exports a same-named superset (adds `search`) — a direct violation of CLAUDE.md Zero Tolerance Rule 3 and the Type Lookup Order ("If a type exists in `src/types/`, use it. Creating a local duplicate is a blocking violation."). The factory already imports from `#types/api-contracts` (`PaginatedResponse`, line 23), so importing the canonical type was trivially available.

### [LOW] `src/hooks/api/query-keys/unit-keys.ts:30`
**Duplicate `UnitFilters` vs src/types/api-contracts.ts**

`unit-keys.ts:30` exports `UnitFilters` with `status` narrowed to the four unit statuses while `api-contracts.ts:286` exports `UnitFilters` with `status?: string`. Same name, same purpose, two definitions that drift (the narrow union vs untyped string). One canonical type in src/types should be used.

> Verifier: Two exported `UnitFilters` exist: `src/hooks/api/query-keys/unit-keys.ts:30` (status narrowed to `"available" | "occupied" | "maintenance" | "reserved"`) and `src/types/api-contracts.ts:286` (`status?: string`), and only the local unit-keys copy is actually consumed (`list: (filters?: UnitFilters)` at unit-keys.ts:52). This directly violates CLAUDE.md rule 3 ("No duplicate types — search src/types/ before creating any type") and the Type Lookup Order mandate that a type existing in src/types/ must be used and a local duplicate is a blocking violation.

### [LOW] `src/lib/constants/status-types.ts:95`
**Duplicate `TenantStatus` with a superset union vs src/types/api-contracts.ts**

`status-types.ts:95` exports `TenantStatus` including "EVICTED", "MOVED_OUT", "ARCHIVED" (mixed-case values) while `src/types/api-contracts.ts:226` exports `TenantStatus = "active" | "inactive" | "pending"`. Code importing the constants version accepts statuses the api-contracts version (and the UI logic typed against it) will never handle. Rule 3 duplicate with real divergence.

> Verifier: `src/lib/constants/status-types.ts:86-95` exports `TenantStatus` as `"active"|"inactive"|"EVICTED"|"pending"|"MOVED_OUT"|"ARCHIVED"` while `src/types/api-contracts.ts:226` exports `TenantStatus = "active"|"inactive"|"pending"` — a genuine Rule 3 duplicate with divergent unions (and the mixed-case values also mismatch the actual persisted set in `tenant-mappers.ts`: active/inactive/pending/SUSPENDED/DELETED/moved_out). However the claimed harm is overstated: grep shows zero files import `TenantStatus` from status-types (importers only take `PropertyType`, `MaintenanceCategory`, `ActivityEntityT

### [LOW] `src/lib/constants/status-types.ts:80`
**Duplicate `SubscriptionStatus` independently defined in both status-types.ts and src/types/core.ts**

`status-types.ts:80` derives `SubscriptionStatus` from SUBSCRIPTION_STATUS and `src/types/core.ts:475` hand-writes an identical union (incomplete...paused). Unlike `PropertyType`/`MaintenanceCategory`, which core.ts correctly aliases from the constants file, this pair is two independent definitions that can drift when Stripe statuses change. core.ts should alias the constants-derived type.

> Verifier: `src/lib/constants/status-types.ts:80` derives `SubscriptionStatus` from the SUBSCRIPTION_STATUS const, while `src/types/core.ts:475` hand-writes the identical 8-member union — two independent definitions of the same type, violating CLAUDE.md rule 3 (no duplicate types). core.ts already demonstrates the correct pattern for this exact constants file: it imports and aliases `MaintenanceCategory`/`PropertyType` as `*FromConstants` (core.ts:90-91, 181-182), so the hand-written union is an inconsistency that can silently drift when Stripe statuses change; low is right since the unions are currently

### [LOW] `src/lib/constants/status-types.ts:243`
**Duplicate `EntityType` (243), `ActionType` (255), and `Permission` (260) independently defined in src/types/core.ts**

`src/types/core.ts:218-225` hand-writes `EntityType`, `ActionType`, and `Permission` unions that duplicate the constants-derived exports at status-types.ts:243/255/260. Currently value-identical, but maintained in two places with no alias linking them, so adding an entity in one file silently desynchronizes permission strings typed against the other. One should alias the other per rule 3.

> Verifier: `src/types/core.ts:218-225` hand-writes `EntityType` ("properties"|"units"|"tenants"|"leases"|"maintenance"), `ActionType` ("create"|"update"|"delete"|"view"), and `Permission` (`${EntityType}:${ActionType}`) that are value-identical to but independent of the constants-derived exports at `src/lib/constants/status-types.ts:243/255/260` — a direct violation of CLAUDE.md rule 3 (no duplicate types; a local duplicate is a blocking violation). Severity stays low because a repo-wide grep shows neither copy (nor `PermissionType`) is imported by any consumer, so the desync risk is currently theoretica

### [LOW] `src/lib/constants/status-types.ts:202`
**Duplicate `PlanType` independently defined in src/types/stripe.ts**

`status-types.ts:202` derives `PlanType` from PLAN_TYPES while `src/types/stripe.ts:15` hand-writes the identical union "FREETRIAL" | "STARTER" | "GROWTH" | "TENANTFLOW_MAX". Two unlinked definitions of the plan enum; a plan rename must be made twice. stripe.ts should alias the constants-derived type.

> Verifier: `src/lib/constants/status-types.ts:202` derives `PlanType` from the PLAN_TYPES const while `src/types/stripe.ts:15` hand-writes the byte-identical union `"FREETRIAL" | "STARTER" | "GROWTH" | "TENANTFLOW_MAX"` with no import/alias linking them — grep shows neither references the other — violating CLAUDE.md Zero Tolerance rule 3 ("No duplicate types... creating a local duplicate is a blocking violation"). Severity stays low because grep shows no other file currently imports `PlanType` from either location, so the drift risk is latent rather than active.

### [LOW] `src/lib/validation/lease-wizard.schemas.ts:341`
**Duplicate `SignatureStatusResponse` vs src/types/api-contracts.ts**

`lease-wizard.schemas.ts:341` exports `SignatureStatusResponse = z.infer<typeof signatureStatusResponseSchema>` while `src/types/api-contracts.ts:257` exports an interface `SignatureStatusResponse` for the same RPC response. Two definitions of the same contract that must be manually kept in sync; the schema-inferred one should either replace or be named distinctly from the api-contracts one.

> Verifier: Both definitions exist with the identical shape — `src/types/api-contracts.ts:257` declares `interface SignatureStatusResponse` and `src/lib/validation/lease-wizard.schemas.ts:341` exports `type SignatureStatusResponse = z.infer<typeof signatureStatusResponseSchema>` with the same 8 fields and status enum. This directly violates CLAUDE.md Zero Tolerance Rule 3 ("No duplicate types") and the Type Lookup Order ("If a type exists in src/types/, use it. Creating a local duplicate is a blocking violation."). Grep shows neither export is imported anywhere else, so impact is drift risk only — low sev

### [LOW] `src/stores/preferences-store.ts:11`
**`DataDensity` copy-pasted duplicate of src/types/domain.ts**

`preferences-store.ts:11` exports `DataDensity = "compact" | "comfortable" | "spacious"` with the exact same union and even the identical doc comment as `src/types/domain.ts:138`. Consumers currently import the store copy, leaving two live definitions of one type. The store should import from `#types/domain` per rule 3 and the type lookup order.

> Verifier: `src/stores/preferences-store.ts:11` defines `export type DataDensity = "compact" | "comfortable" | "spacious"` with a doc comment identical to `src/types/domain.ts:132-138`, while the same store file already imports `ThemeMode` from `#types/domain` on line 3 — proving the canonical source was known and the duplicate violates CLAUDE.md rule 3 ("No duplicate types") and the Type Lookup Order ("If a type exists in `src/types/`, use it. Creating a local duplicate is a blocking violation"). Consumers (`src/components/settings/general-settings.tsx:20`) import the store copy, so two live definitions


## Plausible — not fully confirmed (4)

- `src/hooks/api/use-tour-progress.ts:39` — localStorage tour progress is `JSON.parse(...)` cast to `Record<string, TourStatus>` without validation, and the raw value is returned as a typed `TourStatus`. (The unvalidated cast is real and the API-failure fallback (lines 127-135) does return the raw string as TourStatus, but no system-produced state can trigger it: the only writers of `tenantflow:tour-pr)
- `src/app/actions/blog-publish.ts:141` — rejectBlogPost performs no revalidation even though the file's own header names "reject/archive a published post after the fact" as this surface's primary role. (The contradiction is real — the header (blog-publish.ts:19-23) names "reject/archive a published post after the fact" as this surface's role, `rejectBlogPost` (141-158) does no revalidation, and /blog)
- `src/hooks/api/use-tenant.ts:36` — useTenantList and useAllTenants perform cache writes (setQueryData) inside the query `select` function (The cache writes inside `select` (use-tenant.ts lines 35-47, 65-87) are real and do violate TanStack Query's documented requirement that `select` be pure, and are inconsistent with the sibling `useLea)
- `src/components/shared/blog-loading-skeleton.tsx:14` — Static inline width/animationDelay styles across the skeleton (lines 14, 18, 22, 26, 30, 35, 39) (The static width literals (`style={{ width: "92%" }}` etc.) do sit in inline `style` props expressible as `w-[92%]`, so rule 5's letter is technically implicated — but the claim's "all seven instances)
