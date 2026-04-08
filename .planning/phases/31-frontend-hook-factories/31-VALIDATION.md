---
phase: 31
slug: frontend-hook-factories
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit -- --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | FRONT-02 | unit | `pnpm test:unit -- --run src/hooks/use-entity-detail.test.ts` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | FRONT-03 | unit | `pnpm test:unit -- --run src/hooks/create-mutation-callbacks.test.ts` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | FRONT-02 | unit | `pnpm test:unit -- --run` | ✅ | ⬜ pending |
| 31-02-01 | 02 | 2 | FRONT-02, FRONT-03 | unit | `pnpm test:unit -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/use-entity-detail.test.ts` — unit tests for useEntityDetail factory
- [ ] `src/hooks/create-mutation-callbacks.test.ts` — unit tests for createMutationCallbacks factory

*Existing test infrastructure (vitest 4.1.2, 1499 passing tests) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 300-line limit | FRONT-02, FRONT-03 | Line count not testable via unit tests | `wc -l src/hooks/api/use-*.ts` — verify no file exceeds 300 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
