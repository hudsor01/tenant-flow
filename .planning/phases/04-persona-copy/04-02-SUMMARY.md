---
phase: 04-persona-copy
plan: 02
subsystem: marketing-copy
tags: [persona, copy, marketing-surface, retroactive-placeholder, docuseal-deamp, faq-canonical]
requirements-completed:
  - COPY-04
  - COPY-05
  - COPY-06
  - COPY-07
completed: 2026-05-21
retroactive: true
shipped_pr: 688

key-files:
  modified:
    - src/components/sections/hero-dashboard-mockup.tsx
    - src/components/sections/home-faq.tsx
    - src/components/sections/__tests__/home-faq.test.tsx
    - src/app/pricing/pricing-content.tsx
    - src/components/sections/comparison-table.tsx
    - src/components/sections/stats-showcase.tsx
    - src/app/about/page.tsx
    - src/app/help/page.tsx
    - src/app/faq/page.tsx
    - src/app/features/page.tsx
    - src/app/support/page.tsx
    - src/app/compare/[competitor]/compare-data.ts
    - src/data/faqs.ts
    - tests/e2e/tests/public/persona-consistency.spec.ts

decisions:
  - "Plan 04-02 shipped via the same PR (#688) as Plan 04-01; this SUMMARY is a retroactive placeholder authored 2026-05-22 to close a sub-gap of the Phase 15 documentation-drift gap (04-01-SUMMARY was created by Plan 15-01, but 04-02-SUMMARY was missed in the same retro pass)."
  - "All four COPY requirements (COPY-04 / COPY-05 / COPY-06 / COPY-07) verified live on `main` via the live-code anchors below and pinned by the persona-consistency e2e + home-faq unit test."

note: |
  Placeholder summary authored 2026-05-22 to close the second wave of the Phase 15
  documentation-drift gap (Plan 15-01 retro-VER pass created 04-01-SUMMARY but missed
  04-02-SUMMARY for Phase 4's second plan).
---

# Phase 4 Plan 02: De-amplify DocuSeal + canonicalize FAQ + soften jargon (retroactive placeholder)

Plan 04-02 is the second wave of the persona-copy phase. Where 04-01 unified the persona word ("landlords") across hero/About/meta/FAQ surfaces, 04-02 cleaned up the four remaining audit findings that didn't depend on persona word selection but benefited from landing after 04-01's edits settled. Plan shipped via the same **PR #688** (commits between `f8ad8c678` and `6e48dc1e1`, multiple `feat(phase-04-02): ...` prefixes) through Phase 4's 6-cycle perfect-PR gate. Only the SUMMARY.md drifted — the work is live.

## Requirements covered

| REQ-ID | Description (from REQUIREMENTS.md) | Live-code anchor | Regression pin |
|--------|-----------------------------------|------------------|----------------|
| COPY-04 | DocuSeal plan-tier note de-amplified — reduce 6× mentions to ≤3 strategic + 5 infrastructure | `src/app/pricing/pricing-content.tsx`, `src/components/sections/comparison-table.tsx`, `src/data/faqs.ts`, `src/components/sections/hero-dashboard-mockup.tsx` (`amount="E-Sign"`) | `tests/e2e/tests/public/persona-consistency.spec.ts` site-wide DocuSeal mention count |
| COPY-05 | FAQ canonicalized to `/faq`; homepage + pricing reduced to 3-5 entries each with "See all FAQs" link | `src/components/sections/home-faq.tsx` (5 entries), `src/app/pricing/pricing-content.tsx` (5 entries + `View all FAQs` link) | `src/components/sections/__tests__/home-faq.test.tsx` (homeFaqs.length === 5) |
| COPY-06 | "Bulk-zip export (500/request)" softened to non-technical "Tax-season zip exports" everywhere | 10 user-facing surfaces (about/help/faq/features/support pages + compare-data.ts + comparison-table.tsx + stats-showcase.tsx + pricing-content.tsx + faqs.ts) | `marketing-copy-landlord-only.test.ts` banlist (banned phrase: `bulk-zip*/request` jargon) |
| COPY-07 | Hero dashboard mockup names simplified | `src/components/sections/hero-dashboard-mockup.tsx` (Jamie Carter / Alex Rivera / Sam Patel with matching avatar initials; "Sarah" greeting kept) | `tests/e2e/tests/public/persona-consistency.spec.ts` extended block |

## Evidence

- **Shipped PR:** #688 (same PR as 04-01; 04-02 commits land between `f8ad8c678` and `6e48dc1e1`, prefixed `feat(phase-04-02)` / `test(phase-04-02)` / `style(phase-04-02)`)
- **Phase VER:** `04-VERIFICATION.md` (sibling file)
- **Plan-01 SUMMARY:** `04-01-SUMMARY.md` (also retroactive; both placeholders document the same PR)
- **Live regression pin:** `tests/e2e/tests/public/persona-consistency.spec.ts` + `src/components/sections/__tests__/home-faq.test.tsx`

## Invariants preserved

- Phase 2 NumberTicker invariant: `src/components/sections/stats-showcase.tsx` `value: 500` is **untouched**; only the surrounding label/description was softened. The animation still renders 500 in production.
- Phase 1 CRIT-03 invariant: 04-02 touches no pricing/JSON-LD files. Phase 5 later replaced CRIT-03's placeholder.
- 5 KEEP-AS-INFRASTRUCTURE DocuSeal references explicitly preserved: logo-cloud, login HERO_STATS, confirm-email HERO_STATS, JSON-LD featureList, integrations subtitle on features page.

## Status

PASSED (retroactive). 4/4 COPY requirements covered by Plan 04-02 verify live on `main`. Together with Plan 04-01's CONS-01 + COPY-01..03, Phase 4 totals 8/8 requirements complete (1 + 7 = CONS-01 + COPY-01..07).
