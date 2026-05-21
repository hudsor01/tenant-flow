# Phase 13: Performance & Conversion Polish - Context

**Gathered:** 2026-05-21 (via /gsd-discuss-phase 13 --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

Performance + conversion polish, scoped by ROADMAP Phase 13 (requirements PERF-01..04):

1. **PERF-01** — `/blog` server-rendered (verified outcome of Phase 6 BLOG-02).
2. **PERF-02** — `/`, `/pricing`, `/features`, `/about`, `/compare/[competitor]` use static generation + explicit cache headers.
3. **PERF-03** — Sticky CTA bar visible on `/pricing`, `/faq`, `/features`.
4. **PERF-04** — Exit-intent OR scroll-depth lead-capture component active on top marketing pages, gated behind a feature flag (default off for v1.0).

Pre-scout findings (2026-05-21):
- `/` — `export const dynamic = "force-static"` ✓
- `/pricing` — `export const revalidate = 3600` ✓
- `/features` — `export const revalidate = 3600` ✓
- `/compare/[competitor]` — `export const revalidate = 3600` ✓
- `/about` — **gap: no `revalidate`/`dynamic` export** (uses Next.js default; needs explicit cache)
- `/faq` — `export const revalidate = 3600` ✓ (bonus — not in ROADMAP success criterion but mounted with StickyConversionCta)
- `/blog/page.tsx` — server component (no `'use client'`); Phase 6 verify-only
- `StickyConversionCta` mounted on `/pricing`, `/faq`, `/features`, `/compare/[competitor]` ✓
- `LeadCaptureModal` exists, gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL === "on"` env flag (default off), mounted on `/pricing` + `/compare/[competitor]` ✓
</domain>

<decisions>
## Implementation Decisions

### Per-requirement classification (shipped vs remaining)
- **D-01 PERF-01 — verify-only.** `/blog/page.tsx` is a server component. Phase 6 BLOG-02 owns the rebuild; this phase just confirms server-rendering (no `'use client'` directive, no `dynamic = "force-dynamic"`) and regression-pins it.
- **D-02 PERF-02 — real work + verify.** 4 of 5 ROADMAP-named pages already have static gen / ISR. `/about` is the one gap. Add `export const revalidate = 3600` to `/about/page.tsx` matching the sibling marketing pages (about is static brand copy — same 1h-revalidate semantics as features/pricing). Regression-pin all 5 pages.
- **D-03 PERF-03 — verify-only.** `StickyConversionCta` already mounted on all 3 ROADMAP-named pages (`/pricing`, `/faq`, `/features`). Regression-pin the mount sites.
- **D-04 PERF-04 — verify-only.** `LeadCaptureModal` exists, gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL === "on"` env flag (default off), mounted on top marketing pages. Regression-pin the gate behavior + mount sites.

### Feature flag mechanism (LOCKED)
- **D-05** The lead-capture gate uses `process.env.NEXT_PUBLIC_LEAD_CAPTURE_MODAL` — a `NEXT_PUBLIC_*` env var read in client components. This IS the project's feature flag for v1.0; no separate flag system needs to be added. Default off (env var unset → modal disabled). Operators flip on by setting `NEXT_PUBLIC_LEAD_CAPTURE_MODAL=on` in Vercel env config.

### Claude's Discretion
- Whether the `/about` `revalidate` should be `3600` (1h, matches siblings) or longer (`/about` content is more static). Default to `3600` for consistency with sibling pages.

</decisions>

<specifics>
## Specific Ideas

- Phase 6 BLOG-02 owns server-rendered `/blog`. Confirm via source inspection — do not re-edit blog code.
- Phase 12's drift-guard test pattern (`src/app/sitemap.test.ts`, `marketing-copy-landlord-only.test.ts`) is the analog for the regression-pin tests this phase adds.
- v1.0 is the smallest phase by net production change — 1 line (`export const revalidate = 3600` on `/about`) plus regression-pin tests.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Code touchpoints (verify during research)
- `src/app/about/page.tsx` — add `revalidate` (PERF-02 only gap)
- `src/app/page.tsx`, `src/app/pricing/page.tsx`, `src/app/features/page.tsx`, `src/app/compare/[competitor]/page.tsx`, `src/app/faq/page.tsx` — PERF-02/03 regression-pin targets
- `src/app/blog/page.tsx` — PERF-01 server-rendered verify (no edit)
- `src/components/marketing/sticky-conversion-cta.tsx` (+ `__tests__/`) — PERF-03 component
- `src/components/marketing/lead-capture-modal.tsx` (+ `__tests__/`) — PERF-04 component + env gate

### Project rules
- `CLAUDE.md` — zero-tolerance rules; Vitest 4 + jsdom; Biome lint

</canonical_refs>

<deferred>
## Deferred Ideas

- A/B testing infrastructure for the lead-capture variants — v2.0+; v1.0 just ships the env-flag default-off gate.
- Lighthouse TTI baseline measurement — outside CI test scope; manual verification.

</deferred>

---

*Phase: 13-performance-conversion-polish*
*Context gathered: 2026-05-21 via /gsd-discuss-phase 13 --auto*
