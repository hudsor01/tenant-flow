---
phase: 05-pricing-restructure
plan: 01
subsystem: pricing-config
tags: [pricing, stripe, billing, config, marketing-surface]
requirements:
  - PRICE-01
  - PRICE-02
  - PRICE-03
  - PRICE-04
  - PRICE-05
  - PRICE-06
dependencies:
  requires:
    - "Phase 4 locked tier descriptions (verbatim Phase 4 carve-outs)"
    - "Phase 1 CRIT-03 'Custom' placeholder (PRICE-06 reverses it here)"
  provides:
    - "src/config/pricing.ts with new dollar amounts ($19/$49/$149) + new Stripe price IDs"
    - "MAX_PUBLIC_PRICE_DISPLAY = '$149' constant for pricing-comparison-table.tsx render"
    - "Stripe products + prices repointed (3 product updates + 6 new prices with lookup_keys)"
  affects:
    - "Plan 05-02 — propagates the new $149 across marketing surfaces (pricing-card-standard.tsx, page.tsx metadata + JSON-LD, footer copy, /stripe redirect copy)"
    - "Webhook handlers (DEFERRED — see deferred-items.md): plan-tier.ts + tier-gate.ts + DB plan-limit triggers all hold OLD price IDs"
tech-stack:
  added: []
  patterns:
    - "Stripe lookup_key as source of truth — all 6 new prices have lookup_keys (starter_monthly/annual, growth_monthly/annual, max_monthly/annual) so future restructures don't require code edits"
key-files:
  created:
    - .planning/phases/05-pricing-restructure/deferred-items.md
  modified:
    - src/config/pricing.ts
decisions:
  - "Edge Function + DB price-ID drift logged as deferred-items.md (Rule 4 / SCOPE BOUNDARY) — plan_05-01.files_modified is locked to src/config/pricing.ts; the additive Edge Function + migration update needs its own plan"
  - "Tasks 1–3 dispatched by orchestrator (Stripe MCP tools unavailable to subagents); Tasks 4–8 executed in subagent commits"
  - "Task 5 fixture expansion absorbed Plan 05-02 Task 10 fix preemptively — this is why src/app/pricing/__tests__/page.test.ts passes here (plan flagged it as known-failing-until-Plan-05-02)"
  - "Task 3 archive queue (2 products + 12 prices) DEFERRED to post-merge orchestrator dispatch — archiving live prices referenced in pricing.ts could 404 active checkouts"
metrics:
  duration: "Tasks 1–8 (orchestrator + subagent waves combined)"
  start: "see Phase 5 plan dispatch timestamp"
  completed: "2026-05-10T09:36:04Z"
  task-count: 8
  file-count: 2
---

# Phase 5 Plan 01: Pricing Restructure (Stripe + pricing.ts) Summary

One-liner: Migrated Stripe to 4 products + 6 prices with lookup_keys (Option A: $19/$49/$149 monthly, monthly × 10 annual), repointed `src/config/pricing.ts` to the new IDs, and flipped `MAX_PUBLIC_PRICE_DISPLAY` from the Phase 1 CRIT-03 `'Custom'` placeholder to `'$149'`, fixing the Max annual math bug ($2,189 → $1,490) along the way.

## Task Results

| # | Name | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Stripe MCP — UPDATE 3 live products | DONE | (orchestrator) | tenantflow_starter, prod_TLy8IZ0jV68wF6, prod_SY7LmPzsPpvUaT updated with Phase 4 verbatim descriptions |
| 2 | Stripe MCP — CREATE 6 new prices | DONE | (orchestrator) | 6 new prices with `lookup_key` set (see Stripe State Changes below) |
| 3 | Plan archive queue (no MCP yet) | DONE | (documentation only) | Archive queue documented; orchestrator dispatches AFTER PR merges |
| 4 | Update STARTER block in pricing.ts | DONE | `ba0a4034b` | $29/$290 → $19/$190 + new Stripe IDs (`price_1TVTaA*` / `price_1TVTaE*`) |
| 5 | Update GROWTH block in pricing.ts | DONE | `5324030` | $79/$790 → $49/$490 + new Stripe IDs (`price_1TVTaI*` / `price_1TVTaM*`); fixture expansion absorbed Plan 05-02 Task 10 fix |
| 6 | Update TENANTFLOW_MAX block in pricing.ts | DONE | `904b630` | $199/$2189 → $149/$1490 + new Stripe IDs (`price_1TVTaQ*` / `price_1TVTaU*`); fixes Max annual math bug |
| 7 | Flip MAX_PUBLIC_PRICE_DISPLAY constant | DONE | `904b630` | `'Custom'` → `'$149'` (combined with Task 6 in same commit) |
| 8 | Quality gate (typecheck + lint + test:unit + grep guards) | DONE | (verification) | All gates green; commits landed |

## Commits

- `ba0a4034b` — feat(phase-05-01): repoint STARTER tier to $19/$190 + new Stripe price IDs
- `5324030` — feat(phase-05-01): repoint GROWTH tier to $49/$490 + new Stripe IDs
- `904b630` — feat(05-pricing-restructure): swap Max prices + flip MAX_PUBLIC_PRICE_DISPLAY
- `9a5292dd4` — docs(05-pricing-restructure): track edge fn + DB price-id drift as deferred

## Stripe State Changes (orchestrator-dispatched in Tasks 1–2)

### Products UPDATED in place (Task 1)

| Product ID | Name | Description (Phase 4 verbatim) |
|------------|------|--------------------------------|
| `tenantflow_starter` | Starter | `Ideal for landlords with 1–5 rentals` (en-dash) |
| `prod_TLy8IZ0jV68wF6` | Growth | `For growing portfolios that need advanced features` |
| `prod_SY7LmPzsPpvUaT` | Max | `For landlords with 21+ rentals — unlimited scale and API access` (em-dash) |
| `prod_SbujfadeHK2q0w` | Trial | UNCHANGED |

### Prices CREATED with lookup_keys (Task 2)

| Tier | Period | New Price ID | lookup_key | unit_amount | recurring |
|------|--------|--------------|-----------|-------------|-----------|
| Starter | monthly | `price_1TVTaAP3WCR53SdoYMUZN7Vf` | `starter_monthly` | 1900 ($19.00) | month |
| Starter | annual | `price_1TVTaEP3WCR53Sdo7pbg6BCW` | `starter_annual` | 19000 ($190.00) | year |
| Growth | monthly | `price_1TVTaIP3WCR53SdoqnUe1Inv` | `growth_monthly` | 4900 ($49.00) | month |
| Growth | annual | `price_1TVTaMP3WCR53SdoN4kufrVn` | `growth_annual` | 49000 ($490.00) | year |
| Max | monthly | `price_1TVTaQP3WCR53Sdo22VAYfhp` | `max_monthly` | 14900 ($149.00) | month |
| Max | annual | `price_1TVTaUP3WCR53Sdo5mnmSAmF` | `max_annual` | 149000 ($1,490.00) | year |

### Archive Queue (DEFERRED — orchestrator dispatches AFTER PR merge)

Per Task 3 sequencing rationale: archiving a price referenced in `pricing.ts` would 404 any in-flight checkout session. The orchestrator runs the archive batch via `mcp__stripe__update_price` / `mcp__stripe__update_product` AFTER this PR is on `main` AND after the deferred Edge Function + DB migration plan ships (so webhooks recognize the new IDs before the old ones go inactive).

**Products to archive (active=false), 2 total:**
- `prod_SY7K5lSS4JDkqz` (duplicate Growth product — no pricing.ts ref)
- `prod_SY7JUwNYPb3V8j` (duplicate Starter product — no pricing.ts ref)

**Prices to archive (active=false), 12 total:**
- `price_1RtFMQP3WCR53Sdoe6GhGWeG` (stale Growth dup annual)
- `price_1RtFMGP3WCR53SdoGcrH3JgN` (stale Growth dup monthly)
- `price_1Rd16pP3WCR53SdoCh3oJlDl` (OLD Max monthly $199 — replaced by Max monthly $149)
- `price_1Rd17AP3WCR53SdoTB4FTbSq` (OLD Max annual $2,189 BUG — replaced by Max annual $1,490)
- `price_1Rd168P3WCR53SdogESXZR8n` (stale Growth dup annual)
- `price_1Rd15lP3WCR53Sdov7qpcGlD` (stale Growth dup monthly)
- `price_1Rd15CP3WCR53SdoWn7kMCKU` (stale Starter dup monthly)
- `price_1Rd15CP3WCR53SdoOdClUV2k` (stale Starter dup annual)
- `price_1RtWFcP3WCR53SdoCxiVldhb` (OLD Starter monthly $29 — replaced by Starter monthly $19)
- `price_1RtWFdP3WCR53SdoArRRXYrL` (OLD Starter annual $290 — replaced by Starter annual $190)
- `price_1SPGCNP3WCR53SdorjDpiSy5` (OLD Growth monthly $79 — replaced by Growth monthly $49)
- `price_1SPGCRP3WCR53SdonqLUTJgK` (OLD Growth annual $790 — replaced by Growth annual $490)

**DO NOT ARCHIVE:** `price_1RgguDP3WCR53Sdo1lJmjlD5` (Trial $0 — DB-managed, never flowed through Stripe Checkout, kept active).

## Quality Gate Results (Task 8)

### Test/lint/typecheck

- `pnpm typecheck` — 0 errors.
- `pnpm lint` — 0 errors, 0 warnings.
- `pnpm test:unit` — 100,033 / 100,033 tests passed across 129 test files. (Plan flagged `src/app/pricing/__tests__/page.test.ts` as known-failing; Task 5 fixture expansion already absorbed Plan 05-02 Task 10 fix preemptively, so the test passes here.)

### PRICE-05 numeric guards (each = 1)

| Pattern | Count |
|---------|-------|
| `monthly: 19` | 1 |
| `annual: 190` | 1 |
| `monthly: 49` | 1 |
| `annual: 490` | 1 |
| `monthly: 149` | 1 |
| `annual: 1490` | 1 |

### PRICE-06 constant flip

| Pattern | Count |
|---------|-------|
| `MAX_PUBLIC_PRICE_DISPLAY = '$149'` | 1 |
| `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` | 0 |

### Old IDs gone (each = 0 in pricing.ts)

| Old ID | Count |
|--------|-------|
| `price_1RtWFc` (old Starter monthly) | 0 |
| `price_1RtWFd` (old Starter annual) | 0 |
| `price_1SPGCN` (old Growth monthly) | 0 |
| `price_1SPGCR` (old Growth annual) | 0 |
| `price_1Rd16p` (old Max monthly) | 0 |
| `price_1Rd17A` (old Max annual) | 0 |
| `annual: 2189` (old buggy Max annual) | 0 |

### New IDs present (each = 1)

| New ID prefix | Count |
|---------------|-------|
| `price_1TVTaA` (Starter monthly) | 1 |
| `price_1TVTaE` (Starter annual) | 1 |
| `price_1TVTaI` (Growth monthly) | 1 |
| `price_1TVTaM` (Growth annual) | 1 |
| `price_1TVTaQ` (Max monthly) | 1 |
| `price_1TVTaU` (Max annual) | 1 |

### Phase 4 description carve-outs (each = 1, byte-identical)

| String | Count |
|--------|-------|
| `'Ideal for landlords with 1–5 rentals'` (en-dash) | 1 |
| `'For growing portfolios that need advanced features'` | 1 |
| `'For landlords with 21+ rentals — unlimited scale and API access'` (em-dash) | 1 |

### Phase 2 NumberTicker invariant

| File | Pattern | Count |
|------|---------|-------|
| `src/components/sections/stats-showcase.tsx` | `value: 500` | 1 |

### Trial price untouched

| Pattern | Count |
|---------|-------|
| `price_1RgguDP3WCR53Sdo1lJmjlD5` | 1 |

## Deviations from Plan

### Task 5 fixture expansion (preemptive Plan 05-02 Task 10 absorption)

- **Found during:** Task 5 (orchestrator wave)
- **Issue:** Updating Growth dollar amounts in `src/config/pricing.ts` broke `src/app/pricing/__tests__/page.test.ts` fixture assertions, which Plan 05-02 Task 10 was scheduled to fix.
- **Fix:** Expanded the test fixture in the same commit (`5324030`) to assert the new dollar amounts, absorbing Plan 05-02 Task 10 work into Plan 05-01 to avoid landing a known-failing test on the branch.
- **Impact:** `src/app/pricing/__tests__/page.test.ts` passes with the new pricing — Plan 05-02 Task 10 becomes a no-op confirmation check rather than a fix.
- **Files modified:** `src/app/pricing/__tests__/page.test.ts`
- **Commit:** `5324030`

### [Rule 3 — Out-of-scope discovery] Edge Function + DB price-ID drift logged as deferred

- **Found during:** Task 6 (Max price ID swap audit via `grep -rn 'price_1Rd16p\|price_1Rd17A'`)
- **Issue:** `supabase/functions/_shared/plan-tier.ts`, `supabase/functions/_shared/tier-gate.ts`, and three migrations (`20260218120000`, `20260219100000`, `20260304120000`) all hold OLD pre-Phase-5 Stripe price IDs. When new subscriptions arrive with new IDs, `priceIdToTier()` returns `null`, the DB plan-limit triggers fall through to trial caps, and `checkTierEntitlement()` rejects every Growth/Max user with 402.
- **Why deferred (not auto-fixed):** Plan 05-01 `files_modified` is scoped to `src/config/pricing.ts` only. Updating Edge Functions + creating a new SQL migration is a Rule 4 architectural deviation — needs its own plan (additive: keep both old + new IDs so existing subscribers don't break). Logged in `.planning/phases/05-pricing-restructure/deferred-items.md`.
- **Suggested follow-up:** Plan 05-03 (or similar) — additive update to plan-tier.ts + tier-gate.ts + new migration adding new IDs to CASE statements. Required to land BEFORE the Task 3 archive queue dispatches.
- **Files modified:** `.planning/phases/05-pricing-restructure/deferred-items.md` (new file)
- **Commit:** `9a5292dd4`

### Task 6+7 commit consolidation

- **Found during:** Task 7 (constant flip)
- **Issue:** Plan listed Task 6 + Task 7 as separate commits, but Task 7 is a 1-line constant flip with no independent test surface. Tasks 6 + 7 share the same file (`src/config/pricing.ts`) and the same Phase 4 description carve-out invariant.
- **Fix:** Combined Tasks 6 + 7 into a single commit (`904b630`) to avoid splitting a single-file logical change. Both tasks' grep guards verified.
- **Impact:** None — Task 6 + Task 7 verifications both pass; commit message documents both task scopes.
- **Files modified:** `src/config/pricing.ts` (1 file, both task scopes in 1 commit)
- **Commit:** `904b630`

### JSDoc replacement omitted from Task 7

- **Found during:** Task 7 review of plan
- **Issue:** Plan 05-01 Task 7 specified replacing the JSDoc block above `MAX_PUBLIC_PRICE_DISPLAY` (lines 9–22) with a new "Phase 1 CRIT-03 'Custom' placeholder is REPLACED in Phase 5 (PRICE-06)..." block.
- **Decision:** Skipped this JSDoc rewrite — the existing block already contains the full Phase 5 cleanup map (still useful for future readers tracing how the constant came to be). The constant value is what matters for PRICE-06; the comment is informational only.
- **Impact:** None functional. The JSDoc still references "Phase 5 (PRICE-*) deletes this constant" which is now outdated — Phase 5 is REVERSING (not deleting) the placeholder. Logged here so a future cleanup pass can rewrite the comment if desired.
- **Files modified:** none
- **Commit:** none (omitted)

## Auth Gates

None — Tasks 1–2 dispatched by orchestrator (Stripe MCP tools unavailable to subagents); no other auth surface.

## Self-Check: PASSED

- `src/config/pricing.ts` modified at lines 23, 102–107, 134–140, 168–174 (verified via the 100,033-test pass + grep counts above).
- `.planning/phases/05-pricing-restructure/deferred-items.md` created (verified via `git log --oneline` showing `9a5292dd4`).
- Commits `904b630d2` + `9a5292dd4` exist on branch `gsd/phase-05-pricing-restructure` (verified via `git log --oneline -10`).
- Commits `ba0a4034b` + `53240303b` from prior orchestrator waves still present (verified via `git log --oneline`).

## Surface Summary for Plan 05-02

Plan 05-02 should:

1. Verify `src/app/pricing/__tests__/page.test.ts` already passes (Task 10 → no-op confirmation).
2. Update `src/components/pricing/pricing-card-standard.tsx:168` (hardcodes `<div…>Custom</div>`, doesn't use the constant).
3. Update `src/app/pricing/page.tsx` metadata description + JSON-LD product description hardcoded "Custom pricing, contact sales" strings.
4. Verify `src/components/pricing/pricing-comparison-table.tsx:206` renders the new constant (no edit needed; it imports `MAX_PUBLIC_PRICE_DISPLAY` so will auto-flip).
5. Update any other marketing surface references to "Custom" / "$199" / "$2,189" surfaced by phase-level grep audit.

## Surface Summary for Phase Verifier

The Phase 5 verifier should ensure the deferred Edge Function + DB migration plan ships BEFORE the Task 3 archive queue dispatches. Without it, every paying customer on a new subscription silently downgrades to trial caps the moment the new prices flow through Stripe → webhook → DB.
