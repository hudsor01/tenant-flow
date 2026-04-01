---
phase: 28
slug: consumer-migration-dead-code-removal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | UI-01 | unit | `pnpm test:unit -- --run src/components/tenants/invite-tenant-form.test.tsx` | ✅ | ⬜ pending |
| 28-01-02 | 01 | 1 | UI-02 | unit | `pnpm test:unit -- --run src/components/onboarding/onboarding-step-tenant.test.tsx` | ✅ | ⬜ pending |
| 28-01-03 | 01 | 1 | UI-03 | unit | `pnpm test:unit -- --run src/components/leases/wizard/selection-step-filters.test.tsx` | ✅ | ⬜ pending |
| 28-02-01 | 02 | 2 | UI-05 | unit | `pnpm test:unit -- --run src/components/tenants/tenants.test.tsx` | ❌ W0 | ⬜ pending |
| 28-02-02 | 02 | 2 | UI-06 | unit | `pnpm test:unit -- --run src/components/tenants/tenants.test.tsx` | ❌ W0 | ⬜ pending |
| 28-03-01 | 03 | 1 | UI-07 | unit | `pnpm test:unit -- --run src/app/(auth)/accept-invite/accept-invite.test.tsx` | ❌ W0 | ⬜ pending |
| 28-04-01 | 01 | 1 | UI-04 | grep | `grep -r "InviteTenantModal\|isInviteModalOpen\|InviteTenantData" src/` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Test files for consumer components already exist. Accept-invite test may need creation as part of the accept flow plan.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Copy invitation link to clipboard | UI-06 | Clipboard API requires browser context | Click copy link action on pending invitation row, paste to verify URL |
| Login redirect preserves invite code | UI-07 | Full auth flow requires E2E | Click "Log in to accept" link, verify redirect back to accept-invite with code param |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
