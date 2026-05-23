---
phase: 15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea
phase_number: 15
generated: 2026-05-22  # written during Phase 15 milestone audit round-2 polish
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
source: derived from `15-CONTEXT.md` D-01..D-23 + `15-VERIFICATION.md` (status: passed)
shipped_pr: 743
requirements: []  # cleanup phase, no new REQ-IDs
---

# Phase 15 Validation Strategy

Validation contract for the 5 cleanup items shipped by Phase 15. The phase deliverable is overwhelmingly documentation (retro-VERs + traceability sweep) plus 3 small source-code files (Stripe drift guard, vitest pool config, /blog nav suppression regression-pin). All source-code changes carry regression-pin tests.

## Test Framework Inventory

| Layer | Framework | Quick command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `bunx vitest --run --project unit` |
| Type | TypeScript strict | `bunx tsc --noEmit` |
| Lint | Biome | `bunx biome check` |

## Phase Plans → Test Map

### 15-01: Retroactive VERIFICATION.md for Phases 4/5/6/14

| Test | Type | Asserts |
|------|------|---------|
| File presence | shell | `ls .planning/phases/{04,05,06,14}-*/[0-9]*-VERIFICATION.md` returns 4 files; each has `retroactive: true` + `shipped_pr: <N>` in frontmatter |
| SUMMARY cross-refs | manual + grep | `04-01-SUMMARY.md` + `04-02-SUMMARY.md` + `06-01-SUMMARY.md` each cite the sibling VERIFICATION + shipped PR + regression test path |

### 15-02: REQUIREMENTS.md traceability sweep

| Test | Type | Asserts |
|------|------|---------|
| `grep -c "\| Pending \|" .planning/REQUIREMENTS.md` | shell | returns 0 |
| `grep -c "^- \[ \]" .planning/REQUIREMENTS.md` | shell | returns 0 |
| `grep "Last updated: 2026-05-21" .planning/REQUIREMENTS.md` | shell | returns 1 (Phase 15 sweep stamp present) |

### 15-03: `@stripe/(react-)?stripe-js` drift guard

| Test | Type | Asserts |
|------|------|---------|
| `src/lib/__tests__/no-stripe-js-deps.test.ts` | Vitest source-scan | 8 tests (2 packages × 4 dependency roots: `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) all pass — neither package can re-enter `package.json` without breaking the suite |

### 15-04: Vitest pool/poolOptions tuning

| Test | Type | Asserts |
|------|------|---------|
| Full unit suite | Vitest | `bunx vitest --run --project unit` completes 0 failures across 3 consecutive runs (zero-flake gate per D-11) |
| `vitest.config.ts` source | grep | `UNIT_MAX_WORKERS` derived from `Math.max(2, Math.min(8, cpus().length - 1))`; `maxWorkers: UNIT_MAX_WORKERS` on `unit` project; inline comment references Phase 15-04 |
| Per D-12 | (negative) | NO drift-guard test for the pool config itself (explicitly rejected as paranoia) |

### 15-05: `/blog` nav suppression regression-pin

| Test | Type | Asserts |
|------|------|---------|
| `src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts` | Vitest source-scan | 3 tests: top-level entries + dropdown items have no `href === '/blog'`; bidirectional 6-permutation regex pins `AUDIT-2` + `deferr` + `/blog` co-occurrence in `types.ts` within a 400-char window |
| `src/components/layout/navbar/__tests__/nav-blog-suppression-render.test.tsx` | Vitest render (jsdom) | 2 tests: mounts `<NavbarDesktopNav>` + `<NavbarMobileMenu>` with `DEFAULT_NAV_ITEMS`, fires `mouseEnter` (desktop) / clicks chevron (mobile) to open every dropdown owner, asserts `allLinks.length > DEFAULT_NAV_ITEMS.length` (positive sanity) + no `href='/blog'` in any rendered anchor |

## Nyquist coverage

All 5 plans carry runtime regression coverage (Stripe drift, /blog source + render, vitest pool baseline). Documentation plans (15-01, 15-02) are validated by file-presence shell assertions called out in the plan's own `must_haves.truths`. No SC ships without an automated guard.
