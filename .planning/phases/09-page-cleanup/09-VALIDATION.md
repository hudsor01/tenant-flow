---
phase: 9
slug: page-cleanup
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note:** All three production fixes (CONS-04 legal-page dates, CONS-13
> Trusted Integrations logo weight, CONS-14 duplicate comparison table) are ALREADY
> SHIPPED to `main` (PR #693 / `947299f19`, verified in 09-RESEARCH.md). Phase 9 is
> verify-and-pin: CONS-04 already has the `sitemap.test.ts` drift guard; CONS-13 and
> CONS-14 have NO regression tests. The deliverable is the 2 new regression-pin test
> files. There is no production-code change to gate.

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

- **After every task commit:** Run the per-task `<automated>` command (the single test file the task created/touched)
- **After every plan wave:** Run `bun run validate:quick` (typecheck + lint + unit tests)
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 5 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 01 | 1 | CONS-04 | T-09-01 | N/A — static legal copy; no new threat surface | verify existing drift-guard | `bun run test:unit -- --run src/app/sitemap.test.ts` | ✅ exists (`sitemap.test.ts`) | ⬜ pending |
| 09-01-T2 | 01 | 1 | CONS-13 | T-09-01 | N/A — static marketing UI; build-time test only | unit (render + logo-class consistency) | `bun run test:unit -- --run src/components/sections/__tests__/logo-cloud.test.tsx` | ❌ task creates it | ⬜ pending |
| 09-01-T3 | 01 | 1 | CONS-14 | T-09-01 | N/A — static marketing UI; build-time test only | unit (source-text scan: homepage has no ComparisonTable) | `bun run test:unit -- --run src/app/__tests__/marketing-home.test.tsx` | ❌ task creates it | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist note:** every task carries an `<automated>` command. Task T1 verifies an
already-existing test file; tasks T2 + T3 create their own test file (the file IS the
deliverable — RED→GREEN is intrinsic). No task runs without an automated verify; no 3
consecutive tasks lack one. `nyquist_compliant: true`.

---

## Wave 0 Requirements

No separate Wave 0 phase. Phase 9's deliverable is regression-pin test coverage. Vitest 4 + jsdom + Testing Library already exist; nothing to install.

- CONS-04 — covered by the EXISTING `src/app/sitemap.test.ts` drift guard (legal-page `Last Updated` ↔ sitemap constant lockstep). Task T1 verifies it stays green; no new file.
- CONS-13 — Task T2 creates `src/components/sections/__tests__/logo-cloud.test.tsx`: all 5 integration logos share one wrapper class; no per-logo `grayscale`/faded variant.
- CONS-14 — Task T3 creates `src/app/__tests__/marketing-home.test.tsx`: the homepage does NOT render `ComparisonTable`; `/features` retains it.

Each MISSING test file is created by its own task within the single wave — the file IS the
deliverable, so the standard "Wave 0 scaffolds the test first" rule is satisfied intrinsically
(the task's RED→GREEN cycle writes and verifies the file).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 5 Trusted Integrations logos look equally weighted in a real browser (light + dark mode) | CONS-13 | jsdom asserts class equality; perceived visual weight across themes is a render check | Open `/`, view the logo cloud in light and dark mode — Supabase must not look faded |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (CONS-13 + CONS-14 test files are created by their own tasks; CONS-04 drift guard already exists)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-20 (via /gsd-plan-phase 9)
