---
phase: 6
slug: polish-a11y
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed per-task map is finalized during planning (see `06-RESEARCH.md` § Validation Architecture).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom (unit); Playwright (E2E) |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` |
| **Quick run command** | `bun run test:unit -- --run <file>` |
| **Full suite command** | `bun run validate:quick` (typecheck + lint + unit) |
| **E2E command** | `bun run test:e2e` (Playwright; axe a11y assertion lands in the `owner` project) |
| **Estimated runtime** | unit ~seconds/file; full validate:quick ~1-2 min; E2E ~minutes |

---

## Sampling Rate

- **After every task commit:** Run `bun run test:unit -- --run <touched test file>`
- **After every plan wave:** Run `bun run validate:quick`
- **Before `/gsd:verify-work`:** Full `validate:quick` green + the new `/dashboard` axe E2E green
- **Max feedback latency:** ~120 seconds (validate:quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(scaffold — planner fills concrete task IDs)_ | — | — | POLISH-04..08 | — | N/A (no auth/data-flow change) | unit / e2e | per task | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Populated by the planner per PLAN.md task; each POLISH-0x requirement maps to at least one automated assertion below.*

**Requirement → primary automated assertion (from RESEARCH § Validation Architecture):**
- **POLISH-04** (dark-mode / no ad-hoc palette badges) → unit assertions that `lease-status-badge` + audited components reference `status-*` utilities / tokens, not raw `bg-emerald-*`/`text-red-600`/`text-amber-*`/`text-green-600`; `design-token-drift.test.ts` stays green.
- **POLISH-05** (keyboard a11y) → `/dashboard` axe-core E2E assertion (focus-order, name-role-value, aria-label on icon buttons); skip-to-content target assertion.
- **POLISH-06** (375px) → Playwright 375px viewport probe asserts `document.scrollWidth <= clientWidth` (zero horizontal scroll) + grid view forced.
- **POLISH-07** (skeleton ↔ empty exclusivity) → unit/render assertion that no component renders skeleton AND empty-state simultaneously.
- **POLISH-08** (reduced-motion) → unit test mocking `matchMedia(prefers-reduced-motion: reduce)` asserting `NumberTicker` snaps to final value (no rAF), and `BlurFade`/chart `isAnimationActive` honor the guard.

---

## Wave 0 Requirements

- [ ] Install **`@axe-core/playwright`** in the **root** `package.json` (RESEARCH finding: it's declared in `tests/e2e/package.json` but not installed; CI runs E2E from root) — required before the POLISH-05 axe E2E can run.
- [ ] Wire the authed **`owner`** Playwright project into the CI E2E invocation (CI default runs `--project=smoke --project=public` only) so the new `/dashboard` axe test actually executes in CI.
- [ ] `matchMedia` mock helper for the reduced-motion unit branch (jsdom has no `matchMedia` — verify/extend the existing test setup).

*Otherwise existing infrastructure (Vitest + Playwright) covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Light/dark visual sweep — no white-on-white, no invisible badges | POLISH-04 | Visual contrast judgment beyond axe's automated contrast checks; screenshot-diff explicitly out of scope (D-02) | Toggle theme on `/dashboard` (seeded account), scan every region in both modes |
| Focus-ring visibility feel | POLISH-05 | axe verifies presence/role, not the visual prominence of the ring | Tab through `/dashboard`; confirm `--color-ring` ring is visibly rendered on each interactive element in both modes |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (axe install + CI wiring + matchMedia mock)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
