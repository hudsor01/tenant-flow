# Phase 15: v1.0 Milestone Cleanup - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Close every gap surfaced by `/gsd-audit-milestone` for v1.0 "Marketing Surface Honesty" so the milestone can archive with truthful planning artifacts. Cleanup-only — **no new product features, no new REQ-IDs**. All 55 v1.0 reqs are already verified live by the integration checker; this phase fixes the *paperwork* and one queued tech-debt item.

Five concrete cleanup items (mirrored from `.planning/v1.0-MILESTONE-AUDIT.md`):
1. Retroactive `VERIFICATION.md` for Phases 4 / 5 / 6 / 14 (shipped via PRs #688, #689, #690, #705 + battle-test followups, but GSD never recorded the verification artifact).
2. `REQUIREMENTS.md` traceability + body-checkbox sweep (~26 entries currently "Pending" / `[ ]` despite shipping).
3. Remove `@stripe/react-stripe-js` dead peer-dep so `@stripe/stripe-js` actually leaves `pnpm-lock.yaml`.
4. Investigate + fix Vitest worker-pool flakiness (~15 unrelated test timeouts under full 105k-test parallel run; pre-existing environmental, not regression).
5. Regression-pin the deliberate `/blog` absence from `DEFAULT_NAV_ITEMS` (currently only a source comment, not test-enforced).

**Not in scope** (would be new capabilities → their own phase or future milestone):
- Auto-categorization of documents (v2.6 deferred indefinitely).
- Dashboard redesign (v2.0 milestone, plan parked at `/Users/richard/.claude/plans/i-want-to-enhance-hazy-island.md`).
- New blog content cohort / lifting `/blog` nav suppression.
- Any pricing / persona / SEO / token edits beyond the cleanup items above.

</domain>

<decisions>
## Implementation Decisions

### Retro-VERIFICATION.md depth (Phases 4/5/6/14)
- **D-01:** Use the **standard Phase 7-13 template** — full Observable Truths table, Required Artifacts table, Key Link Verification table. Cross-reference shipped PR (#688/#689/#690/#705+followups) plus the actual regression test(s) that pin each REQ-ID on `main`. Honest re-verification done now against current code; NOT pretending the original execution wrote it.
- **D-02:** Each retro-VER frontmatter MUST include `retroactive: true` and `shipped_pr: <PR#>` so the audit lineage is machine-discoverable. `status` value is `passed` (or `retroactive_passed` if the Phase 7-13 frontmatter validator rejects extending the enum — fall back to `passed` and put `retroactive: true` as a separate frontmatter field).
- **D-03:** Phase 14 is finding-driven (D-01..D-04), not REQ-driven. Its retro-VER documents the four shipped findings + the 6 battle-test followup PRs (#708/#718/#719/#720/#722/#724) as observable truths, with `requirements: []` in frontmatter (consistent with how 14's plan SUMMARYs are recorded).
- **D-04:** Missing `06-01-SUMMARY.md` and `04-01-SUMMARY.md` placeholders also written, referencing PR commits as evidence. Minimum viable SUMMARY frontmatter (phase/plan/requirements-completed only); no need to retroactively re-author full plan execution narratives.

### REQUIREMENTS.md traceability sweep
- **D-05:** Mechanical edit pass. Cross-check each REQ-ID against the audit doc's "live-code verified" list, flip body `[ ]` → `[x]`, flip traceability table `Pending` → `Complete` for the 26 entries. Then re-read the file and run a `grep -c "Pending"` sanity check expecting `0`.
- **D-06:** No script — direct file edits via Edit/Write. Faster and lower-risk than writing+running a one-shot script for ~26 changes. Each individual flip is one-line and obvious.

### `@stripe/react-stripe-js` removal
- **D-07:** Standard removal: `pnpm remove @stripe/react-stripe-js`, then `grep -rn "@stripe/react-stripe-js" src/ tests/ supabase/` returns zero. Verify `grep -E "@stripe/(react-)?stripe-js" pnpm-lock.yaml` returns zero (BOTH packages should be gone since `@stripe/stripe-js` only hung around as a peer-dep).
- **D-08:** Add a regression test: `src/lib/__tests__/no-stripe-js-deps.test.ts` reads `package.json` and asserts neither `@stripe/stripe-js` nor `@stripe/react-stripe-js` appear in `dependencies` or `devDependencies`. Drift guard for future re-adds.

### Vitest worker-pool flakiness — investigate-and-fix
- **D-09:** Diagnostic run first: `bunx vitest --run --project unit --reporter=json > /tmp/vitest-run-{1,2,3}.json` three times consecutively. Diff the failures across runs to identify which tests actually flake vs deterministic-fail. Document hypothesis (likely worker timeout under contention with 105k tests across 165 files).
- **D-10:** Fix attempt order:
  1. Tune `vitest.config.ts` `pool` / `poolOptions.threads.maxThreads` / `poolOptions.threads.minThreads` based on observed CPU count and contention. Try `pool: 'threads'` with conservative `maxThreads: 4` first.
  2. If pool tuning insufficient, raise per-test `testTimeout` for the flaky test files (last resort; preferred only if root cause is genuine slow render not pool contention).
  3. As an escape hatch, split the unit project into 2-3 logical sub-projects if a single pool can't handle all 105k green deterministically.
- **D-11:** Success gate: **3 consecutive full-suite zero-flake runs** under the new config. Not "best of 3" — three in a row. If after reasonable tuning we can't hit that, downgrade to "documented + tracked issue" with the diagnostic data captured; don't ship pool changes that don't actually fix it.
- **D-12:** If a fix lands: regression-pin the pool config by adding a comment in `vitest.config.ts` referencing this phase ("Phase 15-04 — pool config tuned to eliminate worker timeout flakiness; see SUMMARY for diagnostics"). The drift-guard test for the pool config itself is NOT required (would be paranoia).

### /blog nav regression-pin
- **D-13:** **Both** source-text scan AND render test. Belt-and-suspenders consistent with how Phases 10/12 layered source-scan + render assertions on critical regressions.
- **D-14:** Source-scan test (`nav-blog-suppression-source.test.ts`):
  - import `DEFAULT_NAV_ITEMS` from `#components/layout/navbar/types`
  - assert no top-level entry has `href === '/blog'`
  - assert no `dropdownItems` entry has `href === '/blog'`
  - `readFileSync` `src/components/layout/navbar/types.ts`, assert `/AUDIT-2.*deferr/i` comment present AND `/blog` mention present (so removing the comment is also caught)
- **D-15:** Render test (`nav-blog-suppression-render.test.tsx`):
  - mount `<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />`
  - assert `screen.queryAllByRole('link', { name: /blog/i }).filter(l => l.getAttribute('href') === '/blog')` is empty
  - mount mobile menu equivalent; assert same absence on mobile path

### Plan granularity
- **D-16:** **5 parallel plans, one per cleanup item.**
  - `15-01-PLAN.md` — Retro-VERIFICATION.md for Phases 4/5/6/14 + missing SUMMARY placeholders (planning-dir only; zero src/ overlap)
  - `15-02-PLAN.md` — REQUIREMENTS.md traceability + body checkbox sweep (single file)
  - `15-03-PLAN.md` — `pnpm remove @stripe/react-stripe-js` + lockfile verify + drift-guard test
  - `15-04-PLAN.md` — Vitest pool diagnostic + tuning + 3-run zero-flake gate
  - `15-05-PLAN.md` — `/blog` nav suppression source-scan + render regression tests
- **D-17:** Wave 1: all 5 plans run in parallel. Zero `files_modified` overlap:
  - 15-01 touches `.planning/phases/04|05|06|14/`
  - 15-02 touches `.planning/REQUIREMENTS.md`
  - 15-03 touches `package.json`, `pnpm-lock.yaml`, `src/lib/__tests__/no-stripe-js-deps.test.ts`
  - 15-04 touches `vitest.config.ts` (likely)
  - 15-05 touches `src/components/layout/navbar/__tests__/nav-blog-suppression-{source,render}.test.tsx`
- **D-18:** If any plan's perfect-PR review surfaces drift into another plan's territory (unlikely given the orthogonality), the affected plan(s) get retracted from the wave and re-sequenced.

### Cross-cutting (universal)
- **D-19:** Perfect-PR merge gate applies (two consecutive zero-finding deep review cycles per PR). Same gate as Phases 7-13.
- **D-20:** No emojis in code. No hex/rgb/`bg-white`/inline-ms. Lucide icons. Per CLAUDE.md Zero Tolerance Rules.
- **D-21:** `bun install --frozen-lockfile` fails in command sandbox — run `git commit` with sandbox disabled to let lefthook's `lockfile-verify` pre-commit hook pass. NEVER `--no-verify` / `LEFTHOOK_EXCLUDE` (HANDOFF blocking anti-pattern).
- **D-22:** After every code-fixer sub-agent return, run `git status --short` + `git diff --stat` to verify what actually landed against what the agent reported (Phase 10 IN-01/IN-02 lesson).
- **D-23:** For any TypeScript type-narrowing claim in tests (e.g., the nav source-scan asserting `dropdownItems` discrimination), write an `@ts-expect-error` probe to verify empirically before asserting it works (Phase 12 NavHref lesson).

### Claude's Discretion
- Exact wording of retro-VERIFICATION Observable Truths and Required Artifacts (so long as truths cite live code + a regression test + the shipped PR).
- Exact `maxThreads` / `minThreads` values landed for the vitest pool — depends on diagnostic data; Claude picks based on what produces 3-run green.
- Whether to split the unit project into sub-projects (D-10 step 3) — only if D-10 steps 1-2 are insufficient.
- Whether to add an integration test for the Stripe dep removal beyond the package.json drift guard (likely unnecessary — drift guard is sufficient, the dep is dead-code per the integration checker).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 15 source-of-truth
- `.planning/v1.0-MILESTONE-AUDIT.md` — The audit that surfaced every Phase 15 cleanup item. ALL Phase 15 work traces back to a row in this doc. Read this first.
- `.planning/ROADMAP.md` § "Phase 15: v1.0 Milestone Cleanup" (lines 313+) — Phase scope, success criteria, dependency declarations.
- `.planning/REQUIREMENTS.md` — Traceability table (lines 161-218) is the target of Plan 15-02. Body checkboxes at lines 29-129 need flipping too.

### Per-phase shipped evidence (for retro-VERIFICATION cross-refs in Plan 15-01)
- `.planning/phases/04-persona-copy/` — PR #688 (CONS-01 + COPY-01..07). No SUMMARY, no VER. Git log: `004f776b7` and 12 followup commits between `f8ad8c678` and `6e48dc1e1`.
- `.planning/phases/05-pricing-restructure/05-01-SUMMARY.md` + `05-02-SUMMARY.md` — PR #689 (PRICE-01..06). SUMMARYs list reqs in frontmatter.
- `.planning/phases/05-pricing-restructure/deferred-items.md` — Edge fn + DB Stripe price ID drift, RESOLVED 2026-05-10.
- `.planning/phases/06-blog-rebuild/06-02|03|04-SUMMARY.md` — PR #690 (BLOG-01..06). 06-01 SUMMARY missing.
- `.planning/phases/14-battle-test-findings-remediation/14-01|02|03|04-SUMMARY.md` — D-01..D-04 + 6 battle-test followup PRs. No phase-level VER.
- `.planning/phases/14-battle-test-findings-remediation/deferred-items.md` — `@stripe/react-stripe-js` dead peer-dep (Plan 15-03 target).
- `.planning/phases/12-seo-metadata-schema-content-cleanup/deferred-items.md` — Vitest worker-pool flakiness diagnostic data (Plan 15-04 starting point).

### Live-code anchors (read these to verify the work is shipped before writing retro-VERs)
- `src/app/marketing-home.tsx` — Persona-aligned hero (Phase 4 evidence)
- `src/config/pricing.ts` — Pricing SoT post-restructure (Phase 5 evidence: $19/$49/$149)
- `src/config/__tests__/pricing.test.ts` — Annual-savings math regression (Phase 5+7 evidence)
- `src/app/pricing/page.tsx` — JSON-LD Product with 3 offers post-PRICE-06 (Phase 5 evidence)
- `src/app/blog/page.tsx` — try/catch around Supabase fetch (Phase 14 D-03 evidence)
- `src/app/blog/[slug]/page.tsx` — `dynamicParams = false` + `notFound()` (Phase 6 + Phase 14 evidence)
- `src/app/blog/loading.tsx` — Route-scoped streaming UI (Phase 14 D-04 evidence)
- `src/app/not-found.tsx` — Wraps `<PageLayout>` (Phase 14 D-01 evidence)
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — Persona drift guard (Phase 4 evidence)
- `src/components/layout/navbar/types.ts` lines 31-39 — `/blog` nav suppression comment (Plan 15-05 target)

### Cross-cutting standards
- `CLAUDE.md` — Zero Tolerance Rules (no `any`, no barrel files, no inline styles, no PG ENUMs, no `as unknown as`, etc.). Hits Plan 15-04 directly (vitest.config.ts changes must respect the typing rules).
- `.planning/.continue-here.md` § Critical Anti-Patterns — Hook bypass via `LEFTHOOK_EXCLUDE` / `--no-verify` is BLOCKING. The sanctioned workaround for the sandbox `lockfile-verify` failure is `git commit` with sandbox disabled.
- `.planning/HANDOFF.json` § blockers — Same.

### Reference implementations (template targets for Plan 15-01)
- `.planning/phases/07-pricing-card-chrome/07-VERIFICATION.md` — Canonical "passed" VERIFICATION template; 8 Observable Truths.
- `.planning/phases/08-nav-active-states/08-VERIFICATION.md` — Compact 5-truth example.
- `.planning/phases/10-cta-conversion/10-VERIFICATION.md` — Has a documented `overrides_applied: 1` example (TRUST-01 length≥2); useful if a retro-VER needs to encode a documented divergence.
- `.planning/phases/13-performance-conversion-polish/13-VERIFICATION.md` — Smallest VERIFICATION (4 truths); minimum bar.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Vitest config tuning** (`vitest.config.ts`): existing test projects (`unit`, `integration`, possibly others). Plan 15-04 reads + tunes this file. Reference Vitest docs (load via `mcp__context7__*` if needed) for `pool` / `poolOptions` schema on Vitest 4.x.
- **`#components/layout/navbar/types.ts`** + **`#components/layout/navbar/navbar-desktop-nav.tsx`** — Plan 15-05 imports the former, renders via the latter.
- **`@testing-library/react`** + **`vitest` + `jsdom`** stack — already in use across `src/**/__tests__/*.test.tsx`; no new test infra needed for the render test.
- **Source-text scan pattern** — established in `src/app/__tests__/design-token-drift.test.ts` (Phase 11), `src/app/__tests__/seo-aria-current-audit.test.ts` (Phase 12), `src/app/__tests__/marketing-home.test.tsx` (Phase 9). Plan 15-05's source-scan test mirrors these.
- **`package.json` drift guard pattern** — Plan 15-03's test can model on existing JSON-driven tests; check for similar precedent in `src/lib/__tests__/`.

### Established Patterns
- **Perfect-PR merge gate** — two zero-finding deep review cycles per PR (this milestone's discipline). 8 PRs landed via this gate this session; Phase 15's 5 PRs follow the same flow.
- **Atomic commits per fix** — each plan-task atomic; not bundled. Matches GSD execute-phase convention.
- **Per-phase branch** — `gsd/phase-15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea` (long slug; OK).
- **`readFileSync` source-text scans** trump rendering for low-risk static-content invariants (Phase 11 token drift, Phase 12 separator drift, Phase 9 marketing-home dedup). Plan 15-05 uses both because render adds value over source-scan when DOM structure matters; source-scan alone is sufficient for `DEFAULT_NAV_ITEMS` structural assertions.

### Integration Points
- **`.planning/REQUIREMENTS.md`** — Single file edited by Plan 15-02. No source-code dependency; pure markdown.
- **`.planning/phases/*/[NN]-VERIFICATION.md`** — Files created by Plan 15-01 in 4 phase directories. Idempotent vs source; no production code touched.
- **`package.json` + `pnpm-lock.yaml`** — Plan 15-03 modifies both via `pnpm remove`. Side effect: smaller install. No runtime behavior change because dep is dead-code.
- **`vitest.config.ts`** — Plan 15-04 likely modifies the `pool` / `poolOptions` schema. Touches all tests that run under that pool, but config-level changes don't alter test assertions, only execution shape.
- **`src/components/layout/navbar/__tests__/`** — Plan 15-05 creates new test files alongside existing nav tests (`navbar-desktop-nav.test.tsx`, `features-section.test.tsx`, etc.). Mirrors the existing test layout.

</code_context>

<specifics>
## Specific Ideas

- User explicitly asked for "everything no matter severity, canonically" — meaning Phase 15 closes ALL audit items: doc drift + traceability + dead deps + worker-pool + nav-pin. Nothing deferred to v1.1 unless objectively blocked.
- Cycle-aware: user has shipped 8 PRs through perfect-PR this session; gate discipline is the merge floor. Plan 15-04 specifically may go multi-cycle if the pool tuning surfaces second-order effects (e.g., new test timeouts that didn't exist before because pool was masking them).
- Honesty bias: the milestone is literally "Marketing Surface Honesty" — the retro-VERIFICATIONs must NOT pretend they were written at execution time. `retroactive: true` is the truth bit. Same for the traceability sweep: it records reality (work shipped), not retroactive promises.

</specifics>

<deferred>
## Deferred Ideas

- **Dashboard redesign milestone (v2.0 "Dashboard Command Center")** — Full plan parked at `/Users/richard/.claude/plans/i-want-to-enhance-hazy-island.md`. 7-phase plan covers KPI bento row, occupancy donut, DiceUI DataTable adoption, dark-mode/a11y/responsive polish, `*100`/`÷100` revenue-path bug fix. Spin up via `/gsd-new-milestone` AFTER Phase 15 + `/gsd-complete-milestone v1.0`.
- **Lifting `/blog` nav suppression** — Belongs in a future content-cohort milestone (real published posts in `blogs` table). Plan 15-05 explicitly hardens the suppression with a test; the test will need updating when the cohort lands and `/blog` becomes navable.
- **Vitest project split** (D-10 step 3 escape hatch) — Only enacted if pool tuning fails. If shipped, it's an architecture change worth its own discuss/plan in a follow-up phase rather than smuggling into Plan 15-04. Plan 15-04 prefers pool-tuning to project-split.
- **General `package.json` audit for other dead deps** — Plan 15-03 only removes `@stripe/react-stripe-js` (the audited item). A wider dep audit ("scan all deps for zero src/ callers") would be its own future cleanup phase.

</deferred>

---

*Phase: 15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea*
*Context gathered: 2026-05-21*
