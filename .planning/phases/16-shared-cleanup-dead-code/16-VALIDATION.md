---
phase: 16
slug: shared-cleanup-dead-code
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 with jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm validate:quick` (typecheck + lint + unit tests) |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck` (catches broken imports immediately)
- **After every plan wave:** Run `pnpm validate:quick` (typecheck + lint + unit tests)
- **Before `/gsd:verify-work`:** Full suite must be green + `npx knip` zero findings
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | CLEAN-01 | smoke | `npx knip` (zero exit) | Wave 0 (knip.json) | pending |
| 16-02-01 | 02 | 1 | CLEAN-04 | smoke | `test ! -d src/shared` | N/A | pending |
| 16-02-02 | 02 | 1 | CLEAN-05 | unit | `pnpm typecheck && pnpm test:unit` | Existing | pending |
| 16-03-01 | 03 | 2 | MOD-03 | unit | `pnpm typecheck` | Existing | pending |
| 16-04-01 | 04 | 2 | CLEAN-03 | manual | Verify TYPES.md deleted + CLAUDE.md updated | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `knip.json` — Knip configuration file (install knip + create config with entry points, plugins, ignore patterns)
- [ ] Verify `src/types/stripe.ts` vs `src/shared/types/stripe.ts` content collision before moving

*Existing infrastructure covers most phase requirements. Only Knip setup is new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TYPES.md deleted | CLEAN-03 | File deletion verification | Confirm `src/shared/types/TYPES.md` no longer exists |
| CLAUDE.md updated | Post-phase | Content accuracy check | Review updated sections match new directory structure |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
