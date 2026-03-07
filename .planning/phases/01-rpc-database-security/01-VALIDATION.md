---
phase: 1
slug: rpc-database-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (integration project) |
| **Config file** | `vitest.config.ts` (integration project section) |
| **Quick run command** | `pnpm test:integration -- --run tests/integration/rls/` |
| **Full suite command** | `pnpm test:rls` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:integration -- --run tests/integration/rls/`
- **After every plan wave:** Run `pnpm test:rls && pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | SEC-01 | integration | `pnpm test:integration -- --run tests/integration/rls/rpc-auth.test.ts` | W0 | pending |
| 01-01-02 | 01 | 1 | SEC-02 | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | W0 | pending |
| 01-01-03 | 01 | 1 | SEC-03 | integration | `pnpm test:integration -- --run tests/integration/rls/lease-rpcs.test.ts` | W0 | pending |
| 01-01-04 | 01 | 1 | SEC-04 | integration | `pnpm test:integration -- --run tests/integration/rls/lease-rpcs.test.ts` | W0 | pending |
| 01-02-01 | 02 | 1 | SEC-05 | manual | Migration review | manual-only | pending |
| 01-02-02 | 02 | 1 | SEC-06 | integration | `pnpm test:integration -- --run tests/integration/rls/for-all-audit.test.ts` | W0 | pending |
| 01-02-03 | 02 | 1 | SEC-07 | manual | Already verified in migration 20251231081143 | manual-only | pending |
| 01-02-04 | 02 | 1 | SEC-08 | manual | Already verified in migration 20260224191923 | manual-only | pending |
| 01-02-05 | 02 | 1 | SEC-09 | manual | Migration review | manual-only | pending |
| 01-02-06 | 02 | 1 | SEC-10 | manual | Migration review | manual-only | pending |
| 01-02-07 | 02 | 1 | SEC-11 | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | W0 | pending |
| 01-02-08 | 02 | 1 | SEC-12 | integration | `pnpm test:integration -- --run tests/integration/rls/error-monitoring.test.ts` | W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/rls/rpc-auth.test.ts` — test all dashboard/analytics RPCs reject wrong p_user_id (SEC-01)
- [ ] `tests/integration/rls/lease-rpcs.test.ts` — test lease activation/signing auth checks (SEC-03, SEC-04)
- [ ] `tests/integration/rls/error-monitoring.test.ts` — test error RPC restrictions + rate limiting (SEC-02, SEC-11, SEC-12)
- [ ] `tests/integration/rls/for-all-audit.test.ts` — verify no FOR ALL on authenticated tables (SEC-06)
- [ ] Test infrastructure: two test users (owner A, owner B) via `getTestCredentials()`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All SECURITY DEFINER have `SET search_path` | SEC-05 | SQL syntax check, not runtime behavior | Review migration, verify `SET search_path TO 'public'` on all rewritten functions |
| security_events uses text not ENUM | SEC-07 | Already verified complete | Check migration 20251231081143 |
| get_current_owner_user_id is static SQL | SEC-08 | Already verified complete | Check migration 20260224191923 |
| health_check is SECURITY INVOKER | SEC-09 | Simple ALTER, verify via pg_proc | `SELECT prosecdef FROM pg_proc WHERE proname = 'health_check'` should be false |
| Cleanup functions have search_path | SEC-10 | Simple ALTER, verify via pg_proc | `SELECT proconfig FROM pg_proc WHERE proname IN ('cleanup_old_security_events', 'cleanup_old_errors')` |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
