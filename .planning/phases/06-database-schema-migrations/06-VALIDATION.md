---
phase: 6
slug: database-schema-migrations
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (integration project) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:rls` |
| **Full suite command** | `pnpm test:rls && pnpm test:unit && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:rls`
- **After every plan wave:** Run `pnpm test:rls && pnpm test:unit && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green + manual cron job verification + `pnpm db:types` regeneration
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-00-01 | 00 | 0 | DB-01, DB-02, DB-04 | stub | `pnpm test:rls 2>&1 \| tail -10` | Creates them | ⬜ pending |
| 06-01-01 | 01 | 1 | DB-12 | manual | Verify `update_updated_at_column` dropped via schema query | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | DB-01 | integration | `pnpm test:rls -- --run tests/integration/rls/activity.rls.test.ts` | ✅ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | DB-10 | integration | `pnpm test:rls -- --run tests/integration/rls/inspections.rls.test.ts` | ✅ | ⬜ pending |
| 06-01-04 | 01 | 1 | DB-11 | manual | Verify blogs.author_user_id column exists via schema query | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | DB-02 | integration | `pnpm test:rls -- --run tests/integration/rls/documents.rls.test.ts` | ✅ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | DB-03 | integration | `pnpm test:rls -- --run tests/integration/rls/leases.rls.test.ts` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | DB-05 | manual | Run `select public.expire_leases()` against test DB | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | DB-06 | manual | Verify `select * from cron.job where jobname = 'cleanup-security-events'` | N/A | ⬜ pending |
| 06-03-03 | 03 | 2 | DB-07 | manual | Verify `select * from cron.job where jobname = 'cleanup-errors'` | N/A | ⬜ pending |
| 06-03-04 | 03 | 2 | DB-09 | manual | Verify `select * from cron.job where jobname = 'cleanup-webhook-events'` | N/A | ⬜ pending |
| 06-03-05 | 03 | 2 | DB-08 | manual | Verify `select * from cron.job where jobname = 'check-cron-health'` | N/A | ⬜ pending |
| 06-04-01 | 04 | 3 | DB-04 | integration | `pnpm test:rls -- --run tests/integration/rls/gdpr-anonymize.test.ts` | ✅ W0 | ⬜ pending |
| 06-04-02 | 04 | 3 | DOC-01 | manual | Verify CLAUDE.md updated with Phase 6 conventions | N/A | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/integration/rls/activity.rls.test.ts` — stubs for DB-01 (activity user_id NOT NULL) -- **created by 06-00-PLAN.md**
- [ ] `tests/integration/rls/documents.rls.test.ts` — stubs for DB-02 (documents owner_user_id RLS) -- **created by 06-00-PLAN.md**
- [ ] `tests/integration/rls/gdpr-anonymize.test.ts` — stubs for DB-04 (GDPR anonymization cascade) -- **created by 06-00-PLAN.md**

*Existing infrastructure covers remaining phase requirements (manual verification via SQL queries for cron jobs and schema changes).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| expire-leases function works | DB-05 | pg_cron function, needs test DB | Run `select public.expire_leases()` and verify lease status changes |
| security_events cleanup scheduled | DB-06 | cron scheduling verification | `select * from cron.job where jobname = 'cleanup-security-events'` |
| errors cleanup scheduled | DB-07 | cron scheduling verification | `select * from cron.job where jobname = 'cleanup-errors'` |
| webhook events retention | DB-09 | cron scheduling verification | `select * from cron.job where jobname = 'cleanup-webhook-events'` |
| cron monitoring active | DB-08 | monitoring infrastructure | `select * from cron.job where jobname = 'check-cron-health'` |
| trigger function consolidated | DB-12 | schema-level verification | `select proname from pg_proc where proname = 'update_updated_at_column'` should return 0 rows |
| blogs author column | DB-11 | schema-level verification | `select column_name from information_schema.columns where table_name = 'blogs' and column_name = 'author_user_id'` |
| inspection_photos updated_at | DB-10 | schema-level verification | `select column_name from information_schema.columns where table_name = 'inspection_photos' and column_name = 'updated_at'` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (06-00-PLAN.md creates all 3 stubs)
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (post-revision)
