---
phase: 17
slug: hooks-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test:unit -- --run src/hooks/` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~16 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run src/hooks/`
- **After every plan wave:** Run `pnpm test:unit && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 16 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | MOD-02 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/` | Existing | pending |
| 17-02-01 | 02 | 1 | MOD-05 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/` | Needs updates | pending |
| 17-03-01 | 03 | 2 | MOD-04 | typecheck | `pnpm typecheck` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The 11 hook test files in `src/hooks/api/__tests__/` will need import path updates when files are split, but no new test infrastructure is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ownerDashboardKeys invalidation intact | SC-4 | Cross-domain side effects | Grep all invalidation sites, verify same count before/after |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 16s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
