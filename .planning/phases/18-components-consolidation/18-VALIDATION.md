---
phase: 18
slug: components-consolidation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-08
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 with jsdom |
| **Config file** | `vitest.config.ts` (workspace with unit/component/integration projects) |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | CLEAN-02 | typecheck | `pnpm typecheck` | Existing | pending |
| 18-01-02 | 01 | 1 | CLEAN-02 | unit | `pnpm test:unit` | Existing (1,415 tests) | pending |
| 18-02-01 | 02 | 1 | CLEAN-02 | typecheck | `pnpm typecheck` | Existing | pending |
| 18-02-02 | 02 | 1 | CLEAN-02 | unit | `pnpm test:unit` | Existing | pending |
| 18-03-01 | 03 | 2 | MOD-01 | typecheck+lint | `pnpm typecheck && pnpm lint` | Existing | pending |
| 18-03-02 | 03 | 2 | MOD-01 | unit | `pnpm test:unit` | Existing | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) catches broken imports after splits
- 1,415 unit tests verify component behavior after splits and memo removal
- ESLint with `eslint-plugin-react-hooks@^7.0.1` validates Rules of React for compiler compatibility

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| tour.tsx opted out with 'use no memo' | MOD-01 | Directive presence is a static check | Verify 'use no memo' appears after 'use client' in tour.tsx |
| React Compiler badge in DevTools | MOD-01 | Runtime browser check | Open app in Chrome, verify components show compiler badge in React DevTools |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-08
