---
phase: 55
slug: rent-ledger
status: draft
nyquist_compliant: true
wave_0_complete: false # flips true once 55-03 executes its 6 Wave 0 test files
created: 2026-07-24
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom (unit); RLS integration harness (`tests/integration/rls/`, dual-client ownerA/ownerB vs prod); Playwright (E2E) |
| **Config file** | `vitest.config.ts` (existing); `tests/integration/rls/` (existing) |
| **Quick run command** | `bun run validate:quick` (types + lint + unit) |
| **Full suite command** | `bun run validate:quick` then `bun run test:integration` |
| **Estimated runtime** | ~60s quick; integration ~2–4 min (hits prod, sequential) |

---

## Sampling Rate

- **After every task commit:** Run `bun run validate:quick` (types + lint + unit) — pre-commit lefthook enforces 80% coverage.
- **After every plan wave:** Run `bun run test:integration` (RLS owner-isolation + append-only) — hits prod, sequential.
- **Before `/gsd:verify-work`:** Full suite green + perfect-PR gate (two consecutive zero-finding review cycles).
- **Max feedback latency:** ~60 seconds (quick), integration on wave merge.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| W0 | — | 0 | LEDGER-01 | T-money-scale | numeric(10,2), no ×100 anywhere | unit (grep) | `bun run test:unit -- --run src/hooks/api/__tests__/rent-ledger-money.test.ts` | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-01 | — | one 'rent' charge/lease/month, amount exact | integration (SQL) | `bun run test:integration -- rent-ledger-generation` | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-01 | — | re-run generation inserts 0 (idempotent) | integration | `bun run test:integration -- rent-ledger-generation` | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-02 | — | partial receipts → charge derives partial→paid | unit (balance math) | `bun run test:unit -- --run src/hooks/api/__tests__/rent-ledger-balance.test.ts` | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-03 | — | balance = Σcharges − Σreceipts (signed); credits reduce | unit | same balance test | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-03 | — | late = unpaid remaining AND due_date+5d < today (boundary +5 not late / +6 late) | unit | same balance test | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-04 | — | no ledger_start_date → no charges; opening balance seeds | integration | generation test | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-05 | — | manual late_fee/manual_charge/credit insert + affect balance | unit + integration | balance + RLS | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-06 | T-tamper | UPDATE/DELETE RAISES; reversal nets to zero | integration (RLS) | `bun run test:integration -- rent-ledger-append-only` | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-06 | T-cross-owner | ownerA cannot SELECT/INSERT ownerB's rows | integration (RLS) | dual-client isolation | ❌ W0 | ⬜ pending |
| W0 | — | 0 | LEDGER-07 | — | collections reflects receipts; scheduled ≠ collected, never summed | unit (mapper) + integration | analytics-mappers test | partial (analytics-mappers.test.ts exists) |
| W0 | — | 0 | LEDGER-08 | — | collection_rate = collected÷scheduled; 0 when scheduled=0 (no fabrication) | unit + integration | collection-rate test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs finalize when PLAN.md files are generated.*

---

## Wave 0 Requirements

- [ ] `src/hooks/api/__tests__/rent-ledger-balance.test.ts` — balance/late/paid-state math (LEDGER-02/03/05)
- [ ] `src/hooks/api/__tests__/rent-ledger-money.test.ts` — grep assertion: no `*100` / `/100` / `formatCents` on ledger amounts (LEDGER-01)
- [ ] `tests/integration/rls/rent-ledger-append-only.test.ts` — UPDATE/DELETE raises; reversal nets zero (LEDGER-06)
- [ ] `tests/integration/rls/rent-ledger-isolation.test.ts` — dual-client owner isolation (LEDGER-06)
- [ ] `tests/integration/rls/rent-ledger-generation.test.ts` — idempotency + amount-exactness + coverage predicate (LEDGER-01/04)
- [ ] `src/hooks/api/query-keys/rent-ledger-keys.test.ts` — mapper shape + collection-rate (LEDGER-07/08)
- [ ] Framework install: none needed (Vitest + RLS harness present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Collection-rate KPI card renders honest 0% with no ledger data | LEDGER-08 | Visual dashboard render + IntersectionObserver KPI hydration | Load `/owner` dashboard with a fresh owner (no ledger); confirm KPI shows 0% collected, not a fabricated figure |
| Scheduled vs Collected labels are visually distinct and never summed | LEDGER-07 | UX/labeling correctness is a read judgment | Inspect revenue surfaces; confirm both figures carry explicit labels, no combined total |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Validation strategy signed off at plan time (2026-07-24). Dimension 8 (Nyquist) checks pass: every task has an `<automated>` verify, no watch-mode or full-E2E loops, sampling continuity intact, all 6 Wave 0 test files assigned to 55-03. `wave_0_complete` flips true once 55-03 executes those files.
