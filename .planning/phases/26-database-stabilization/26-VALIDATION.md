---
phase: 26
slug: database-stabilization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | DB-01 | unit | `pnpm test:unit -- --run src/components/tenants/invite-tenant-form.test.ts` | Needs verification | ⬜ pending |
| 26-01-02 | 01 | 1 | DB-02 | integration (RLS) | `pnpm test:integration -- --run tests/integration/rls/tenant-invitations.rls.test.ts` | Yes (existing, partial) | ⬜ pending |
| 26-01-03 | 01 | 1 | DB-03 | manual-only | Direct PostgREST insert of duplicate `(email, owner_user_id)` | N/A (DB constraint) | ⬜ pending |
| 26-01-04 | 01 | 1 | DB-04 | unit | `pnpm test:unit -- --run src/components/tenants/invite-tenant-form.test.ts` | Needs verification | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

- Existing `tenant-invitations.rls.test.ts` covers SELECT isolation but not INSERT/UPDATE/DELETE
- No unit test currently verifies the `type` value in invitation insert payload
- DB-03 (unique index) is a database-level constraint -- verification is via migration + manual testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Duplicate active invitation rejected | DB-03 | Database constraint not testable via unit tests | Insert two invitations with same (email, owner_user_id) and status 'pending' via PostgREST; second should fail |
| RLS policies use correct column | DB-02 | Requires live DB with auth context | Authenticate as owner, insert into tenant_invitations, verify success |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
