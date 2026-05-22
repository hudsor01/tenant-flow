---
phase: 11
slug: token-alignment
status: shipped
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
shipped: 2026-05-21
shipped_pr: 740
status_update_note: "wave_0_complete + status updated 2026-05-22 during Phase 15 milestone audit round-2 polish — phase shipped via PR #740 with 8/8 must-haves verified (11-VERIFICATION.md)."
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note (from 11-RESEARCH.md):** TOKEN-01 and the `/resources` part
> of TOKEN-02 are ALREADY SHIPPED (the page was rebuilt with canonical tokens) —
> verify-and-pin. The site-wide hex/`rgb`/`bg-white` audit found ZERO drift (all
> hex are D-03 legitimate exceptions; `bg-white` appears once — the 2FA QR-code
> container, a genuine exception). The ONLY real production work is ~19 inline
> `[NNN]ms` Tailwind durations in decorative loading components → snap to
> `--duration-*` tokens. TOKEN-03 = a new `design-token-drift.test.ts` drift-guard
> + `11-LINT-RULE.md` (NOT ESLint — the repo lints with Biome).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom |
| **Config file** | `vitest.config.ts` (existing — no install needed) |
| **Quick run command** | `bunx vitest --run --project unit <file>` |
| **Full suite command** | `bun run test:unit` |
| **Estimated runtime** | ~3-6s (quick) / ~14s (full) |

---

## Sampling Rate

- **After every task commit:** Run the per-task `<automated>` command
- **After every plan wave:** Run `bun run validate:quick` (typecheck + lint + unit tests)
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 6 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 11-01-T1 | 11-01 | 1 | TOKEN-02 | grep assertion | `grep -nE '"[0-9]+ms"\|\[animation-(delay\|duration):[0-9]+ms\]' src/components/ui/grid-pattern.tsx src/components/ui/loading-spinner.tsx \| grep -v '0ms'` (expect no non-zero matches) | ⬜ pending |
| 11-01-T2 | 11-01 | 1 | TOKEN-02 | grep assertion | `grep -nE '"[1-9][0-9]*ms"' src/components/shared/chart-loading-skeleton.tsx src/components/shared/blog-loading-skeleton.tsx src/components/shared/blog-empty-state.tsx` (expect no matches) | ⬜ pending |
| 11-01-T3 | 11-01 | 1 | TOKEN-01, TOKEN-02 | unit (regression pin) | `bunx vitest --run --project unit src/app/resources/page.test.tsx` | ⬜ pending |
| 11-02-T1 | 11-02 | 2 | TOKEN-02, TOKEN-03 | unit (drift guard + meta-test) | `bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts` | ⬜ pending |
| 11-02-T2 | 11-02 | 2 | TOKEN-03 | file + grep assertion | `test -f .planning/phases/11-token-alignment/11-LINT-RULE.md && grep -q Vitest .planning/phases/11-token-alignment/11-LINT-RULE.md` | ⬜ pending |

**Coverage:** TOKEN-01 (11-01-T3), TOKEN-02 (11-01-T1/T2/T3 + 11-02-T1), TOKEN-03 (11-02-T1/T2). No 3 consecutive tasks without an automated verify. Max feedback latency < 6s. No watch-mode flags.

---

## Wave 0 Requirements

No separate Wave 0 phase. Vitest 4 + jsdom already configured; nothing to install.

- TOKEN-01 — `/resources` download tags already tokenized → regression-pin test (11-01-T3).
- TOKEN-02 — production edit: ~19 inline `[NNN]ms` durations → `--duration-*` tokens (11-01-T1/T2); the
  site-wide hex/`rgb`/`bg-white` audit is otherwise clean (verified by the new drift-guard test, 11-02-T1).
- TOKEN-03 — NEW `design-token-drift.test.ts` (scans `src/components/**` + `src/app/**` for
  hex/`rgb(`/`bg-white`/`[NNN]ms` outside the D-03 allowlist) + `11-LINT-RULE.md` documenting it (11-02).

> Wave ordering note: 11-02-T1's drift-guard test goes RED until Plan 11-01's inline-ms fixes land, then
> GREEN — the correct red→green signal. This is why 11-02 is wave 2, `depends_on: [11-01]`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Loading skeletons/spinners still animate smoothly after the inline-ms → token swap | TOKEN-02 | Animation timing is a runtime visual check | View a route with a loading skeleton (e.g. `/blog`, a chart) — staggered fade still looks smooth |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 6s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-05-21
