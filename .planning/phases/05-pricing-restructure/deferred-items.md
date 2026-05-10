# Phase 5 Deferred Items

Items discovered during Plan 05-01 execution that needed follow-up.

## Edge Function + DB Migration Stripe Price ID Drift — RESOLVED 2026-05-10

**Status:** ✅ Resolved within this PR (commit `28fcec2ff`).

**Original concern:** `supabase/functions/_shared/{plan-tier,tier-gate}.ts` + 3 SQL migrations held legacy pre-Phase-5 Stripe price IDs. After Phase 5 deployed, new checkouts would carry the new IDs (`price_1TVTa*`), and `priceIdToTier()` would fall through to trial caps because it didn't recognize them.

**User direction (2026-05-10):** "there is no legacy because we have no users so you are wasting your time with backwards compat code". With zero active subscribers (Stripe MCP confirmed), no migration risk exists — the legacy IDs can simply be replaced, not extended.

**What shipped:**

1. `supabase/functions/_shared/plan-tier.ts` — `STARTER_PRICE_IDS`, `GROWTH_PRICE_IDS`, `MAX_PRICE_IDS` sets now contain ONLY the 6 new Phase 5 IDs. Legacy IDs removed.

2. `supabase/functions/_shared/tier-gate.ts` — `GROWTH_AND_MAX_PLANS` set now contains ONLY the 4 new Growth+Max IDs + lookup-key fallbacks. Legacy IDs removed.

3. New migration `20260510094421_phase_5_recognize_new_price_ids.sql` — `CREATE OR REPLACE` of `check_user_feature_access(text,text)` and `get_user_plan_limits(uuid)` with CASE branches recognizing only the 6 new Phase 5 IDs. ELSE clause falls through to `FREETRIAL` (the safe default for unknown values; old code fell through to STARTER which gated `api_access` incorrectly).

4. Hotfix migration `20260510094452_phase_5_drop_resurrected_text_overload.sql` — drops the `get_user_plan_limits(text)` overload that the first draft of #3 accidentally recreated. The committed version of #3 no longer recreates it; the drop is preserved for replay-from-zero correctness.

5. Stripe state cleanup (orchestrator-dispatched MCP):
   - 3 live products updated with Phase 4 locked descriptions + `active=true`.
   - 6 new prices created with `lookup_key` set (`starter_monthly|annual`, `growth_monthly|annual`, `max_monthly|annual`).
   - 12 stale prices archived (`active=false`).
   - 2 stale duplicate products archived (`prod_SY7K5lSS4JDkqz`, `prod_SY7JUwNYPb3V8j`).
   - Max product `default_price` repointed to new `$149` monthly (was old $199 monthly).

**Verification:** Stripe MCP `list_subscriptions --status=active` returns `[]`; `list_products` returns 4 active products (Starter / Growth / Max / Trial); `list_prices` returns 7 active prices (6 new + Trial $0).

No follow-up plan needed.
