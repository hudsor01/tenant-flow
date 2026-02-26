---
phase: 59
slug: stripe-rent-checkout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-02-26
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend unit), pgTAP (database) |
| **Config file** | `apps/frontend/vitest.config.ts`, `supabase/tests/` |
| **Quick run command** | `pnpm --filter @repo/frontend test:unit -- --run src/hooks/api/__tests__/use-payments.test.tsx` |
| **Full suite command** | `pnpm validate:quick` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 1 | PAY-01, PAY-02 | typecheck | `pnpm typecheck` | N/A | pending |
| 59-02-01 | 02 | 1 | PAY-01 | typecheck + unit | `pnpm typecheck && pnpm --filter @repo/frontend test:unit -- --run` | existing | pending |
| 59-03-01 | 03 | 2 | PAY-01, PAY-02 | integration | Manual Stripe Checkout test mode | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- Vitest is configured for frontend unit tests
- pgTAP is configured for database tests
- Typecheck covers type safety across shared types

*No Wave 0 needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect | PAY-01 | Requires live Stripe test mode session | 1. Sign in as tenant 2. Click "Pay Rent" 3. Verify Stripe Checkout loads 4. Complete with test card 4242... 5. Verify redirect back with success toast |
| Destination charge fee split | PAY-02 | Requires Stripe Dashboard verification | 1. After payment succeeds 2. Check Stripe Dashboard for connected account 3. Verify application_fee amount on PaymentIntent |
| charges_enabled guard | PAY-01 | Requires Stripe account state manipulation | 1. Use owner with incomplete onboarding 2. Verify tenant sees clear error instead of "Pay Rent" button |
| Webhook creates rent_payments | PAY-01 | Requires Stripe webhook delivery | 1. After Stripe Checkout completes 2. Check rent_payments table for new row with status=succeeded |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
