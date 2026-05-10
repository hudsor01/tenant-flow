# Phase 5 Deferred Items

Items discovered during Plan 05-01 execution that are out-of-scope for the current plan but need follow-up.

## Edge Function + DB Migration Stripe Price ID Drift

**Discovered during:** Plan 05-01 Task 6 (Max price ID swap)

**Files holding stale Stripe price IDs (still referencing the OLD pre-Phase-5 prices that Task 3 archive queue will mark `active: false`):**

1. `supabase/functions/_shared/plan-tier.ts` — `STARTER_PRICE_IDS` / `GROWTH_PRICE_IDS` / `MAX_PRICE_IDS` constants reference the old IDs:
   - Old Starter monthly `price_1RtWFcP3WCR53SdoCxiVldhb`
   - Old Starter annual `price_1RtWFdP3WCR53SdoArRRXYrL`
   - Old Growth monthly `price_1SPGCNP3WCR53SdorjDpiSy5`
   - Old Growth annual `price_1SPGCRP3WCR53SdonqLUTJgK`
   - Old Max monthly `price_1Rd16pP3WCR53SdoCh3oJlDl`
   - Old Max annual `price_1Rd17AP3WCR53SdoTB4FTbSq`

2. `supabase/functions/_shared/tier-gate.ts` — `GROWTH_AND_MAX_PLANS` set references the old Growth + Max IDs.

3. `supabase/migrations/20260219100000_implement_check_user_feature_access.sql` — CASE statement on price IDs.

4. `supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql` — CASE statement on price IDs.

5. `supabase/migrations/20260304120000_rpc_auth_guards.sql` lines 2268–2271 + 2369–2372 — duplicate CASE statements.

6. `supabase/schemas/public.sql` lines 70–73 + 847–850 (generated dump — regenerates from live DB after migration ships, no manual edit).

**Impact if NOT fixed before Plan 05-01 ships:**
- Webhook handlers (`checkout-session-completed.ts`, `customer-subscription-updated.ts`) call `priceIdToTier()` from `plan-tier.ts`.
- New subscriptions will arrive with NEW price IDs (`price_1TVTa*`).
- `priceIdToTier()` returns `null` for unrecognized IDs → `subscription_plan` is set to `null` or the raw ID.
- DB plan-limit triggers fall through to trial caps, silently downgrading every paying customer to trial limits.
- `checkTierEntitlement()` (tier-gate) returns 402 for every Growth/Max user trying to access feature-gated endpoints.

**Mitigating factor (why this is queued, not blocking):**
- The old prices remain `active: true` in Stripe until the post-Plan-05-01 archive dispatch.
- However, ANY checkout session created via the new `pricing.ts` IDs (new ID `price_1TVTa*`) hits the new prices — and the webhook arriving at `customer-subscription-updated.ts` carries the NEW price ID, which `priceIdToTier()` doesn't recognize.
- This means: the bug surfaces the moment Plan 05-01 deploys, BEFORE the archive queue runs.

**Required follow-up plan:** A new plan (likely `05-03` or similar) must:

1. Update `supabase/functions/_shared/plan-tier.ts` to add the 6 new IDs to STARTER/GROWTH/MAX sets (KEEP the old IDs — existing subscribers on archived-but-active legacy prices keep working).
2. Update `supabase/functions/_shared/tier-gate.ts` `GROWTH_AND_MAX_PLANS` similarly (additive — keep both old + new).
3. Create a new SQL migration that ALTERs the `priceIdToTier()` SQL CASE statements (in `check_user_feature_access`, `enforce_plan_limits_*` triggers, RPC auth guards) to recognize the 6 new price IDs additively.
4. Deploy the Edge Functions (`tier-gate.ts` is a shared helper — every function importing it needs redeploy).
5. Apply the migration via `mcp__supabase__apply_migration`.
6. Reconcile via `mcp__supabase__list_migrations` per `migration-mcp-prod-drift.md`.
7. Add an integration test pinning the new IDs to their tier slugs (defense against future regression).

**Suggested ordering:** Land Plan 05-03 BEFORE running the Task 3 archive queue dispatch — this way the Edge Functions recognize new IDs even while old IDs still resolve via the same code paths. After Plan 05-03 ships, the archive queue is safe to run.

**Tracked here per executor SCOPE BOUNDARY rule:** issue is out-of-scope for Plan 05-01 (which only modifies `src/config/pricing.ts`), but is a hard prerequisite for the phase shipping correctly. Surface to phase-level orchestrator + verifier.
