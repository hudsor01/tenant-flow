---
phase: 2
slug: financial-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (3 projects: unit, component, integration) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm validate:quick` (types + lint + unit tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PAY-06 | manual | Migration verification (numeric(10,2) column check) | N/A | ⬜ pending |
| 02-01-02 | 01 | 1 | PAY-01,PAY-05 | unit | `pnpm test:unit -- --run src/components/payments/payment-utils.test.ts` | Needs check | ⬜ pending |
| 02-01-03 | 01 | 1 | PAY-02 | unit | `pnpm test:unit -- --run` (RPC test) | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | PAY-15 | unit | `pnpm test:unit -- --run` (webhook idempotency test) | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | PAY-10 | unit | `pnpm test:unit -- --run` (metadata validation test) | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | PAY-11 | manual | Migration verification (backfill check) | N/A | ⬜ pending |
| 02-02-01 | 02 | 1 | PAY-14 | unit | `pnpm test:unit -- --run` (portion calculation test) | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | PAY-08 | unit | `pnpm test:unit -- --run` (idempotency key test) | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | PAY-13 | unit | `pnpm test:unit -- --run` (retry logic test) | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | PAY-21 | unit | `pnpm test:unit -- --run` (redirect URL test) | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | PAY-07,PAY-16 | unit | `pnpm test:unit -- --run` (payment method hooks test) | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | PAY-09 | unit | `pnpm test:unit -- --run` (subscription status hook test) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Edge Function unit test helpers — mock Stripe, Supabase client for webhook/checkout/autopay tests
- [ ] `src/components/payments/__tests__/payment-utils.test.ts` — formatCurrency dollar-only tests
- [ ] Portion calculation helper test stubs (responsibility_percentage math)
- [ ] Payment method hook test stubs (atomic set-default, last-method guard)
- [ ] Subscription status hook test stubs

*Note: Full Edge Function test infrastructure is Phase 9 (TEST-04). Phase 2 adds lightweight validation tests only for the specific behaviors being fixed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| rent_due.amount column is numeric(10,2) | PAY-06 | Schema migration verification | Run migration, check column type via `\d rent_due` |
| onboarding_completed_at backfill | PAY-11 | One-time data migration | Verify count of backfilled rows matches expected |
| Stripe SDK upgrade doesn't break webhooks | PAY-19 | Requires live Stripe test events | Send test webhook via Stripe CLI after upgrade |
| Stripe sync engine operational | PAY-09 | Requires live Stripe data flow | Check stripe.subscriptions last_synced_at after fix |

*All other behaviors have automated verification via unit tests.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
