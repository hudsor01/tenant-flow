---
phase: 7
slug: pricing-card-chrome
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note:** All three CONS fixes (CONS-05 badge position, CONS-09
> price-row nowrap, CONS-10 per-card savings + global-badge removal) are
> ALREADY SHIPPED in source (verified in 07-PATTERNS.md). Phase 7's work is
> writing the regression-pinning test files themselves — the test files ARE
> the deliverable, not a separate Wave 0 prerequisite. Each task creates its
> own test file and verifies via that file. There is no production-code
> change to gate.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom |
| **Config file** | `vitest.config.ts` (existing — no install needed) |
| **Quick run command** | `bun run test:unit -- --run src/components/pricing/__tests__/ src/config/__tests__/pricing.test.ts` |
| **Full suite command** | `bun run test:unit` |
| **Estimated runtime** | ~6 seconds (quick) / ~suite-dependent (full) |

---

## Sampling Rate

- **After every task commit:** Run the per-task `<automated>` command (the single test file the task created) — ~3-5s
- **After every plan wave:** Run `bun run validate:quick` (typecheck + lint + unit tests) — ~30s
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 5 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | CONS-05, CONS-09, CONS-10 | T-07-01 / — | N/A — static marketing UI, no auth/data/input boundary | unit (render + className/text assertion) | `bun run test:unit -- --run src/components/pricing/__tests__/pricing-card-featured.test.tsx` | ❌ task creates it | ⬜ pending |
| 7-02-01 | 02 | 1 | CONS-09, CONS-10 | T-07-02 / — | N/A — static marketing UI, no auth/data/input boundary | unit (render + text/className assertion) | `bun run test:unit -- --run src/components/pricing/__tests__/pricing-card-standard.test.tsx` | ❌ task creates it | ⬜ pending |
| 7-02-02 | 02 | 1 | CONS-10 | T-07-02 / — | N/A — static marketing UI, no auth/data/input boundary | unit (render absence + pure-function math) | `bun run test:unit -- --run src/components/pricing/__tests__/bento-pricing-section.test.tsx src/config/__tests__/pricing.test.ts` | ❌ task creates it | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** 3 tasks, every task has an `<automated>` verify command. No 3-consecutive-task gap. Nyquist-compliant.

---

## Wave 0 Requirements

No separate Wave 0 phase. Phase 7's deliverable IS the test infrastructure — each task creates its own test file as the task body, and verifies through it. The Vitest 4 + jsdom framework already exists (`vitest.config.ts`), `@testing-library/react` is already a dependency (used by `src/components/blog/blog-pagination.test.tsx`), so there is nothing to install.

Test files created by this phase:
- [ ] `src/components/pricing/__tests__/pricing-card-featured.test.tsx` — CONS-05 badge position + CONS-09 Featured price-row nowrap + CONS-10 Featured per-card savings ($98/year) (Plan 07-01)
- [ ] `src/components/pricing/__tests__/pricing-card-standard.test.tsx` — CONS-09 Standard price-row nowrap + CONS-10 per-card savings (Starter + Max) (Plan 07-02)
- [ ] `src/components/pricing/__tests__/bento-pricing-section.test.tsx` — CONS-10 global savings-badge removal (Plan 07-02)
- [ ] `src/config/__tests__/pricing.test.ts` — `calculateAnnualSavings` math pin: $19→$38, $49→$98, $149→$298 (Plan 07-02)

Both `src/components/pricing/__tests__/` and `src/config/__tests__/` directories are created implicitly by writing the first file into each.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Most Popular" badge sits cleanly on the Growth card top edge with no overlap of the 2px gradient ring, and is not clipped by the section's `overflow-hidden`, at 375px / 768px / 1440px | CONS-05 | Pixel-level visual containment is a layout-render fact a jsdom className assertion cannot fully prove (jsdom has no layout engine). The className pin proves the fix CLASSES are present; visual confirmation proves they RENDER correctly. | Open `/pricing` in Chrome DevTools device toolbar. Check iPhone SE 375×667, iPad 768, desktop 1440. Confirm the badge is fully visible above the Growth card, no border intersection, not cut off by the section top. |
| `$XX` + `/mo` stay on one line while the billing toggle animates monthly↔annual | CONS-09 | The `whitespace-nowrap` class is pinned by unit test, but the mid-animation width change (`formatCurrency` re-render) is a runtime visual behavior. | On `/pricing`, toggle the billing switch rapidly. The `/mo` suffix must never visibly drop to a second line on any card. |

These manual checks belong to `/gsd-verify-work`, not to plan execution — the automated className pins are the executable gate for the plans.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every task verifies via the test file it creates
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — all 3 tasks have automated verify
- [x] Wave 0 covers all MISSING references — no MISSING refs; framework exists, test files ARE the deliverable
- [x] No watch-mode flags — all commands use `--run`
- [x] Feedback latency < 5s — per-task runs a single test file (~3-5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-20
</content>
