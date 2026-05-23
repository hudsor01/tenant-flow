# Milestones

## v1.0 Marketing Surface Honesty (Shipped: 2026-05-22)

**Phases:** 15 (1-15) | **Plans:** 33 | **Audit:** Round 3 — PERFECT BY ALL MEASURES
**Merge commit:** [`d13d7a265`](https://github.com/hudsor01/tenant-flow/commit/d13d7a265) (PR #743)
**Archive:** [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md) · [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md) · [`milestones/v1.0-MILESTONE-AUDIT.md`](milestones/v1.0-MILESTONE-AUDIT.md)

### Delivered

Every public claim on tenantflow.app maps to working code, and every visual aligns to canonical design tokens in `src/app/globals.css`. 56 audit findings from the external UI audit (2026-05-08) closed across 9 requirement categories: CRIT (block ad spend), CONS (visual/copy consistency), COPY (UX refinement), PRICE (pricing restructure), BLOG (blog rebuild + n8n), TOKEN (design-token alignment), TRUST (testimonials), SEO, PERF.

### Key Accomplishments

**Critical stop-bleed (Phases 1-3):**
- Bulk-unpublished 100 broken blog rows + BEFORE-INSERT trigger guard against re-publish (CRIT-01)
- Fixed homepage NumberTicker animation (5 / 7 / 500 / 14) with one-shot IntersectionObserver (CRIT-02)
- 375px mobile drawer using shadcn `Sheet` + 44×44 touch targets + 8-test Playwright spec (CRIT-04)
- 5 redirect aliases (`/signup` → `/pricing` + 4 legal long-form paths → canonical short paths) eliminating the `/signup` → `/login` loop (CRIT-05/06)

**Persona + Pricing (Phases 4-5):**
- Unified "landlord" persona across hero / About / meta / FAQ / blog with `marketing-copy-landlord-only.test.ts` 7-category banlist drift guard (CONS-01 + COPY-01..07)
- Pricing restructured to **Starter $19 / Growth $49 / Max $149** with `src/config/pricing.ts` single-source-of-truth, 8 consumer files reading via `#config/pricing`, Stripe products + prices repointed via MCP, 3-offer `Product` JSON-LD (PRICE-01..06)
- Fabricated "Join 500+" replaced with honest "Built for landlords with 1–15 rentals" segment framing (COPY-02)

**Blog rebuild + battle-test remediation (Phases 6, 14):**
- `/blog` index server-rendered, real-404 on unknown slug via `dynamicParams = false`, visible breadcrumbs, canonical URLs, dynamic OG images, n8n flow redesigned with 9-gate defense-in-depth Edge Function (BLOG-01..06)
- D-03 try/catch around Supabase fetch routes failures through Sentry instead of 5xx
- D-04 route-scoped `/blog/loading.tsx` resolves streaming/skeleton mutual exclusion

**Visual polish (Phases 7-10):**
- Most-Popular badge sits cleanly on Growth card; per-card "Save $X/year" annual savings backed by `calculateAnnualSavings(plan.price.monthly)` (CONS-05/09/10)
- Multi-Property Dashboard feature card uses `lucide-react` `LayoutDashboard` (was back-arrow); homepage `aria-current="page"` no longer mis-highlights "Compare"; Resources dropdown navigates to real URLs (CONS-02/03/11)
- Legal-page "Last Updated" dates honest + drift-guarded against sitemap constants; Trusted Integrations row consistent opacity; duplicate "Why Landlords Choose" table removed from homepage (CONS-04/13/14)
- Canonical "Contact Sales" CTA label site-wide + neutral `/compare/*` framing (no red ✗ for by-design omissions) + `/contact` "How did you hear" defaults to "Please select" + 2 real testimonials shipped with `length >= 2` regression pin (CONS-06/07/08, TRUST-01/03/04; TRUST-02 deferred — no fabricated badges)

**Tokens, SEO, performance (Phases 11-13):**
- `design-token-drift.test.ts` Vitest scanner over `src/components` + `src/app` for hex/rgb/`bg-white`/inline-ms (TOKEN-01/02/03); `/resources` neon-pink + decorative card backgrounds → canonical tokens
- Title-separator drift guard + per-page OG images + site-wide Organization + SoftwareApplication JSON-LD + visible breadcrumbs + footer sitemap link + site-wide `aria-current` audit (SEO-01..07)
- Marketing pages use static gen + ISR (`revalidate=3600` on /, /pricing, /features, /about, /compare/[competitor]) + sticky CTA on `/pricing`, `/faq`, `/features` + feature-flagged lead-capture modal (PERF-01..04)

**v1.0 cleanup (Phase 15):**
- Retroactive `VERIFICATION.md` for Phases 4/5/6/14 (`retroactive: true` + `shipped_pr` frontmatter)
- `REQUIREMENTS.md` traceability sweep: 35 Pending → 0, 24 body `[ ]` → 0, footer flipped to "Last updated: 2026-05-21"
- `@stripe/(react-)?stripe-js` dead-dep drift guard (8 tests across 4 dependency roots)
- Vitest worker-pool host-derived cap (`Math.max(2, Math.min(8, cpus().length - 1))`), 3-consecutive-run zero-flake gate met
- `/blog` nav suppression regression-pinned (source-scan + render tests; `DEFAULT_NAV_ITEMS` cannot silently re-introduce `/blog` until content cohort lands)

### Discipline Outcomes

- **Perfect-PR merge gate** (two consecutive zero-finding deep review cycles) enforced on every shipped phase. Phase 15 PR #743 took cycle 1 → fix pass → cycles 2+3 zero-finding.
- **Audit rounds:** Round 1 (tech_debt) → Phase 15 closure → Round 2 (passed with 7 documented imperfections) → Round 3 (PERFECT BY ALL MEASURES, zero imperfections).
- **CI gates:** 105,106 / 105,106 unit tests pass in ~16s; Biome lint clean (1198 files); TypeScript strict clean; lefthook (gitleaks + lockfile-verify + lint + typecheck + unit-tests + commitlint) green on every commit; branch protection enforced `checks` / `e2e-smoke` / `rls-security` required on `main`.
- **Nyquist coverage:** 15/15 phases COMPLIANT (`nyquist_compliant: true` + `wave_0_complete: true`).
- **Decision-coverage gate:** Passed-clean (16/16 trackable decisions covered; 7 [informational]-tagged cross-cutting decisions correctly filtered as non-trackable using the parser-recognized `**D-NN [informational]:**` format).

### Lessons Carried Forward to v2.0

- Sandbox-disabled `git commit` is the sanctioned workaround for the lockfile-verify lefthook hook failing under the command sandbox (NEVER `--no-verify` / `LEFTHOOK_EXCLUDE`).
- After every code-fixer sub-agent return, run `git status --short` + `git diff --stat` to verify what actually landed against what the agent reported (Phase 10 IN-01/IN-02 lesson).
- For TypeScript narrowing claims in tests, write an `@ts-expect-error` probe to verify empirically before asserting; remove the probe before commit (no commented-out code).
- When the user asks for X, work on X. Don't unilaterally decide tangential cleanup (in-flight milestone, audit gaps) must come first; surface the trade-off in one sentence and let the user choose.
- Mid-execution executor deviations: when a Write tool call lands a file at the main-repo path instead of the worktree path (common deviation under `isolation="worktree"`), recover by deleting the misplaced file + re-Writing to the worktree path; the orchestrator's post-merge `git status --short` check catches stragglers.

### Naming-Collision Note

The git tag `v1.0` was already in use from a prior project-iteration milestone ("Production Hardening", 10 phases / 60 plans / 131 findings — commit `24ca463...`). The complete-milestone workflow's pre-check correctly skipped re-tagging to avoid silent overwrite. This v1.0 "Marketing Surface Honesty" milestone is authoritative via `.planning/MILESTONES.md` + `.planning/milestones/v1.0-*.md` archive files + the merge commit (`d13d7a265`). If a new tag is desired pointing at the actual v1.0 merge commit, it would need to be a different name (e.g., `v1.0-marketing-honesty`) or an explicit force-update of the existing tag.
