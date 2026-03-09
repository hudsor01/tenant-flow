---
phase: 19
slug: ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~16 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 16 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | UI-01 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 19-01-02 | 01 | 1 | UI-01 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 19-02-01 | 02 | 1 | UI-02 | typecheck+lint+unit | `pnpm test:unit` | ✅ | ⬜ pending |
| 19-02-02 | 02 | 1 | UI-02 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 19-03-01 | 03 | 1 | UI-03 | typecheck+lint+unit | `pnpm test:unit` | ✅ | ⬜ pending |
| 19-03-02 | 03 | 1 | UI-03 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 19-04-01 | 04 | 2 | UI-04 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- Vitest + jsdom already configured
- TypeScript strict mode enforces type safety on all variant changes
- ESLint catches unused imports after variant removal
- Pre-commit hooks run full quality gate

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navbar visual polish | UI-01 | Visual appearance not testable via unit tests | Phase 20 browser audit |
| Button radius consistency | UI-02 | CVA variant values are design decisions, not logic | Phase 20 browser audit |
| Card shadow consistency | UI-03 | Shadow/spacing are visual properties | Phase 20 browser audit |
| Responsive layout at 375/768/1440px | UI-04 | Viewport rendering requires real browser | Phase 20 browser audit |

*Note: Phase 20 (Browser Audit) is specifically designed to verify Phase 19's visual changes.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 16s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
