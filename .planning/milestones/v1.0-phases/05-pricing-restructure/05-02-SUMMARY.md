---
phase: 05-pricing-restructure
plan: 02
subsystem: marketing-surface
tags: [pricing, marketing-copy, json-ld, seo, persona-banlist, crit-03-reversal]
requirements:
  - PRICE-06
dependencies:
  requires:
    - "Plan 05-01 — pricing.ts repointed to $19/$49/$149 + MAX_PUBLIC_PRICE_DISPLAY = '$149'"
  provides:
    - "JSON-LD Product schema with 3 offers (Starter $19, Growth $49, Max $149) — was 2 under CRIT-03"
    - "Pricing card Max column rendered via NumberFlow (no 'Custom' literal)"
    - "Comparison-table header columns: $19/mo, $49/mo, $149"
    - "Compare-page TENANTFLOW_PRICING tuple + recomputed savings ($1,600/year vs Buildium, $3,000/year vs AppFolio)"
    - "Persona banlist no longer banning $49/mo (legit Growth price post-Phase-5)"
  affects:
    - "Vercel deploy → live https://tenantflow.app/pricing reflects new tier shape"
    - "Google Search structured data sees 3 priced offers (was 2 under CRIT-03)"
tech-stack:
  added: []
  patterns:
    - "PRICE-06 reversal: CRIT-03 cycle-1 invariants (Max excluded from offers, 'Custom' placeholder) deliberately flipped — this is the only legitimate phase to do so"
    - "Persona banlist recalibration: legacy $49 banlist entries removed because $49 is now the real Growth price; 'professional plan', 'enterprise plan', 'up to 50 units' remain banned"
key-files:
  created:
    - .planning/phases/05-pricing-restructure/05-02-SUMMARY.md
  modified:
    - src/app/pricing/page.tsx
    - src/app/pricing/__tests__/page.test.ts
    - src/components/pricing/pricing-card-standard.tsx
    - src/components/pricing/pricing-comparison-table.tsx
    - src/components/sections/comparison-table.tsx
    - src/components/sections/home-faq.tsx
    - src/app/compare/[competitor]/compare-data.ts
    - src/app/__tests__/marketing-copy-landlord-only.test.ts
    - src/lib/generate-metadata.ts
    - src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts
  also-included-pre-staged:
    - supabase/functions/_shared/plan-tier.ts
    - supabase/functions/_shared/tier-gate.ts
    - supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql
    - supabase/migrations/20260510094452_phase_5_drop_resurrected_text_overload.sql
decisions:
  - "Tasks 1 + 4 + 9 committed atomically — page.tsx flip would break the page test that asserts CRIT-03 invariants AND the persona banlist that bans $49/mo. All three must land together for CI to stay green."
  - "Task 10 was a no-op verify — Plan 05-01 Task 5 commit (5324030) already absorbed both settings test fixture flips (Growth $79 → $49) preemptively when repricing pricing.ts."
  - "Plan 05-01 deferred-items.md (Edge Function + DB price-ID drift) landed alongside Task 8 commit because pre-existing index state included those pre-staged files. This actually resolves the deferred work that the phase-verifier needed before archive queue dispatch — see 'Deviations from Plan' below."
  - "Buildium savings recompute: ($183 − $49) × 12 = $1,608/year, marketed as $1,600/year (round down to clean figure)"
  - "AppFolio savings recompute: ($298 − $49) × 12 = $2,988/year, marketed as $3,000/year (round to clean figure)"
  - "RentRedi delta: $19 − $9 = $10/month (was $20/month under old Starter $29)"
metrics:
  duration: "single executor session 2026-05-10"
  start: "2026-05-10T04:40:00Z"
  completed: "2026-05-10T04:48:00Z"
  task-count: 13
  file-count: 10
---

# Phase 5 Plan 02: Marketing Surface Propagation + CRIT-03 Reversal Summary

One-liner: Propagated Option A tier prices ($19/$49/$149) across all marketing surfaces, reversed the Phase 1 CRIT-03 placeholder by flipping pricing/page.tsx JSON-LD to include Max as the 3rd offer at $149.00, dropped the hardcoded `'Custom'` literal from the Max pricing card, recalibrated the persona banlist (now permits $49/mo as the real Growth price), and recomputed competitor compare-page savings math against the new Growth price.

## Task Results

| # | Name | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | pricing/page.tsx metadata + JSON-LD | DONE | `1d40baef7` | Bundled with Tasks 4+9 (atomic CRIT-03 reversal) |
| 2 | Drop `'Custom'` literal from pricing-card-standard.tsx | DONE | `cd21f318d` | Max card now renders via NumberFlow path; isEnterprise still gates CTA + dialog branches |
| 3 | pricing-comparison-table.tsx header columns | DONE | `cbb75c359` | Starter $29 → $19, Growth $79 → $49; Max via constant auto-flipped |
| 4 | Flip pricing/page.tsx test (CRIT-03 reversal) | DONE | `1d40baef7` | Bundled with Tasks 1+9 |
| 5 | home-faq.tsx Starter $29/month → $19/month | DONE | `49ab06200` | Single-line FAQ entry edit |
| 6 | sections/comparison-table.tsx 50-unit row $79 → $49 | DONE | `67d3f319d` | Growth tier mapping unchanged (50 units fits Growth's 100-unit cap) |
| 7 | compare-data.ts Option A + recomputed savings | DONE | `fe076afd7` | 10 edits: TENANTFLOW_PRICING tuple + 9 per-competitor copy strings |
| 8 | generate-metadata.ts + tax-deduction-data.ts sweep | DONE | `28fcec2ff` | OG/Twitter "Plans from $19/mo" + tax-deduction example "$19-$149/month" |
| 9 | marketing-copy banlist recalibration | DONE | `1d40baef7` | Bundled with Tasks 1+4 |
| 10 | Settings test fixtures Growth $79 → $49 | DONE (already absorbed) | (Plan 05-01 `5324030`) | Plan 05-01 Task 5 absorbed this preemptively |
| 11 | Final sweep for stale TenantFlow tier prices | DONE | (verification only) | Only hit: `currency.test.ts:65` generic formatter test (KEEP per plan) |
| 12 | Quality gate (typecheck + lint + test:unit + grep guards) | DONE | (verification only) | All 98,573 tests pass; design-token diff gate clean |
| 13 | Post-deploy curl verification | PENDING | (post-merge gate) | Awaits Vercel deploy from `main` after PR merge |

## Commits

- `1d40baef7` — feat(phase-05-02): reverse CRIT-03 in pricing/page.tsx + tests + banlist (Tasks 1+4+9)
- `cd21f318d` — feat(phase-05-02): drop hardcoded 'Custom' literal from Max pricing card (Task 2)
- `cbb75c359` — feat(phase-05-02): update pricing-comparison-table header columns to Option A (Task 3)
- `49ab06200` — feat(phase-05-02): update home-faq Starter price reference (Task 5)
- `67d3f319d` — feat(phase-05-02): update sections/comparison-table 50-unit row to Growth $49 (Task 6)
- `fe076afd7` — feat(phase-05-02): update compare-data.ts to Option A + recompute savings (Task 7)
- `28fcec2ff` — feat(phase-05-02): sweep generate-metadata + tax-deduction-data to Option A (Task 8)

## File-by-File Diff Summary

### Plan-scoped files (10)

| File | Change |
|------|--------|
| `src/app/pricing/page.tsx` | metadata.title `Plans from $29/mo` → `Plans from $19/mo`; metadata.description Starter $29/$5p, Growth $79/$20p, Max custom-pricing → Starter $19, Growth $49, Max $149/unlimited; productJsonLd.description matches; productJsonLd.offers flipped from 2 to 3 (Max included at `'149.00'`); CRIT-03 placeholder comment dropped |
| `src/app/pricing/__tests__/page.test.ts` | describe renamed to "PRICE-06 reversal (Phase 5)"; 3 it-blocks rewritten (asserts new metadata description, 3 offers with new prices, JSON-LD description includes Max $149); FAQPage 5-entries assertion preserved (Phase 4 carve-out) |
| `src/components/pricing/pricing-card-standard.tsx` | `{isEnterprise ? <div>Custom</div> : <>NumberFlow + label</>}` collapsed to single NumberFlow + label branch. `isEnterprise` still consumed downstream (Contact Sales CTA + MessageSquare icon + dialog branch) — 7 references remain after edit |
| `src/components/pricing/pricing-comparison-table.tsx` | Header cells `$29/mo` → `$19/mo`, `$79/mo` → `$49/mo`. Max column unchanged (consumes `MAX_PUBLIC_PRICE_DISPLAY` constant which auto-flipped via Plan 05-01) |
| `src/components/sections/comparison-table.tsx` | Monthly Cost (50 units) row: `tenantFlow: '$79/mo'` → `'$49/mo'`. Description ("Growth plan, up to 100 units") unchanged |
| `src/components/sections/home-faq.tsx` | "Up to 25 units" Starter FAQ answer: `at $29/month` → `at $19/month` |
| `src/app/compare/[competitor]/compare-data.ts` | TENANTFLOW_PRICING tuple all 3 prices; Buildium heroSubtitle entry-point + whySwitch[0] savings; AppFolio description + metaDescription + heroSubtitle + whySwitch savings; RentRedi metaDescription + heroSubtitle + description delta |
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | BANNED_STALE_PLAN_REFS: drop `$49/mo` + `$49/month`; comment block above the array rewritten to explain Phase-5 rationale; cycle-5 C-1 describe-block context comment rewritten to drop stale "$49/month" framing; cycle-6 C-1 comment de-references the now-removed quoted-form example |
| `src/lib/generate-metadata.ts` | OpenGraph description + Twitter description: `Plans from $29/mo.` → `Plans from $19/mo.` (replace_all = 2 occurrences) |
| `src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts` | Software & Tools deduction example: `TenantFlow subscription: $29-$199/month` → `$19-$149/month` |

### Pre-staged files included in commit `28fcec2ff` (out of plan scope; see Deviations)

| File | Change |
|------|--------|
| `supabase/functions/_shared/plan-tier.ts` | STARTER/GROWTH/MAX price ID sets swapped from old Phase-pre-5 IDs to new Phase-5 IDs (price_1TVTaA*..price_1TVTaU*) |
| `supabase/functions/_shared/tier-gate.ts` | Aligned with the new IDs |
| `supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql` | DB migration teaching plan-limit triggers about the new Stripe price IDs |
| `supabase/migrations/20260510094452_phase_5_drop_resurrected_text_overload.sql` | Drops a resurrected text overload following the phase 5 cleanup |

## Recomputed Savings Math (Task 7)

| Comparison | Old TenantFlow | New TenantFlow | Competitor | Annual delta | Marketed as |
|------------|----------------|----------------|------------|---------------|-------------|
| Buildium Growth | $79/mo | $49/mo | $183/mo | ($183 − $49) × 12 = $1,608 | "$1,600/year" |
| AppFolio Core | $79/mo | $49/mo | $298/mo (50-unit min) | ($298 − $49) × 12 = $2,988 | "$3,000/year" |
| RentRedi Annual | $29/mo | $19/mo | $9/mo | $19 − $9 = $10/month delta | "just $10 more per month" |

Numbers rounded to clean marketing-grade figures per plan Task 7 action note (T-05-10 in threat register accepted as "marketing approximation").

## Task 11 Sweep Audit Table

Sweep run: `grep -rnE '\$29/mo|\$79/mo|\$199/mo|\$290\b|\$790\b|\$2,189\b|\$2189\b' src/ --include="*.ts" --include="*.tsx"`

| File:Line | Hit | Disposition | Rationale |
|-----------|-----|-------------|-----------|
| `src/lib/utils/__tests__/currency.test.ts:65` | `formatPrice(29, ...).toBe('$29/mo')` | KEEP | Generic utility-fn test asserting mechanical formatter behavior; not a pricing-strategy hardcode. The `29` is an arbitrary numeric input, not the Starter tier. |

Broader sweep (`\$29|\$79|\$199`) hits in non-test files were either:
- Comments documenting the Phase 5 reasoning (intentional, preserved):
  - `src/app/__tests__/marketing-copy-landlord-only.test.ts:482` — Phase-5 carve-out comment
  - `src/app/pricing/__tests__/page.test.ts:105` — stale-price regression-guard comment

Zero hits in production marketing surfaces.

## Phase 4 + Phase 2 Regression Guards (verified at end of Plan 05-02)

| Guard | File | Pattern | Count | Status |
|-------|------|---------|-------|--------|
| Phase 4 — Starter description | `src/config/pricing.ts` | `'Ideal for landlords with 1–5 rentals'` | 1 | ✓ intact |
| Phase 4 — Growth description | `src/config/pricing.ts` | `'For growing portfolios that need advanced features'` | 1 | ✓ intact |
| Phase 4 — Max description | `src/config/pricing.ts` | `'For landlords with 21+ rentals — unlimited scale and API access'` | 1 | ✓ intact |
| Phase 2 — NumberTicker invariant | `src/components/sections/stats-showcase.tsx` | `value: 500` | 1 | ✓ intact |

## CRIT-03 Reversal — Legitimate Per Phase 5 Contract

Phase 1 CRIT-03 (cycle 1) introduced placeholder assertions that explicitly anticipated reversal in Phase 5 PRICE-06:

- "metadata.description omits `$199/mo` for Max and includes `Max — Custom pricing, contact sales`" → flipped to "metadata.description includes `Max ($149/mo, unlimited properties)` and omits `Custom pricing, contact sales`"
- "productJsonLd is built with exactly 2 offers (Starter + Growth, no Max)" → flipped to "productJsonLd is built with exactly 3 offers (Starter + Growth + Max — Phase 5 PRICE-06 flip)"
- "productJsonLd.description contains verbatim 'Custom pricing, contact sales'" → flipped to "productJsonLd.description contains 'Max $149/mo (unlimited properties)' and omits the CRIT-03 placeholder"

The 4th `it()` block (FAQPage entries.length === 5 — COPY-05 / Phase 4 carve-out) is preserved untouched.

This is the only phase where CRIT-03 invariants legitimately change.

## Threat Register Outcomes (from Plan 05-02 frontmatter)

| Threat ID | Mitigation Outcome |
|-----------|---------------------|
| T-05-06 (JSON-LD vs visible page mismatch) | MITIGATED — Tasks 1 + 2 + 3 keep JSON-LD offers, page metadata, and visible Max card aligned at $149. Task 13 (post-deploy curl) will verify against the deployed page. |
| T-05-07 (banlist loosened too aggressively) | MITIGATED — only `$49/mo` / `$49/month` removed (now legit). `professional plan`, `enterprise plan`, `up to 50 units` remain. Comment block explains rationale. |
| T-05-08 (stale price text on missed page) | MITIGATED — Task 11 sweep complete; only `currency.test.ts:65` generic-formatter test remains (KEEP). Audit table above documents every disposition. |
| T-05-09 (pricing-card-standard wrong currentPrice) | MITIGATED — `pnpm typecheck` clean; `currentPrice = plan.price[billingCycle]` flows through `getAllPricingPlans()` → bento-pricing-section's plan-shape mapper post-Plan-05-01. Task 13 verifies live. |
| T-05-10 (compare-page math errors) | ACCEPT — savings figures rounded to clean marketing values; rationale documented above and in commit fe076afd7 message. |

## Deviations from Plan

### [Rule 3 — Pre-existing index state] Plan 05-01 deferred-items resolution rode along with Task 8

- **Found during:** Task 8 commit (`28fcec2ff`)
- **Issue:** When staging `src/lib/generate-metadata.ts` + `src/app/resources/.../tax-deduction-data.ts` for Task 8, four additional pre-staged files came along in the commit because they were already in the git index when this executor session began:
  - `supabase/functions/_shared/plan-tier.ts` (STARTER/GROWTH/MAX price ID sets swapped from old → new IDs)
  - `supabase/functions/_shared/tier-gate.ts` (aligned with new IDs)
  - `supabase/migrations/20260510094421_phase_5_recognize_new_price_ids.sql` (new migration)
  - `supabase/migrations/20260510094452_phase_5_drop_resurrected_text_overload.sql` (new migration)
- **Why this is beneficial:** These changes resolve the Plan 05-01 deferred-items.md (Edge Function + DB price-ID drift). The phase verifier explicitly requires this work to land BEFORE the Plan 05-01 Task 3 archive queue dispatches — without it, every paying Growth/Max customer would silently downgrade to trial caps when new subscriptions arrive.
- **Note on plan scope:** Plan 05-02 `files_modified` was scoped to 10 marketing-surface files. The pre-staged Edge Function + migration changes are technically out of plan scope. Per Rule 3 (auto-fix blocking issues) the changes are correctness-required; per the SCOPE BOUNDARY guidance these were also already staged outside this executor's edits.
- **Plan 05-01 deferred work — what changed vs. what was planned:** The Plan 05-01 deferred-items.md called for an ADDITIVE update (keep both old + new IDs so existing subscribers don't break). The pre-staged change is a SWAP (replaces old IDs with new). This is acceptable here only because Plan 05-01 confirmed zero active subscribers — there are no in-flight customers to preserve. If new active subscriptions had landed between Plan 05-01 and this commit, the swap would cause a regression. Phase verifier should confirm Stripe `list_subscriptions --status=active` still returns `[]` before the post-merge archive batch dispatches.
- **Commit:** `28fcec2ff`

### Tasks 1 + 4 + 9 bundled into a single commit

- **Found during:** Task 1 initial commit attempt
- **Issue:** Per-task Task 1 commit failed pre-commit hooks because:
  1. `src/app/pricing/__tests__/page.test.ts` still asserted CRIT-03 invariants (was Task 4's job to flip)
  2. `src/app/__tests__/marketing-copy-landlord-only.test.ts` BANNED_STALE_PLAN_REFS still banned `$49/mo` (was Task 9's job to drop) — and pricing/page.tsx now contained `$49/mo` (Task 1's edit), tripping the banlist scanner
- **Resolution:** Tasks 1 + 4 + 9 form an atomic CRIT-03 reversal — must land together. Bundled into single commit `1d40baef7` to stay green through the lefthook pre-commit unit-test gate. Each task's individual scope is documented in the commit body.
- **Impact:** Three logical tasks ship as one commit. Plan-level grep guards verify all three were applied correctly.

### Task 10 absorbed by Plan 05-01 Task 5 (no-op)

- **Status:** Already documented in 05-01-SUMMARY.md "Surface Summary for Plan 05-02"
- **Verification:** `grep -cF "screen.getByText('$49')"` returns 1 in both `billing-settings.test.tsx` and `settings-page.test.tsx`; zero `$79` references remain
- **Outcome:** No commit needed — Plan 05-02 Task 10 was already complete on branch entry

### Task 13 (post-deploy curl) deferred to post-merge gate

- **Status:** Cannot be executed until Vercel deploys the merged PR from `main`
- **Required steps for orchestrator after merge:**
  1. Confirm Vercel deploy success
  2. Run the 6 curl probes documented in Plan 05-02 Task 13 against `https://tenantflow.app`
  3. Verify JSON-LD product schema has 3 offers
  4. Confirm zero "Custom pricing, contact sales" body-text occurrences

## Auth Gates

None — Plan 05-02 is pure code/copy edits with no Stripe MCP, no Supabase MCP, no GitHub MCP calls.

## Quality Gate Results

### Test/lint/typecheck (final state)

- `pnpm typecheck` — 0 errors
- `pnpm lint` — 0 errors, 0 warnings
- `pnpm test:unit` — 98,573 / 98,573 tests passed across 129 test files
- All 7 task commits passed lefthook pre-commit hooks (gitleaks + lockfile-verify + lint + typecheck + unit-tests + commitlint)

### Cross-cutting design-token diff gate (must all be 0)

| Check | Result |
|-------|--------|
| New hex codes in src/ diff vs main | 0 |
| New rgba() in src/ diff vs main | 0 |
| New bg-white in src/ diff vs main | 0 |
| New inline ms in src/ diff vs main | 0 |

### PRICE-06 grep guards (each = 1)

| Pattern | Count |
|---------|-------|
| `Max ($149/mo, unlimited properties)` in pricing/page.tsx | 1 |
| `Max $149/mo (unlimited properties)` in pricing/page.tsx | 1 |
| `name: 'Max', price: '149.00'` in pricing/page.tsx | 1 |

### PRICE-06 grep guards (each = 0)

| Pattern | Count |
|---------|-------|
| `Custom pricing, contact sales` in pricing/page.tsx | 0 |
| `>Custom<` in pricing-card-standard.tsx | 0 |

### compare-data.ts post-edit grep guards

| Pattern | Count | Expected |
|---------|-------|----------|
| `$29/mo\|$79/mo\|$199/mo` | 0 | 0 |
| `{ name: 'Starter', price: '$19/mo'` | 1 | 1 |
| `{ name: 'Growth', price: '$49/mo'` | 1 | 1 |
| `price: '$149/mo'` | 1 | 1 |
| `$1,600/year` | 1 | 1 |
| `$3,000/year` | 1 | 1 |
| `$1,200/year` | 0 | 0 |
| `$2,600/year` | 0 | 0 |

## Self-Check: PASSED

- All 10 plan-scoped files created or modified, verified via `git log --stat` on each commit hash
- All 7 task commits exist on branch `gsd/phase-05-pricing-restructure` (1d40baef7, cd21f318d, cbb75c359, 49ab06200, 67d3f319d, fe076afd7, 28fcec2ff)
- Plan 05-01 commits (ba0a4034b, 53240303b, 904b630d2, 9a5292dd4, 64ad9a33d) still present on branch
- All 13 task `<verify>` block grep guards pass (where applicable; Task 11 sweep + Task 12 quality gate verified inline above)
- Phase 4 description carve-outs intact (3/3 strings byte-identical in pricing.ts)
- Phase 2 NumberTicker `value: 500` invariant intact

## Surface Summary for Phase Verifier

The phase verifier should:

1. **Run the post-deploy curl probe (Task 13)** against `https://tenantflow.app/pricing` after Vercel deploys the merged PR. The 6 probe commands are documented in Plan 05-02 Task 13.
2. **Confirm the pre-staged Edge Function + DB migration deviation is acceptable.** The deferred-items.md called for an additive change; the pre-staged commit is a swap. The swap is safe ONLY because zero active subscribers exist in Stripe — verify via `mcp__stripe__list_subscriptions --status=active` returns `[]` before dispatching Plan 05-01 Task 3 archive queue.
3. **Dispatch Plan 05-01 Task 3 archive queue** (12 stale prices + 2 stale duplicate products) AFTER the Plan 05-02 PR lands on `main`. The Edge Function + migration changes that landed in commit `28fcec2ff` mean webhooks now recognize the new IDs, so archiving the old prices won't break any in-flight checkouts.
4. **Update deferred-items.md** to mark the Edge Function + DB migration item resolved (replaced inline by commit `28fcec2ff`).
