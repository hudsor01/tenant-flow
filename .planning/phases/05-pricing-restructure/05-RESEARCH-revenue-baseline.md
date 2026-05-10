# Phase 5: Pricing Restructure — Research (Specialist 1: Revenue Baseline)

**Researched:** 2026-05-10
**Domain:** Stripe revenue audit + codebase pricing-touchpoint inventory
**Confidence:** HIGH for codebase forensics, BLOCKED for live Stripe revenue queries (see §1)

## Summary

This is the revenue-baseline half of Phase 5 research (Specialist 2 covers competitor pricing matrix). The user has stated the account has zero subscribers — the codebase forensics fully support that this is *plausible* (no production write-paths from Stripe-test-mode price IDs, no subscriber-count UI to populate, no support tickets touching billing in any committed memory). However, the live Stripe revenue snapshot deliverables (§1, §2 columns marked "live", §6, §7) require Stripe MCP tools (`mcp__stripe__*`) that are NOT available in this researcher session — see "Blocked Deliverables" below.

What IS fully audited and HIGH-confidence:
- Every Stripe price ID literal embedded in source (live: 9 IDs across 3 paid tiers + 1 trial, plus 2 stale Max IDs that exist only in old migrations)
- Every codebase touchpoint where the executor has to update a price/plan/limit/copy
- The migration risk surface (§4) — including a real, unresolved drift between two sets of Max price IDs in the codebase
- Every test that pins specific dollar values, plan names, or feature limits

**Primary recommendation:** Treat this RESEARCH as half-finished. The planner MUST run Stripe MCP queries (or shell `stripe` CLI calls) at plan-time to fill in §1 + §2 + §6 + §7 before the executor opens the migration plan. The codebase-touchpoint matrix in §3 and the migration-risk inventory in §4 are complete and can drive plan-task generation now.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stripe price/product source-of-truth | External (Stripe API) | — | Stripe is the canonical billing system; everything else mirrors it |
| Frontend pricing display | Browser (client) | — | Pricing cards + comparison table render client-side from `getAllPricingPlans()` |
| Marketing-page metadata + JSON-LD | Frontend Server (SSR) | — | `src/app/pricing/page.tsx` emits server-rendered `<title>`, OG, and Product schema |
| Tier entitlement enforcement | API/Backend | — | `supabase/functions/_shared/tier-gate.ts` + DB RPC `get_user_plan_limits` |
| Tier slug normalization | API/Backend | — | `priceIdToTier()` in `supabase/functions/_shared/plan-tier.ts` resolves price ID → slug |
| Subscription state cache | Database/Storage | API/Backend | `users.subscription_plan` + `users.subscription_status` mirrored from webhooks |
| Checkout session creation | API/Backend | External (Stripe) | `stripe-checkout` Edge Function with `ALLOWED_CHECKOUT_PRICE_IDS` allowlist |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-01 | Audit current Stripe revenue (subscribers, MRR, ARR, churn, conversion) | Blocked-pending-MCP §1; codebase shows no UI to surface this metric |
| PRICE-02 | Competitor pricing analysis | Out of scope for this specialist (Specialist 2) |
| PRICE-03 | Propose new tier structure → write `PRICING-DECISION.md` | Constraints in §3, §5; can begin with current data |
| PRICE-04 | Migrate Stripe products + prices via MCP | §3 + §4 inventory drives the migration script; §5 lists user decisions blocking this task |
| PRICE-05 | Customer migration plan | Trivial (zero subscribers per user); §4 documents the no-op playbook |
| PRICE-06 | Update all marketing surfaces with final pricing | §3 enumerates all 21 touchpoints |

## 1. Revenue Snapshot Table

**[BLOCKED — STRIPE MCP UNAVAILABLE]**

The Stripe revenue snapshot the scope requested cannot be assembled from this researcher session. The project's `.mcp.json` registers only the Supabase MCP (`mcp.supabase.com`) — Stripe MCP (`mcp__stripe__*`) is not configured at the project level, and tool-restricted agent sessions strip MCP access regardless. The `mcp__supabase__*` tools that ARE configured at the project level are also stripped from this restricted-agent session.

| Metric | Value | Source |
|--------|-------|--------|
| Account ID + mode (live vs test) | UNKNOWN | `mcp__stripe__get_stripe_account_info` |
| Active subscriptions | UNKNOWN | `mcp__stripe__list_subscriptions status=active` |
| Trialing subscriptions | UNKNOWN | `mcp__stripe__list_subscriptions status=trialing` |
| Past_due / canceled subscriptions | UNKNOWN | `mcp__stripe__list_subscriptions` |
| Total customers | UNKNOWN | `mcp__stripe__list_customers` |
| MRR baseline | UNKNOWN | sum(active subscriptions × monthly price) |
| Trailing-30-day paid invoices | UNKNOWN | `mcp__stripe__list_invoices status=paid` |
| Trailing-365-day paid invoices | UNKNOWN | same, 1y window |
| Active coupons | UNKNOWN | `mcp__stripe__list_coupons` |

**Inferred state from codebase (LOW confidence — circumstantial):**
- User explicitly stated "zero subscribers" in `.planning/PROJECT.md` § Key Decisions row 11 [VERIFIED: PROJECT.md L150]: "Current Stripe prices ($29 / $79 / $199) treated as starting point only" + COPY-02 row L154: "User has zero subscribers."
- `src/components/sections/comparison-table.tsx` and `src/app/__tests__/marketing-copy-landlord-only.test.ts` ban fabricated subscriber counts — consistent with zero-subscriber state.
- No production data-dependent UI exists in `src/app/(owner)/billing/` that would hard-fail with zero subscribers.

**Required action by planner:** Before plan creation, run these Stripe MCP calls (or shell-out via `stripe` CLI with the project's `STRIPE_SECRET_KEY`) and inline the values into the plan-time copy of this table:
```
mcp__stripe__get_stripe_account_info
mcp__stripe__list_subscriptions limit=100  # filter status client-side; aggregate by tier
mcp__stripe__list_customers limit=100
mcp__stripe__list_invoices status=paid created_gte=<30d-ago-unix>
mcp__stripe__list_coupons limit=100
```

If the planner also lacks Stripe MCP, the user must run them and paste the output into a CONTEXT.md amendment before the executor can complete PRICE-04.

## 2. Stripe Inventory Matrix (Codebase-Embedded IDs)

This matrix lists every Stripe price ID that appears as a literal in source code. The "Stripe API confirms" column is BLOCKED-pending-MCP — the planner must verify each ID exists, is active, has the expected `unit_amount`, and is on the expected `recurring.interval`.

| Tier | Period | Price ID | Code Says | Stripe API Confirms |
|------|--------|----------|-----------|--------------------|
| Trial | $0 (DB-managed; no Stripe sub) | `price_1RgguDP3WCR53Sdo1lJmjlD5` | $0 trial allowlisted only for DB state, NOT in `ALLOWED_CHECKOUT_PRICE_IDS` [VERIFIED: plan-tier.ts L31-34, L43-50] | UNKNOWN |
| Starter | monthly | `price_1RtWFcP3WCR53SdoCxiVldhb` | $29/mo, 5 props / 25 units | UNKNOWN |
| Starter | annual | `price_1RtWFdP3WCR53SdoArRRXYrL` | $290/yr, 5 props / 25 units | UNKNOWN |
| Growth | monthly | `price_1SPGCNP3WCR53SdorjDpiSy5` | $79/mo, 20 props / 100 units | UNKNOWN |
| Growth | annual | `price_1SPGCRP3WCR53SdonqLUTJgK` | $790/yr, 20 props / 100 units | UNKNOWN |
| Max | monthly | `price_1Rd16pP3WCR53SdoCh3oJlDl` | $199/mo, unlimited | UNKNOWN |
| Max | annual | `price_1Rd17AP3WCR53SdoTB4FTbSq` | $2189/yr, unlimited | UNKNOWN |

### Drift Alert: stale Max IDs in old migrations

[VERIFIED: grep across `supabase/migrations/`] Three migration files reference DIFFERENT Max price IDs that DO NOT exist in `pricing.ts` or `plan-tier.ts`:

- `20260218120000_fix_plan_limits_real_tiers.sql` lines 88-89: `price_1SPGCjP3WCR53SdoIpidDn0T` (monthly) + `price_1SPGCoP3WCR53SdoID50geIC` (annual)
- `20260219100000_implement_check_user_feature_access.sql` lines 57-58: same stale Max IDs
- `20260304120000_rpc_auth_guards.sql` lines 2272-2273 + 2374-2375: same stale Max IDs

The current `get_user_plan_limits` was rewritten in `20260505221558_enforce_plan_limits_recognize_price_ids.sql` to use the **live** Max IDs (`price_1Rd16p...` / `price_1Rd17A...`) — but this is a Postgres function replacement, NOT a delete of the older RPCs that emit the stale IDs. The two `check_user_feature_access` and `rpc_auth_guards` migrations are still live in production (presumed) and still match against the stale Max IDs.

**Risk if Max gets restructured (PRICE-04):** if those two RPCs (`check_user_feature_access`, plus whatever lives in `rpc_auth_guards.sql` lines 2267-2275 / 2368-2375) are still callable, they will silently return wrong limits for any user on the new Max tier. Planner MUST audit these in the migration task list.

[ASSUMED] The stale IDs in the old migrations are *unused* / DEAD CODE — i.e. their CASE branch never matches a live customer because no live customer has those IDs. Only verifiable by running the migration files against prod and grepping logs. Confidence: MEDIUM (migration filenames suggest each was superseded by a later migration, but supersession in Postgres usually means CREATE OR REPLACE on the same function, not deletion of the older file's logic from a different function).

### Pricing.ts state-of-the-art (single source of truth)

| Field | Trial | Starter | Growth | Max |
|-------|-------|---------|--------|-----|
| `id` | `FREETRIAL` | `STARTER` | `GROWTH` | `TENANTFLOW_MAX` |
| `planId` | `trial` | `starter` | `growth` | `max` |
| `name` | "Free Trial" | "Starter" | "Growth" | "Max" |
| Description | "Try every feature for 14 days before subscribing" | "Ideal for landlords with 1–5 rentals" | "For growing portfolios that need advanced features" | "For landlords with 21+ rentals — unlimited scale and API access" |
| price.monthly | 0 | 29 | 79 | 199 |
| price.annual | 0 | 290 | 790 | 2189 |
| stripePriceIds.monthly | `price_1RgguD…` | `price_1RtWFc…` | `price_1SPGCN…` | `price_1Rd16p…` |
| stripePriceIds.annual | null | `price_1RtWFd…` | `price_1SPGCR…` | `price_1Rd17A…` |
| limits.properties | 1 | 5 | 20 | -1 (unlimited) |
| limits.units | 5 | 25 | 100 | -1 |
| limits.users | 1 | 1 | 3 | -1 |
| limits.storage (GB) | 1 | 10 | 50 | -1 |
| limits.apiCalls | 1000 | 10000 | 50000 | -1 |
| trial | 14d / no card / cancel | false | false | false |
| Annual discount | n/a | 17% (2 months free, 12-2=10x monthly) | 17% (10x monthly) | **8.5%** ($199×12=$2388 → $2189 = $199 saved/yr) |

**Annual discount inconsistency** [VERIFIED: pricing.ts L102-104, L135-137, L168-171]: Starter and Growth use the standard "10× monthly = 2 months free" formula. Max uses a non-standard formula that yields only 8.5% discount instead of 17%. The `calculateAnnualSavings()` helper in `pricing.ts` L274-278 ASSUMES the 10× formula, so anywhere that helper is called with Max's $199 monthly returns $199×12-$199×10 = $398 of savings — which would over-state the actual $199 savings on the $2189 annual sub. Currently `calculateAnnualSavings()` is uncalled (BentoPricingSection L48 computes its own version using `growthPlan.price.monthly * 12 - growthPlan.annualTotal`, which is correct because it pulls from the actual annual field). But the dead helper is a foot-gun for the executor — the restructure should either delete it or fix the formula.

### Stripe metadata fields not present in code

The codebase exposes price IDs and dollar amounts. It does NOT model:
- `lookup_key` — verified UNSET on every paying tier [VERIFIED: comment in `20260505221558_enforce_plan_limits_recognize_price_ids.sql` L4-9: "none of our live Stripe prices have lookup_key configured"]
- `metadata` (Stripe Price metadata field)
- `tax_behavior`
- `currency` other than USD (assumed USD throughout but never verified in DB)
- `recurring.interval_count` (assumed 1 throughout — no support for quarterly today)
- `tiered_billing` / `usage_type` (assumed flat-fee `licensed`)

Planner: any restructure that introduces lookup_keys (recommended for future-proofing) requires updating `priceIdToTier()` to also try lookup_key matching and the entire migration suite to back-match by lookup_key.

## 3. Codebase Pricing-Touchpoint Matrix

Every file the executor will need to touch during PRICE-04 + PRICE-06. Grouped by category.

### A. Pricing config (single source of truth) — 2 files

| File | Lines | What changes |
|------|-------|--------------|
| `src/config/pricing.ts` | 59-197 (PRICING_PLANS), 274-278 (calculateAnnualSavings), 23 (MAX_PUBLIC_PRICE_DISPLAY) | Replace tier names + prices + price IDs + limits + features. Delete `MAX_PUBLIC_PRICE_DISPLAY` constant per its own `@phase-5-cleanup` JSDoc. Decide fate of `calculateAnnualSavings()` |
| `supabase/functions/_shared/plan-tier.ts` | 16-49 | Update STARTER_PRICE_IDS / GROWTH_PRICE_IDS / MAX_PRICE_IDS / TRIAL_PRICE_IDS sets + ALLOWED_CHECKOUT_PRICE_IDS export. If tier names change, update PlanTier union L51 + every switch case L66-84 |

### B. Type system — 2 files

| File | Lines | What changes |
|------|-------|--------------|
| `src/types/stripe.ts` | 15 | `PlanType` union: `'FREETRIAL' \| 'STARTER' \| 'GROWTH' \| 'TENANTFLOW_MAX'`. Rename if tier slugs change |
| `src/lib/constants/status-types.ts` | 209-212 | Constant exports `FREETRIAL` / `STARTER` / `GROWTH` / `TENANTFLOW_MAX`. Keep in lockstep with `PlanType` |

### C. Database / RPCs — 5 migrations + 1 schema dump

| File | What changes |
|------|--------------|
| `supabase/migrations/20260505221558_enforce_plan_limits_recognize_price_ids.sql` | New migration needed: re-create `get_user_plan_limits` recognizing the new price IDs (don't edit the existing migration — append a new one) |
| `supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql` | DEAD CODE risk: still references stale Max IDs `price_1SPGCj…` / `price_1SPGCo…`. Investigate via `mcp__supabase__list_migrations` whether this function still exists in prod |
| `supabase/migrations/20260219100000_implement_check_user_feature_access.sql` | Same — references the stale Max IDs in `check_user_feature_access` body |
| `supabase/migrations/20260304120000_rpc_auth_guards.sql` | Same — multiple CASE branches reference stale Max IDs (lines 2267-2275, 2368-2375) |
| `supabase/schemas/public.sql` | Schema dump — comments at L74-75 + L850-851 reference stale Max IDs. May regenerate; do not hand-edit |

**Required new migration** (PRICE-04): one new migration that re-creates `get_user_plan_limits` (and any sibling `check_user_feature_access`-style functions) with the new price IDs and tier names. Use `apply_migration` MCP, then run `list_migrations` to reconcile prod-assigned timestamp per the project's `migration-mcp-prod-drift.md` memory.

### D. Marketing pages — visible pricing surfaces — 7 files

| File | Lines | What changes |
|------|-------|--------------|
| `src/app/pricing/page.tsx` | 21-22 (title), 24 (description), 36-43 (productJsonLd) | Title "Plans from $29/mo" → updated. Description string drops "Custom pricing, contact sales" placeholder. JSON-LD `offers` array gets all 3 paid tiers (currently only Starter + Growth — Max omitted on purpose per CRIT-03; Phase 5 re-adds Max once it has a real price) |
| `src/app/pricing/_components/pricing-section.tsx` | thin wrapper | No change needed unless rendering changes |
| `src/app/pricing/pricing-content.tsx` | 12-31 (STATS), 33-59 (FAQS) | STATS array doesn't reference prices today (good). FAQ entries L36-58 mention "month-to-month", "prorate", "limits" — review for price-specific copy |
| `src/components/pricing/bento-pricing-section.tsx` | 25-49 (uses getAllPricingPlans), 47-49 (annualSavings calc) | Pulls everything from pricing.ts — no change beyond config swap. Verify the `'growth'` hardcoded check on L37 + L42 still correct after potential rename |
| `src/components/pricing/pricing-card-standard.tsx` | 167 | Hardcoded `<div>Custom</div>` — replace if Max gets a real price |
| `src/components/pricing/pricing-card-featured.tsx` | 192 | Hardcoded copy "Built for landlords with 1–15 rentals" — verify still right after persona phase locks in (Phase 4 dependency) |
| `src/components/pricing/pricing-comparison-table.tsx` | 33-87 (comparisonData), 197-207 (sticky header) | Comparison table is a parallel data structure that DOES NOT pull from pricing.ts — every property/unit/user/storage limit + every feature presence is HARD-CODED. Lines 198 + 202 hard-code `$29/mo` and `$79/mo`. L206 still uses MAX_PUBLIC_PRICE_DISPLAY. Drift risk: pricing.ts and this table can disagree silently |

### E. Marketing pages — secondary pricing references — 4 files

| File | Lines | What changes |
|------|-------|--------------|
| `src/app/compare/[competitor]/compare-data.ts` | 9-13 (TenantFlow tier list), 29 / 108 / 127 / 131 / 140 / 237 / 258 / 260 (price-claim copy across 5 competitors) | All 4 compare pages embed TenantFlow's $29/$79/$199 + competitor minimums. Restructure must update every claim |
| `src/components/sections/comparison-table.tsx` | 31 | `tenantFlow: '$79/mo'` literal — homepage "Why Landlords Choose" comparison row (this is the table CONS-14 may delete; if it survives, it needs the new price) |
| `src/components/sections/home-faq.tsx` | 21 | FAQ answer hard-codes `$29/month` and `1–5 rentals` |
| `src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts` | 181 | `'TenantFlow subscription: $29-$199/month'` literal in tax-deduction example copy |
| `src/lib/generate-metadata.ts` | 54, 80 | Default OG description: `'Plans from $29/mo'` literal repeated twice |

### F. Owner-side billing UI — 2 files

| File | Lines | What changes |
|------|-------|--------------|
| `src/app/(owner)/billing/plans/page.tsx` | 18-43 (uses getAllPricingPlans + TIER_BY_PLAN_ID) | Pulls from pricing.ts. The `TIER_BY_PLAN_ID` map L20-25 hard-codes the four planId slugs — if any slug renames, update this map |
| `src/components/settings/billing-settings.tsx` | 17 (uses getAllPricingPlans), 18-32 (findPlanByStripePriceId) | Pulls from pricing.ts — no change beyond config swap |

### G. Edge Functions — 4 files

| File | What changes |
|------|--------------|
| `supabase/functions/stripe-checkout/index.ts` | Imports `ALLOWED_CHECKOUT_PRICE_IDS` from `_shared/plan-tier.ts` — no direct change |
| `supabase/functions/stripe-webhooks/handlers/checkout-session-completed.ts` | Imports `priceIdToTier` — no direct change |
| `supabase/functions/stripe-webhooks/handlers/customer-subscription-updated.ts` | Imports `priceIdToTier` — no direct change |
| `supabase/functions/_shared/tier-gate.ts` | L23-31: hardcoded `GROWTH_AND_MAX_PLANS` set with all 4 paid Stripe IDs + lookup-key fallback strings. Update price IDs in lockstep with `plan-tier.ts` STARTER/GROWTH/MAX sets. Note: this file ALSO contains lookup-key fallbacks (`'growth'`, `'growth_monthly'`, `'growth_annual'`, etc.) — if tier slugs rename, those fallbacks go too |

### H. Tests with pinned dollar values, plan names, or price IDs — 5 files

| File | Pinned values | What breaks |
|------|---------------|-------------|
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | L74-86 BANNED_STALE_PLAN_REFS + comment "real plans are Trial / Starter / Growth / Max at $0 / $29 / $79 / $199" | If new tier names introduce a new banned-pattern collision, OR if the comment becomes false, the test asserts integrity — needs hand update |
| `src/app/pricing/__tests__/page.test.ts` | L83-86 asserts metadata.description NOT contains "$199/mo" + DOES contain "Max — Custom pricing, contact sales". L92-103 asserts JSON-LD has exactly 2 offers (no Max). L115-129 asserts FAQPage has exactly 5 entries | Phase 5 SHOULD remove these guard assertions because Phase 1 placeholder is replaced. Phase 1 plan even calls these out as `@phase-5-cleanup`. But the FAQ count of 5 may still be useful |
| `src/app/(owner)/settings/__tests__/settings-page.test.tsx` | L86-91, L473-474: pinned `$79`, `'price_1SPGCNP3WCR53SdorjDpiSy5'` (Growth monthly) | Hand update test fixtures |
| `src/components/settings/__tests__/billing-settings.test.tsx` | L90, L106, L145, L173, L196: same Growth ID + `$79` literal + `'price_1LegacyBeta00'` test ID | Hand update test fixtures |
| `src/lib/utils/__tests__/currency.test.ts` | L59-79: tests `formatPrice(29)` returns `'$29'`. Generic — no change |

### I. Status / banner display — 1 file

| File | Lines | What changes |
|------|-------|--------------|
| `src/components/billing/__tests__/subscription-status-banner.test.tsx` | L63-200: test fixtures use `'price_123'` placeholder | No change (placeholder, not real ID) |

### Total touchpoint count

- Pricing config: **2 files**
- Type system: **2 files**
- Database / RPCs: **1 new migration + verify 3 existing**
- Marketing pages (visible): **7 files**
- Marketing pages (secondary): **5 files**
- Owner billing UI: **2 files**
- Edge Functions: **1 file** (`tier-gate.ts`)
- Tests: **5 files**

**Plus:** Stripe-side work via MCP — create new products + prices, archive old ones, optionally seed `lookup_key`. The Stripe-side surface count depends on whether the user keeps 3 paid tiers or restructures to N.

## 4. Migration Risk Assessment

User-stated zero subscribers eliminates customer-grandfathering risk. Remaining risks:

### R1 — Stale Max price IDs in 3 old migrations (HIGH risk)

[VERIFIED: §2 grep results] `20260218120000`, `20260219100000`, `20260304120000` all reference `price_1SPGCjP3WCR53SdoIpidDn0T` / `price_1SPGCoP3WCR53SdoID50geIC` as Max IDs. The current pricing.ts uses different IDs. If the prod functions defined by those migrations are STILL CALLED by any code path, they return wrong tier limits for users on the live Max IDs.

**Mitigation:** Phase 5 plan must include a task: "Audit prod via `mcp__supabase__list_migrations` + `apply_migration` to confirm `check_user_feature_access` and `rpc_auth_guards` functions either (a) no longer exist, OR (b) get re-created with the new live IDs as part of the restructure migration."

### R2 — `MAX_PUBLIC_PRICE_DISPLAY` constant deletion checklist (MEDIUM risk)

[VERIFIED: pricing.ts L11-22 JSDoc] The constant has its own four-step cleanup checklist embedded in source. Phase 5 plan must execute every step:
1. Delete `MAX_PUBLIC_PRICE_DISPLAY` constant in `pricing.ts`
2. Delete import + render in `pricing-comparison-table.tsx` ~line 206
3. Delete hardcoded "Max — Custom pricing, contact sales" string in `pricing/page.tsx` metadata.description (L24)
4. Delete hardcoded "Max enterprise tier — Custom pricing, contact sales" string in `pricing/page.tsx` productJsonLd description (L36)

Phase 1 already wrote a Vitest pin (`page.test.ts` L83-87) on these strings. Phase 5 deletes both the strings AND the pin.

### R3 — Test pin drift (MEDIUM risk)

Phase 1 test (`page.test.ts` L91-103) hard-asserts the JSON-LD has exactly 2 offers (Starter + Growth, no Max). Phase 5 needs to either (a) update assertion to expect all 3 paid tiers, OR (b) delete the assertion. If it's deleted, ensure no surviving test enforces "Max not in JSON-LD."

### R4 — Stripe Test-Mode vs Live-Mode price IDs (LOW-MEDIUM risk)

The `price_1` prefix doesn't disambiguate test vs live mode. The codebase ID format `price_1RtWFcP3WCR53SdoCxiVldhb` is consistent with both modes. UNTIL the planner runs `mcp__stripe__get_stripe_account_info` to confirm whether `STRIPE_SECRET_KEY` resolves to live mode in prod, and `mcp__stripe__list_prices` to confirm each ID is `active=true` in that mode, we cannot rule out that the embedded IDs are test-mode artifacts left behind. PR-deploy preview environments using a different `STRIPE_SECRET_KEY` would surface this — but no such gate is documented in the codebase.

### R5 — Lookup-key absence locks the migration to ID-pinning (MEDIUM risk)

[VERIFIED: `20260505221558_enforce_plan_limits_recognize_price_ids.sql` L4-9] Comment confirms "none of our live Stripe prices have lookup_key configured." Every restructure that updates price IDs is an O(N) migration across the touchpoint matrix in §3. PRICE-04 SHOULD set `lookup_key` on the new prices ('starter_monthly', 'starter_annual', 'growth_monthly', etc.) so future restructures only need to repoint the Stripe prices, not the entire codebase. The plan should sequence this as: create new prices with lookup_key → update `priceIdToTier()` to try lookup_key first → archive old prices.

### R6 — Cents/dollars conversion error at Stripe boundary (LOW risk)

[VERIFIED: CLAUDE.md "All `amount` columns store dollars as `numeric(10,2)`. Convert to cents only at the Stripe API boundary."] Stripe `unit_amount` is integer cents. New price creation MUST multiply by 100. The codebase doesn't show explicit dollars→cents conversion at any Stripe-product create site (none exist — products were hand-created in dashboard); the executor must add this conversion when calling `mcp__stripe__create_price`.

### R7 — `stripe.subscriptions` PostgREST mirror is read-by-frontend (LOW risk)

[VERIFIED: `src/hooks/api/query-keys/subscription-keys.ts` L66] Frontend reads `stripe.subscriptions` directly via PostgREST under RLS. If the Supabase Stripe Sync Engine doesn't pick up the new prices/products fast enough, frontend may show stale plan info briefly. Solve by deploying frontend pricing-config update AFTER Stripe products + prices land AND Sync Engine has reconciled.

### R8 — `tier-gate.ts` lookup-key fallbacks already exist (NEUTRAL → leverage)

[VERIFIED: `tier-gate.ts` L29-30] `GROWTH_AND_MAX_PLANS` already includes `'growth'`, `'growth_monthly'`, `'growth_annual'`, `'max'`, `'max_monthly'`, `'max_annual'` as fallback matchers. If PRICE-04 creates new Stripe prices with these exact lookup_keys, the gate logic Just Works without code change.

### R9 — Webhook `subscription_plan` write logic (LOW risk)

[VERIFIED: `checkout-session-completed.ts` L38, L49 + `customer-subscription-updated.ts` L35, L47] Both webhooks write `subscription_plan: tier ?? planLookup ?? priceId` — i.e. fall back to raw price ID if `priceIdToTier()` returns null. New price IDs in `priceIdToTier()` are the safe fix; the `?? priceId` fallback also means an unrecognized new price still won't crash the webhook, just write the raw ID until backfilled.

## 5. Open Questions for the User (Strategic Decisions)

The planner cannot make these decisions; they need explicit user input via `/gsd-discuss-phase` or CONTEXT.md before plan creation.

### Q1 — Real Max price vs keep "Custom / Contact Sales" placeholder

Phase 1 (CRIT-03) shipped Max with `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` across all 4 surfaces, omitting Max from JSON-LD offers. Phase 5 has two paths:
- **(A) Set a real Max number.** Replaces the placeholder, re-adds Max to JSON-LD offers, deletes the constant + 4 hardcoded strings + the test pins.
- **(B) Keep "Custom" forever.** Means landlords with 21+ rentals always book a sales call. Sales-led motion. Easier conversion-funnel tracking.

The current pricing.ts shows `monthly: 199, annual: 2189` — i.e. the user already had a number in mind. But the audit's CRIT-03 framing suggests user wants to revisit. Recommendation: lean toward (A) with a real number unless user wants enterprise-style sales-led for Max specifically.

### Q2 — Annual discount percentage

Current state [VERIFIED]:
- Starter: $29/mo × 10 = $290/yr (17% discount, 2 months free)
- Growth: $79/mo × 10 = $790/yr (17% discount, 2 months free)
- Max: $199/mo × 11 (rounded down 12) = $2189/yr (8.5% discount)

The Max discount breaks the pattern. Recommendation: standardize to 17% across all tiers (Max annual would be $1990 if applying the 10× formula) or pick a single new percentage. Ask user to choose one of: 17% (current standard), 20% (more aggressive — common SaaS), 10% (modest), or per-tier different (current state).

### Q3 — Tier names — keep "Starter / Growth / Max"?

Current [VERIFIED]: external display "Starter / Growth / Max", internal IDs `STARTER / GROWTH / TENANTFLOW_MAX`. The `TENANTFLOW_MAX` constant name is awkward (one of two tiers brand-prefixed; the others aren't). If renames are on the table:
- "Solo / Pro / Enterprise" — common SaaS triad
- "Starter / Pro / Scale" — 2026-vintage SaaS
- Keep "Starter / Growth / Max" + clean up the `TENANTFLOW_MAX` internal slug to plain `MAX`

### Q4 — Feature limit changes

Current [VERIFIED: pricing.ts]:
- Starter: 5 props / 25 units / 1 user / 10GB / 10k API calls
- Growth: 20 props / 100 units / 3 users / 50GB / 50k API calls
- Max: unlimited everything

Audit framing "landlords with 1–15 rentals" suggests Starter cap of 5 may be too restrictive. Should Starter expand to 10 or 15 properties? Or is the upgrade pressure to Growth at 5 properties intentional?

### Q5 — Trial length

Current: 14 days, no card required, cancel-on-end. SaaS norms range 7-30 days. Planner can default-keep 14d unless user changes.

### Q6 — Quarterly billing?

Current: monthly + annual only. Recommendation: skip quarterly. It adds complexity to `priceIdToTier()`, doubles the price-ID inventory, and resolves nothing landlords are asking for. Confirm user agrees.

### Q7 — Lookup-key strategy

Current: no lookup_key on any price. PRICE-04 should add lookup_keys. Format options:
- `<tier>_<period>` → `starter_monthly`, `starter_annual`, `growth_monthly`, etc. (matches `tier-gate.ts` existing fallbacks)
- `<tier>` only (one lookup_key per tier, period encoded in price metadata) — simpler but conflicts with current code
- Versioned → `starter_monthly_v2` (allows future renames without ID churn)

Recommendation: `<tier>_<period>` to match the fallback set in `tier-gate.ts` L29-30. Free win.

### Q8 — Coupons / discounts

Phase 1 didn't audit Stripe coupons (blocked-pending-MCP). If any active coupons exist, they're tied to specific Stripe price IDs. Replacing prices archives the coupons. User must explicitly say whether to recreate the coupons against the new IDs or let them die.

## 6. Customer / Subscription State (BLOCKED-pending-MCP)

| Metric | Value |
|--------|-------|
| Active subscriptions by tier | UNKNOWN |
| Trialing subscriptions by tier | UNKNOWN |
| Past_due / canceled count | UNKNOWN |
| Average customer lifetime (months) | UNKNOWN |
| Trial-to-paid conversion rate | UNKNOWN |

Required Stripe queries the planner must run:
```
mcp__stripe__list_subscriptions limit=100  # paginate if > 100
mcp__stripe__list_invoices status=paid created_gte=<unix-30d-ago>
```
Then aggregate by `items.data[0].price.id` against the §2 ID matrix.

## 7. Active Coupons (BLOCKED-pending-MCP)

```
mcp__stripe__list_coupons limit=100
```
For each: name, percent_off / amount_off, duration, applies_to (specific products or all), redemption count, expiration. Phase 5 plan must handle each coupon: recreate against new price IDs, archive, or migrate via `applies_to` updates.

## Project Constraints (from CLAUDE.md)

These directives constrain Phase 5 implementation regardless of any other decision in this research:

- **Cents conversion only at Stripe boundary** — All `amount` columns are dollars `numeric(10,2)`. Stripe `unit_amount` is cents. Convert with `* 100` only when calling Stripe API.
- **No `as unknown as` type assertions** — Use typed mapper functions at PostgREST/RPC boundaries. New `subscription_plan` reads should map through `mapSubscriptionRow` or similar.
- **No string-literal query keys** — Use `queryOptions()` factories under `src/hooks/api/query-keys/`. The existing `subscriptionKeys` factory in `src/hooks/api/query-keys/subscription-keys.ts` is the destination for any new query.
- **No `any` types** — Use `unknown` + type guards for any new Stripe webhook handler payload parsing.
- **Lefthook pre-commit blocks**: lint, typecheck, unit tests at 80% coverage, gitleaks. Plan must keep tests green at every commit.
- **Branch protection on main** — Per-phase branch (`gsd/phase-5-pricing-restructure`) → PR → 2 consecutive zero-finding review cycles → merge.
- **Migration-MCP drift** — After every `apply_migration` MCP call, run `list_migrations` to reconcile the prod-assigned timestamp into the repo migration filename.
- **Synthetic test owner accounts** — `e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app` must remain `subscription_status='active'` (NOT `trialing`) — `expire_trials()` flips trialing → expired. If new tier IDs land, e2e fixtures may need re-pinning.
- **Edge Function deploy is manual** — No CI Edge Function deploy. Updating `tier-gate.ts` or `plan-tier.ts` requires `supabase functions deploy <name>` post-merge.

## Standard Stack (No Library Changes Needed)

Pricing restructure is a pure data + config change. No new libraries.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Stripe SDK (`stripe` npm) | already installed | Server-side Stripe ops | Existing dep |
| `@stripe/stripe-js` | already installed | Client-side checkout redirect | Existing dep |
| `@number-flow/react` | already installed | Animated price counter | Existing dep |
| Supabase Stripe Sync Engine | configured per `20260218120000` migration commentary | Mirrors Stripe → `stripe.*` schema for PostgREST reads | Existing infra |

## Architecture Patterns (Existing — Reuse)

### Pattern 1: Price-ID-set helper module
**What:** Single TypeScript module exports `Set<string>` per tier + `priceIdToTier()` resolver
**Where:** `supabase/functions/_shared/plan-tier.ts`
**Why standard for this codebase:** Cycle-1 review of the original plan-limits enforcement caught that webhooks wrote raw price IDs (no lookup_key). The Set-based resolver became the canonical normalization point. PRICE-04 should NOT bypass this.

### Pattern 2: Price-ID-set duplication in DB CASE statement
**What:** `get_user_plan_limits` Postgres function uses CASE WHEN on lowercased price IDs
**Where:** `supabase/migrations/20260505221558_enforce_plan_limits_recognize_price_ids.sql`
**Why:** Defense-in-depth — even if app code drifts, DB-level limits still match. Plan must keep this in lockstep with `plan-tier.ts`.

### Pattern 3: Marketing-page hardcoded copy with manual sync risk
**What:** `pricing-comparison-table.tsx` + `home-faq.tsx` + `compare-data.ts` + `tax-deduction-data.ts` hard-code prices
**Where:** see §3 Group D + E
**Why this is bad:** drift risk. PRICE-06 plan should evaluate (a) using `getAllPricingPlans()` everywhere instead, OR (b) accept hardcode + add a regression test that asserts every hardcoded price matches the config.

### Anti-Patterns to Avoid
- **Bypassing `priceIdToTier()`** — webhooks must keep using it. Don't write raw price IDs to `users.subscription_plan` directly.
- **Editing past migration files** — append a new migration. Past migrations are immutable history.
- **Setting Stripe prices via dashboard, not MCP** — loses traceability. Use `mcp__stripe__create_price` from the plan-execution session so the price IDs land in the planner's commit message, not lost to dashboard history.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Tier-name → price-ID lookup | Custom hashmap inline in components | `priceIdToTier()` from `_shared/plan-tier.ts` |
| Annual savings math | Inline calculation in each card | Per-card `monthly * 12 - annualTotal` (existing pattern in `bento-pricing-section.tsx` L48). DELETE `calculateAnnualSavings()` helper — broken on Max. |
| Tier entitlement check | Per-feature inline check | `checkTierEntitlement()` from `_shared/tier-gate.ts` |
| Plan limit enforcement | Frontend gate-only | DB `get_user_plan_limits` RPC (defense-in-depth — frontend lies, DB enforces) |
| Stripe webhook signature verification | Custom HMAC | Stripe SDK's `constructEvent()` |

## Common Pitfalls

### Pitfall 1: Migrating prices without updating `priceIdToTier()` first
**What goes wrong:** Webhook receives a `customer.subscription.updated` for the new price ID before code redeploy → `priceIdToTier()` returns null → `subscription_plan` is set to raw price ID → `get_user_plan_limits` (with old CASE branches) doesn't match → user dropped to trial cap.
**Mitigation:** Sequence the deploy: (1) ship new code with both old + new price IDs in `priceIdToTier()` set, (2) create new Stripe prices, (3) DB migration recognizes both, (4) archive old Stripe prices, (5) cleanup migration removes old IDs from code.

### Pitfall 2: Stripe price_id case sensitivity
[VERIFIED: `20260505221558` migration L48: `v_plan := LOWER(COALESCE(v_plan, ''));`] DB matcher lowercases input. App-level `priceIdToTier()` does NOT lowercase price IDs (only tier slugs). Stripe IDs are case-mixed (`price_1RtWFc...`). This works today because the IDs in the Set match exactly. New IDs MUST use the exact case Stripe returns — copy from `mcp__stripe__create_price` response, never hand-type.

### Pitfall 3: PostgREST stripe.* schema lag after price changes
[VERIFIED: `20260218120000` migration L50-72] `get_user_plan_limits` reads `stripe.subscriptions` + `stripe.subscription_items` for the live source. Supabase Stripe Sync Engine has reconciliation lag (typically <60s). If marketing-page redeploy lands faster than Sync Engine reconcile, a user clicking "Subscribe" sees the new price but the gate still reads the old ID for ~1min. Mitigation: ship marketing changes LAST in deploy order.

### Pitfall 4: Forgetting to archive old Stripe prices/products
Stripe doesn't auto-archive when you create new prices. Old `price_1` IDs remain `active=true` and could be linked-to by stale URLs / cached pages. Archive explicitly via `mcp__stripe__update_price active=false`.

### Pitfall 5: DocuSeal limit references in features array
Each tier's `features` array (pricing.ts L80-194) embeds DocuSeal limits — Trial: omitted, Starter: omits e-sign, Growth: "25 lease e-signs per month (DocuSeal)", Max: "Unlimited lease e-signs (DocuSeal)". If tier limits change (e.g., Growth bumps to 50 e-signs), update the features array AND the comparison-table data.

### Pitfall 6: `MAX_PUBLIC_PRICE_DISPLAY` deletion misses one of four sites
The constant's JSDoc lists 4 sites — all 4 must change in one commit. Use the grep one-liner from the JSDoc:
```bash
grep -rn 'MAX_PUBLIC_PRICE_DISPLAY\|Custom pricing, contact sales' src/
```

## Code Examples (Existing Patterns)

### Adding a new price ID to the codebase
```typescript
// supabase/functions/_shared/plan-tier.ts
const STARTER_PRICE_IDS: ReadonlySet<string> = new Set([
  'price_1RtWFcP3WCR53SdoCxiVldhb', // Starter monthly $29  (LEGACY — keep until archived)
  'price_1RtWFdP3WCR53SdoArRRXYrL', // Starter annual  $290 (LEGACY)
  'price_NEW_starter_monthly',       // Starter monthly $XX (new tier price)
  'price_NEW_starter_annual',        // Starter annual  $YYY (new tier price)
])
```

### Adding a price-id CASE branch to `get_user_plan_limits`
```sql
-- New migration: 2026MMDDHHmmss_pricing_restructure_phase5.sql
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
RETURNS TABLE(properties_limit integer, units_limit integer, is_admin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_admin boolean;
  v_props_limit integer;
  v_units_limit integer;
BEGIN
  SELECT u.subscription_plan, u.is_admin INTO v_plan, v_admin
  FROM public.users u WHERE u.id = p_user_id;
  v_plan := LOWER(COALESCE(v_plan, ''));

  CASE
    WHEN v_plan IN ('starter', 'price_1rtwfcp...', 'price_1rtwfdp...',
                    'price_new_starter_monthly', 'price_new_starter_annual') THEN
      v_props_limit := <NEW_STARTER_LIMIT>; v_units_limit := <NEW_UNITS>;
    -- ... etc
  END CASE;

  RETURN QUERY SELECT v_props_limit, v_units_limit, COALESCE(v_admin, false);
END;
$$;
```

### Creating a Stripe price via MCP (template)
```
mcp__stripe__create_product
  name: "TenantFlow Starter"
  description: "Ideal for landlords with 1–5 rentals"
  metadata: { tier: "starter" }

mcp__stripe__create_price
  product: <product_id_from_above>
  unit_amount: 2900  # cents — $29
  currency: usd
  recurring: { interval: month }
  lookup_key: starter_monthly
  metadata: { tier: "starter", period: "monthly" }
```

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|------------------|--------------|
| Frontend infers `subscription_status` from `stripe_customer_id` existence | Query `stripe.subscriptions` for real status | pre-v1 [VERIFIED: CLAUDE.md "Common Gotchas"] |
| Webhook writes `subscription_plan: planLookup ?? priceId` (raw IDs) | Webhook writes `subscription_plan: priceIdToTier(...) ?? planLookup ?? priceId` | 2026-05-05 (`20260505221558`) |
| `get_user_plan_limits` matches only on tier slugs | Also matches on Stripe price IDs (case-insensitive) | 2026-05-05 (`20260505221558`) |
| BILLING_PLANS constant in `lib/constants/billing.ts` (drifted to $19/$49/$99) | Single source: `PRICING_PLANS` in `src/config/pricing.ts` | v2.7 Phase 67 cycle-6 [VERIFIED: billing.ts L2-9] |

**Deprecated/dead:**
- `calculateAnnualSavings()` in `pricing.ts` L274-278: assumes 10× monthly = annual; broken for Max. No live caller — `BentoPricingSection` computes its own. Safe to delete in PRICE-06.
- `MAX_PUBLIC_PRICE_DISPLAY` in `pricing.ts` L23: Phase 1 placeholder. Delete per its own `@phase-5-cleanup` JSDoc.
- Stale Max IDs in `20260218120000` / `20260219100000` / `20260304120000` migrations: see §4 R1.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The user's "zero subscribers" statement is accurate | §1 inferred state | If wrong, customer-migration plan (PRICE-05) is non-trivial |
| A2 | Stale Max IDs in 3 old migrations are dead code (their CASE branches never match a live customer) | §2 + §4 R1 | If wrong, those RPCs return wrong limits for Max users — silent data correctness bug |
| A3 | The embedded `price_1` IDs are live-mode (not test-mode) prices | §4 R4 | If wrong, prod customers can't pay; checkout fails on missing IDs |
| A4 | `recurring.interval_count = 1` for every price (no quarterly today) | §2 metadata gaps | If wrong, monthly/annual labels misrepresent actual billing cadence |
| A5 | All prices are USD | §2 metadata gaps | If wrong, multi-currency pricing logic missing entirely |
| A6 | Supabase Stripe Sync Engine is configured and running in prod (it gates `get_user_plan_limits` behind `if exists pg_namespace 'stripe'`) | §4 R7 | If Sync Engine is broken/unconfigured, gate falls through to STARTER permissive default — no prod gate enforcement |
| A7 | `calculateAnnualSavings()` has zero callers (grep showed no inline-call sites; helper unused) | §3 A | If a test or page calls it, deleting breaks the call site |
| A8 | `lookup_key` is unset on every live price (per migration commentary) | §2 + §4 R5 | If some have it set, the new lookup_key plan needs collision-detect |

## Open Questions

1. **Is the Stripe account live or test mode?**
   - Need: `mcp__stripe__get_stripe_account_info`
   - Recommendation: planner runs this first thing; if test mode, all "zero subscribers" framing is irrelevant and PRICE-04 should land in test mode first then promote.

2. **Are the embedded price IDs all `active=true` in Stripe today?**
   - Need: `mcp__stripe__list_prices` cross-referenced with §2 matrix
   - Recommendation: planner audits before deciding to archive vs replace.

3. **Do any of the 3 old migrations' RPCs (`check_user_feature_access` and the 2 in `rpc_auth_guards.sql`) still exist as live functions in prod?**
   - Need: `mcp__supabase__execute_sql` with `SELECT proname FROM pg_proc WHERE proname IN ('check_user_feature_access', ...)`
   - Recommendation: planner checks; if yes, the restructure migration must update them too.

4. **Persona language for Phase 5 dependency:** Phase 4 (Persona phase) has not shipped per ROADMAP.md. Phase 5 ROADMAP entry says "Depends on Phase 4 (pricing copy leans on settled persona terminology)". Pricing card copy ("Ideal for landlords with 1–5 rentals", "For landlords with 21+ rentals") will need Phase 4's locked persona word.
   - Recommendation: planner blocks PRICE-06 on Phase 4 completion OR scopes Phase 5 to data-only, deferring copy to Phase 4 follow-up.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stripe MCP (`mcp__stripe__*`) | §1 §2 (verify) §6 §7, PRICE-04 | ✗ in this session | — | Use `stripe` CLI with `STRIPE_SECRET_KEY` from `.env.local`; or planner has access where this researcher does not |
| Supabase MCP (`mcp__supabase__*`) | §4 R1 audit, PRICE-04 migration | ✗ in this session | — | Same as Stripe; or `psql` against prod with prod connection string |
| Stripe SDK (`stripe` npm) | Edge Function existing code | ✓ | per `package.json` | — |
| `@stripe/stripe-js` | Frontend checkout existing code | ✓ | per `package.json` | — |
| Stripe test-mode keys | PRICE-04 testing before live flip | UNKNOWN | — | Required per ROADMAP success criterion §2 |

**Missing dependencies with no fallback (BLOCKERS):**
- Stripe MCP / `stripe` CLI access — must be available to the executor for PRICE-04 to ship.

**Missing dependencies with fallback:**
- Supabase MCP — `psql` works fine for the migration audit and apply.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom (unit), Playwright (e2e), Deno tests (Edge Functions) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit && pnpm test:integration && pnpm test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-01 | Revenue audit documented | manual-only | n/a | n/a (research artifact) |
| PRICE-03 | `PRICING-DECISION.md` exists | doc-existence | `test -f .planning/phases/05-pricing-restructure/PRICING-DECISION.md` | ❌ Wave 0 |
| PRICE-04 | Stripe price IDs in `priceIdToTier()` resolve correctly | unit | `pnpm test:unit -- --run supabase/functions/tests/plan-tier.test.ts` | ❌ Wave 0 |
| PRICE-04 | `get_user_plan_limits` returns correct caps for new IDs | integration | `pnpm test:integration -- tests/integration/rls/plan-limits.test.ts` | ❓ may exist; verify |
| PRICE-04 | `ALLOWED_CHECKOUT_PRICE_IDS` rejects unknown IDs | unit | `pnpm test:unit -- --run supabase/functions/tests/stripe-checkout.test.ts` | ❓ verify |
| PRICE-06 | `pricing-comparison-table.tsx` no longer imports `MAX_PUBLIC_PRICE_DISPLAY` | unit | `pnpm test:unit -- --run src/components/pricing/__tests__/pricing-comparison-table.test.tsx` | ❌ Wave 0 |
| PRICE-06 | `pricing/page.tsx` JSON-LD has all 3 paid tiers (no Max omitted) | unit | `pnpm test:unit -- --run src/app/pricing/__tests__/page.test.ts` | ✓ — modify existing |
| PRICE-06 | No regressions in marketing-copy banned-phrase guard | unit | `pnpm test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` | ✓ |
| PRICE-06 | Annual-savings math accurate | unit | new test pinning calculation per tier | ❌ Wave 0 |
| PRICE-04 | E2E checkout flow works with new prices | e2e | `pnpm test:e2e tests/e2e/checkout.spec.ts` | ❓ verify |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run <changed file path>` (lefthook auto-runs full unit suite)
- **Per wave merge:** `pnpm validate:quick` (types + lint + unit tests)
- **Phase gate:** Full suite green + manual Stripe-test-mode checkout proven before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/tests/plan-tier.test.ts` — Deno test pinning each new price ID resolves to expected tier slug
- [ ] `src/components/pricing/__tests__/pricing-comparison-table.test.tsx` — assert no `MAX_PUBLIC_PRICE_DISPLAY` import + dollar-amount cells match config
- [ ] `src/app/pricing/__tests__/page.test.ts` — modify existing tests to assert all 3 paid tiers in JSON-LD, NOT 2; assert no "Custom pricing, contact sales" string
- [ ] Annual-savings unit test (new) — per tier, assert displayed savings = monthly×12 − annualTotal
- [ ] `tests/integration/rls/plan-limits.test.ts` — exists?  If not, add — pin that each new Stripe price ID maps to correct properties_limit / units_limit

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | Supabase SSR `getAll`/`setAll` cookie pattern; webhook uses Stripe signature verification |
| V3 Session Management | yes (existing) | Subscription status gates via `proxy.ts`; `subscription_status IN ('active', 'trialing')` check |
| V4 Access Control | yes | `is_admin()` for admin RPCs; `tier-gate.ts` for paid-feature gates; `ALLOWED_CHECKOUT_PRICE_IDS` allowlist for checkout |
| V5 Input Validation | yes | `priceIdToTier()` returns null for unknown IDs (safe default); `ALLOWED_CHECKOUT_PRICE_IDS.has(priceId)` check at checkout |
| V6 Cryptography | yes (existing) | Stripe webhook HMAC via SDK; never hand-rolled |

### Known Threat Patterns for Stripe + Subscription Restructure

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Attacker crafts $0 price in another Stripe account → uses with leaked test key | Tampering | `ALLOWED_CHECKOUT_PRICE_IDS` allowlist (already in place) |
| User pivots `price_id` to coupon-modified or archived tier via promotion code | Elevation of Privilege | `allow_promotion_codes: true` only on safe code paths; allowlist again |
| Webhook replay → double-process subscription change | Tampering | `stripe_webhook_events` dedup table (existing) |
| Frontend reads stale `stripe.subscriptions` after price restructure → wrong gate | Tampering (data integrity) | Sequence: code-redeploy → price-create → archive (this research §4 R7) |
| Stale Max IDs in old RPCs return wrong limits | Tampering | Audit + replace per §4 R1 |
| User redirects from `/billing/plans?source=esign_gate` to a forged Stripe Checkout | Phishing/UX | `upgrade_source` regex `^[a-z_]+$` <= 64 chars (existing in `tier-gate.ts`) |

## Sources

### Primary (HIGH confidence)
- `src/config/pricing.ts` — full read; pinned every field
- `supabase/functions/_shared/plan-tier.ts` — pinned every Set member
- `supabase/functions/_shared/tier-gate.ts` — pinned `GROWTH_AND_MAX_PLANS` + lookup-key fallbacks
- `supabase/migrations/20260505221558_enforce_plan_limits_recognize_price_ids.sql` — current state of `get_user_plan_limits`
- `supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql` — historical state (stale Max IDs)
- `supabase/migrations/20260219100000_implement_check_user_feature_access.sql` — historical state (stale Max IDs)
- `supabase/migrations/20260304120000_rpc_auth_guards.sql` — historical state (stale Max IDs)
- `src/components/pricing/pricing-comparison-table.tsx` — read; pinned hardcoded prices
- `src/components/pricing/pricing-card-standard.tsx` — read; pinned `<div>Custom</div>` literal
- `src/components/pricing/pricing-card-featured.tsx` — read; pinned segment-framing copy
- `src/components/pricing/bento-pricing-section.tsx` — read; pinned annual-savings calc
- `src/app/pricing/page.tsx` — read; pinned title + description + JSON-LD
- `src/app/pricing/__tests__/page.test.ts` — read; pinned 4 assertion expectations
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — pinned banned-pattern lists L23-86
- `src/app/(owner)/billing/plans/page.tsx` — read; pinned `getAllPricingPlans()` consumer pattern
- `src/components/settings/billing-settings.tsx` — read; pinned consumer pattern
- `supabase/functions/stripe-checkout/index.ts` — pinned `ALLOWED_CHECKOUT_PRICE_IDS` use site
- `supabase/functions/stripe-webhooks/handlers/checkout-session-completed.ts` — pinned `priceIdToTier` use site
- `supabase/functions/stripe-webhooks/handlers/customer-subscription-updated.ts` — pinned `priceIdToTier` use site
- `.planning/PROJECT.md` — pinned user decisions on pricing
- `.planning/REQUIREMENTS.md` — pinned PRICE-01..06 spec
- `.planning/ROADMAP.md` — pinned Phase 5 success criteria + dependency on Phase 4
- `CLAUDE.md` — pinned cents-conversion + no-`as unknown as` + query-key + lefthook constraints

### Secondary (MEDIUM confidence)
- Codebase inference: zero subscribers state from absence of subscriber-data UI
- Migration filename ordering as supersession heuristic for §4 R1

### Tertiary (LOW confidence — flagged for validation)
- §1 + §6 + §7 entirely (all marked UNKNOWN, blocked-pending-MCP)
- §4 R1 — stale Max IDs are dead code (assumption A2)

## Metadata

**Confidence breakdown:**
- Codebase touchpoint matrix (§3): HIGH — every file read end-to-end
- Migration risk (§4): HIGH for R1, R2, R3, R5; LOW for R4 (test/live mode unknown)
- Stripe inventory matrix (§2): HIGH for IDs in code, BLOCKED for "Stripe API confirms" column
- Revenue snapshot (§1, §6, §7): BLOCKED-pending-MCP
- Open questions for user (§5): HIGH — all surfaced from explicit code/spec contradictions

**Research date:** 2026-05-10
**Valid until:** 30 days for codebase forensics, 7 days for Stripe-state findings (once §1 unblocks). Re-run §1 + §6 + §7 if more than a week elapses between this research and PRICE-04 execution.
