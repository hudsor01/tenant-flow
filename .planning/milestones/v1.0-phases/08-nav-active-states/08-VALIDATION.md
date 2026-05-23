---
phase: 8
slug: nav-active-states
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note:** All three production fixes (CONS-02 Multi-Property Dashboard
> icon, CONS-03 homepage active-nav state, CONS-11 Resources dropdown dead link) are
> ALREADY SHIPPED in `HEAD` (commit `7540ebe48`, verified in 08-RESEARCH.md and
> re-verified at plan time against live source). Phase 8's work is writing the
> regression-pinning test files themselves — the test files ARE the deliverable, not a
> separate Wave 0 prerequisite. Each task creates its own test file and verifies via
> that file. There is no production-code change to gate.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom |
| **Config file** | `vitest.config.ts` (existing — no install needed) |
| **Quick run command** | `bun run test:unit -- --run <new test file>` |
| **Full suite command** | `bun run test:unit` |
| **Estimated runtime** | ~3-5s (quick) / ~14s (full) |

---

## Sampling Rate

- **After every task commit:** Run the per-task `<automated>` command (the single test file the task created)
- **After every plan wave:** Run `bun run validate:quick` (typecheck + lint + unit tests)
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 5 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 (Task 1) | 01 | 1 | CONS-02 | T-08-01 (accept) | N/A — static marketing UI, no threat surface | unit (render + lucide-icon assertion) | `bun run test:unit -- --run src/components/sections/__tests__/features-section.test.tsx` | ❌ task creates it | ⬜ pending |
| 8-01-02 (Task 2) | 01 | 1 | CONS-03 | T-08-01 (accept) | N/A — static marketing UI, no threat surface | unit (props-driven render + aria-current assertion) | `bun run test:unit -- --run src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` | ❌ task creates it | ⬜ pending |
| 8-01-03 (Task 3) | 01 | 1 | CONS-11 | T-08-01 (accept) | N/A — static nav config, no threat surface | unit (config assertion — no placeholder href) | `bun run test:unit -- --run src/components/layout/navbar/__tests__/types.test.ts` | ❌ task creates it | ⬜ pending |

All three tasks live in plan `08-01-PLAN.md`, wave 1, autonomous, zero `files_modified`
overlap (3 new files in 3 distinct directories). Each task creates its own test file and
verifies through it — the test file IS the deliverable. Every task has an `<automated>`
verify command; no 3-consecutive-task gap; feedback latency < 5s per task.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 phase. Phase 8's deliverable IS the test infrastructure — each task creates its own test file as the task body and verifies through it. Vitest 4 + jsdom + Testing Library already exist; nothing to install.

Test files created by this phase:
- [ ] `src/components/sections/__tests__/features-section.test.tsx` — CONS-02 (Multi-Property Dashboard card renders `LayoutDashboard`, not a back-arrow)
- [ ] `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` — CONS-03 (on `pathname="/"` no nav item, incl. Compare, has `aria-current="page"`; positive on `/compare`)
- [ ] `src/components/layout/navbar/__tests__/types.test.ts` — CONS-11 (`DEFAULT_NAV_ITEMS` has no `#`/placeholder href; Resources → `/resources`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resources dropdown items navigate + keyboard-activate correctly in a real browser | CONS-11 | jsdom asserts the href values; real navigation + focus behavior is a runtime check | On `/`, open the Resources dropdown, Tab to each item, press Enter — each must navigate to a real page |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — each of the 3 tasks has a `--run` single-file command
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — all 3 tasks verify
- [x] Wave 0 covers all MISSING references — no MISSING refs; each task creates + verifies its own test file
- [x] No watch-mode flags — all commands use `--run`
- [x] Feedback latency < 5s — single-file Vitest runs are ~3-5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-05-20 (plan 08-01-PLAN.md)
