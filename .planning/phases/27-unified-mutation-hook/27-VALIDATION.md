---
phase: 27
slug: unified-mutation-hook
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 with jsdom |
| **Config file** | `vitest.config.ts` (project: unit) |
| **Quick run command** | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~30 seconds (single file), ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | INV-05 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | INV-01 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | INV-02 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-04 | 01 | 1 | INV-04 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-05 | 01 | 1 | INV-03 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-create-invitation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/api/__tests__/use-create-invitation.test.ts` — stubs for INV-01 through INV-05
- [ ] Update existing `src/hooks/api/__tests__/use-tenant.test.tsx` — fix wrong URL in test mock, remove/redirect tests for deleted `useInviteTenantMutation`

*Existing infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email received with correct accept URL | INV-05 | Requires live Edge Function + Resend | Create invitation in dev, check email link points to `/accept-invite?code=...` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
