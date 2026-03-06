---
phase: 9
slug: testing-ci-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + Playwright 1.58.2 + Deno test |
| **Config file** | `vitest.config.ts`, `tests/e2e/playwright.config.ts` |
| **Quick run command** | `pnpm typecheck && pnpm test:unit` |
| **Full suite command** | `pnpm typecheck && pnpm test:unit && pnpm test:integration` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm test:unit`
- **After every plan wave:** Run `pnpm typecheck && pnpm test:unit && pnpm test:integration`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | TEST-01 | manual verify | `pnpm build` | N/A (CI config) | ⬜ pending |
| 09-01-02 | 01 | 1 | TEST-10 | manual verify | `gitleaks protect --staged` | N/A (config) | ⬜ pending |
| 09-01-03 | 01 | 1 | TEST-11 | manual verify | Check rls-security-tests.yml | N/A (CI config) | ⬜ pending |
| 09-01-04 | 01 | 1 | TEST-12 | manual verify | Check ci-cd.yml | N/A (CI config) | ⬜ pending |
| 09-01-05 | 01 | 1 | TEST-18 | N/A | Already done | ✅ | ✅ green |
| 09-02-01 | 02 | 1 | TEST-16 | typecheck | `pnpm typecheck` | N/A (tsconfig) | ⬜ pending |
| 09-02-02 | 02 | 1 | TEST-17 | typecheck | `pnpm typecheck` | N/A (tsconfig) | ⬜ pending |
| 09-02-03 | 02 | 1 | TEST-19 | typecheck | `pnpm typecheck` | N/A (tsconfig) | ⬜ pending |
| 09-03-01 | 03 | 1 | TEST-03 | manual verify | `npx playwright test --config tests/e2e/playwright.config.ts` | exists, needs fix | ⬜ pending |
| 09-03-02 | 03 | 1 | TEST-20 | manual verify | review configs | exists, needs fix | ⬜ pending |
| 09-03-03 | 03 | 1 | TEST-21 | file check | `test -f tests/e2e/.env.test.example` | Wave 0 | ⬜ pending |
| 09-04-01 | 04 | 2 | TEST-04 | deno test | `deno test --allow-all supabase/functions/tests/` | Wave 0 | ⬜ pending |
| 09-05-01 | 05 | 2 | TEST-05 | unit | `pnpm test:unit -- --run src/shared/validation/` | Wave 0 | ⬜ pending |
| 09-05-02 | 05 | 2 | TEST-06 | unit | `pnpm test:unit -- --run src/shared/utils/` | Wave 0 | ⬜ pending |
| 09-05-03 | 05 | 2 | TEST-13 | unit | `pnpm test:unit -- --run src/app/api/` | Wave 0 | ⬜ pending |
| 09-05-04 | 05 | 2 | TEST-14 | unit | `pnpm test:unit -- --run src/lib/supabase/` | Wave 0 | ⬜ pending |
| 09-05-05 | 05 | 2 | TEST-15 | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-upload-step.test.tsx` | exists | ⬜ pending |
| 09-06-01 | 06 | 2 | TEST-07 | integration | `pnpm test:integration` | Wave 0 | ⬜ pending |
| 09-06-02 | 06 | 2 | TEST-08 | integration | `pnpm test:integration` | Wave 0 | ⬜ pending |
| 09-06-03 | 06 | 2 | TEST-09 | integration | `pnpm test:integration` | Wave 0 | ⬜ pending |
| 09-07-01 | 07 | 3 | TEST-02 | unit coverage | `pnpm test:unit -- --coverage` | vitest.config.ts | ⬜ pending |
| 09-07-02 | 07 | 3 | DOC-01 | manual verify | review CLAUDE.md | exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/tests/` directory — Edge Function test stubs for TEST-04
- [ ] `src/shared/validation/__tests__/` directory — validation schema test stubs for TEST-05
- [ ] `src/shared/utils/__tests__/` directory — utility function test stubs for TEST-06
- [ ] `tests/integration/rls/rent-payments.rls.test.ts` — RLS test stub for TEST-07
- [ ] `tests/integration/rls/payment-methods.rls.test.ts` — RLS test stub for TEST-07
- [ ] `tests/integration/rls/notifications.rls.test.ts` — RLS test stub for TEST-08
- [ ] `tests/integration/rls/notification-settings.rls.test.ts` — RLS test stub for TEST-08
- [ ] `tests/integration/rls/subscriptions.rls.test.ts` — RLS test stub for TEST-08
- [ ] `tests/integration/rls/tenant-invitations.rls.test.ts` — RLS test stub for TEST-08
- [ ] `tests/integration/rls/tenant-isolation.rls.test.ts` — tenant-role test stub for TEST-09
- [ ] `tests/e2e/.env.test.example` — template file for TEST-21

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI runs next build | TEST-01 | CI workflow change | Push PR, verify `next build` step runs and would fail on errors |
| gitleaks in pre-commit | TEST-10 | Local hook config | Stage a file with fake secret pattern, verify gitleaks blocks commit |
| RLS on every PR | TEST-11 | CI workflow change | Push PR without migration changes, verify RLS tests still trigger |
| E2E smoke in CI | TEST-12 | CI workflow change | Merge to main, verify smoke E2E tests run |
| RLS not in pre-commit | TEST-18 | Already complete | Verify lefthook.yml has rls-tests in pre-push only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
