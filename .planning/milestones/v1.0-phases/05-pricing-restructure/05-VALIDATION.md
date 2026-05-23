---
phase: 05-pricing-restructure
phase_number: 5
generated: 2026-05-10
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfilled: 2026-05-22
backfill_note: "Phase 15 milestone audit round-2 polish — frontmatter fields added retroactively; the test maps below and all referenced tests ship in CI (pricing.test.ts math regression, pricing/page.test.ts 3-offer assertion, persona-banlist updates)."
source: derived from `05-RESEARCH.md § Tests to Update` + Specialist 1 codebase touchpoint matrix
---

# Phase 5 Validation Strategy

Validation scaffolding for Nyquist gate. Maps each phase requirement to a concrete test + automated command + file location.

## Test Framework Inventory

| Layer | Framework | Quick Command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `pnpm test:unit -- --run <path>` |
| E2E | Playwright | `pnpm test:e2e -- --project=public --grep "<grep>"` |
| Type | TypeScript 5.x strict | `pnpm typecheck` |
| Lint | ESLint flat | `pnpm lint` |
| Stripe | MCP `list_prices` / `list_products` | runtime smoke check (orchestrator) |

## Phase Requirements → Test Map

### PRICE-01: Revenue baseline audit

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| Confirm 0 active subs in Stripe before migration | manual | Stripe MCP `list_subscriptions --status=active` returns `[]` (already verified 2026-05-10) | pre-Plan-05-01 gate |
| Document baseline in PRICING-DECISION.md / RESEARCH.md | grep | `grep -F '0 active subs' .planning/phases/05-pricing-restructure/*.md` returns ≥1 | already done |

### PRICE-02: Competitor analysis

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| 8-competitor matrix documented | grep | `wc -l .planning/phases/05-pricing-restructure/05-RESEARCH-competitor-pricing.md` returns ≥200 | already done |

### PRICE-03: PRICING-DECISION.md artifact

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| Decision rationale present (price points, names, limits, features) | grep | `grep -F 'Option A' .planning/phases/05-pricing-restructure/05-RESEARCH.md` returns ≥1 | already done |

### PRICE-04: Stripe migration

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| 6 new prices created with `lookup_key` | manual | Stripe MCP `list_prices` confirms 6 prices with lookup_keys `starter_monthly|annual`, `growth_monthly|annual`, `max_monthly|annual` | Plan 05-01 verify |
| `pricing.ts` references new price IDs only | grep | `grep -E 'price_1Rd16p\|price_1Rd17A\|price_1RtFM\|price_1RtWFc\|price_1SPGCN\|price_1SPGCR\|price_1Rd15C\|price_1Rd15l\|price_1Rd168' src/config/pricing.ts` returns 0 | Plan 05-01 verify |
| 2 stale duplicate products archived | manual | Stripe MCP `list_products` returns archived status for `prod_SY7K5lSS4JDkqz` + `prod_SY7JUwNYPb3V8j` | Plan 05-01 verify |
| Customer migration playbook documented | grep | `grep -F 'migration playbook' .planning/phases/05-pricing-restructure/05-CONTEXT.md` returns ≥1 | already done |

### PRICE-05: Annual savings math

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| `monthly × 10 === annual` for all 3 tiers | unit | `pnpm test:unit -- --run src/lib/utils/__tests__/calculate-annual-savings.test.ts` (or new test) | Plan 05-02 |
| `pricing.ts` STARTER monthly === 29 → 19 | grep | `grep -F 'monthly: 19' src/config/pricing.ts` returns 1 | Plan 05-01 |
| `pricing.ts` STARTER annual === 290 → 190 | grep | `grep -F 'annual: 190' src/config/pricing.ts` returns 1 | Plan 05-01 |
| `pricing.ts` GROWTH monthly === 79 → 49 | grep | `grep -F 'monthly: 49' src/config/pricing.ts` returns 1 | Plan 05-01 |
| `pricing.ts` GROWTH annual === 790 → 490 | grep | `grep -F 'annual: 490' src/config/pricing.ts` returns 1 | Plan 05-01 |
| `pricing.ts` MAX monthly === 199 → 149 | grep | `grep -F 'monthly: 149' src/config/pricing.ts` returns 1 | Plan 05-01 |
| `pricing.ts` MAX annual === 2189 → 1490 | grep | `grep -F 'annual: 1490' src/config/pricing.ts` returns 1 | Plan 05-01 |

### PRICE-06: Replace CRIT-03 placeholders

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| `MAX_PUBLIC_PRICE_DISPLAY` flips from `'Custom'` → `'$149'` | grep | `grep -F "MAX_PUBLIC_PRICE_DISPLAY = '\$149'" src/config/pricing.ts` returns 1 | Plan 05-01 |
| `productJsonLd.offers` has 3 entries (was 2 under CRIT-03) | unit | `pnpm test:unit -- --run src/app/pricing/__tests__/page.test.ts` — assertion flips from `length === 2` to `length === 3` | Plan 05-02 |
| `pricing-card-standard.tsx:168` no longer renders `'Custom'` text | grep | `grep -cF '>Custom<' src/components/pricing/pricing-card-standard.tsx` returns 0 | Plan 05-02 |
| `pricing/page.tsx:24` description swapped | grep | `grep -F 'Max ($149/mo' src/app/pricing/page.tsx` returns 1 | Plan 05-02 |
| `pricing/page.tsx:36` JSON-LD description swapped | grep | `grep -F 'Max $149/mo' src/app/pricing/page.tsx` returns 1 | Plan 05-02 |
| Live: `https://tenantflow.app/pricing` shows `$149/mo` for Max | manual | `curl -s https://tenantflow.app/pricing \| grep -oE '\$149/mo'` returns ≥1 | post-deploy gate |
| Live: `https://tenantflow.app/pricing` does NOT show `Custom pricing, contact sales` body text | manual | `curl -s https://tenantflow.app/pricing \| grep -oE 'Custom pricing, contact sales'` returns 0 | post-deploy gate |

### Phase 4 carve-outs (REGRESSION GUARD)

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `pricing.ts:100` STARTER description = `'Ideal for landlords with 1–5 rentals'` | grep | `grep -F "'Ideal for landlords with 1–5 rentals'" src/config/pricing.ts` returns 1 |
| `pricing.ts:133` GROWTH description = `'For growing portfolios that need advanced features'` | grep | `grep -F "'For growing portfolios that need advanced features'" src/config/pricing.ts` returns 1 |
| `pricing.ts:167` MAX description = `'For landlords with 21+ rentals — unlimited scale and API access'` | grep | `grep -F "'For landlords with 21+ rentals — unlimited scale and API access'" src/config/pricing.ts` returns 1 |
| Phase 4 banlist test still green | unit | `pnpm test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` exits 0 |
| Phase 4 persona-consistency e2e still passes (no new "property owner" leaks introduced by pricing copy edits) | e2e | `pnpm test:e2e -- --project=public --grep "Persona consistency"` |

### Phase 2 NumberTicker invariant

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `stats-showcase.tsx value: 500` integer untouched | grep | `grep -F 'value: 500' src/components/sections/stats-showcase.tsx` returns 1 |

### Cross-cutting design-token diff gate

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| No new hex codes | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*#[0-9a-fA-F]{3,8}\b" \| wc -l` returns 0 |
| No new rgba | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*rgba?\(" \| wc -l` returns 0 |
| No bg-white | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*bg-white" \| wc -l` returns 0 |
| No inline ms | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*\b[0-9]+ms\b" \| wc -l` returns 0 |

## Sampling Rate

- **Per task commit:** task-specific `<verify>` block
- **Per plan merge:** `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Plan 05-01 gate:** Stripe MCP smoke (6 new prices visible with lookup_keys + 2 archived products) + grep gates above + Phase 4 description preservation grep
- **Plan 05-02 gate:** above + e2e persona-consistency green + JSON-LD assertion flipped
- **Phase ship gate:** full suite green + Phase 4 + Phase 2 regression guards intact
- **Post-deploy gate:** Vercel deploy success + `curl https://tenantflow.app/pricing` showing $19/$49/$149 + zero 'Custom pricing, contact sales' + JSON-LD `offers.length === 3`

## Wave 0 Gaps

No new test files required — all assertions extend existing tests:
- `src/app/pricing/__tests__/page.test.ts` (extend with new offers length + Max-included assertions)
- `src/components/sections/__tests__/home-faq.test.tsx` (extend if pricing dollar values appear in entries)
- Stripe migration is verified via MCP at runtime, not unit-tested

## Manual Verification Anchors

| Plan | Manual Checkpoint Task |
|------|------------------------|
| 05-01 | Stripe MCP `list_prices` confirms 6 new prices have correct amounts + `lookup_key` set; old prices archived |
| 05-02 | After Vercel deploy: pricing card shows $19/$49/$149; JSON-LD has 3 offers; comparison table reflects new amounts |

## Security Domain

Not applicable. Pure config + Stripe API migration + JSON-LD numeric updates. No auth changes, no PII handling, no new endpoints.

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Test framework inventory | HIGH | Same as Phases 2/3/4 |
| PRICE-04 Stripe smoke | HIGH | Stripe MCP confirmed working; live `list_prices` covers it |
| PRICE-05 unit asserts | HIGH | Pure number checks; trivial |
| PRICE-06 JSON-LD flip | HIGH | Inverse of CRIT-03 cycle 1 assertion; well-understood |
| Phase 4 carve-out preservation | HIGH | Description strings identical; one-line grep guards |
| Live verification commands | HIGH | Curl + grep already proven in Phase 4 cycle |

---

*Validation strategy generated: 2026-05-10 — derived from research synthesis after Option A locked.*
