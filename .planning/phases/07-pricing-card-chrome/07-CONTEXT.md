# Phase 7: Pricing-Card Chrome — Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Source:** ROADMAP.md § Phase 7 + audit-ui-2026-05-08.md + 07-RESEARCH.md audit

<domain>
## Phase Boundary

Three small visual / math fixes on `/pricing`:
- CONS-05: "Most Popular" badge on Growth card no longer overlaps card border at any breakpoint
- CONS-09: Starter price row `$19` + `/mo` adjacent (no wrap); Phase 4 description renders one-sentence (already clean)
- CONS-10: Annual toggle reveals math-correct per-tier savings (`$38` / `$98` / `$298`) backed by Phase 5 numbers

**In scope:**
- `pricing-card-featured.tsx` badge positioning swap (`-top-4` → `top-0 -translate-y-1/2`)
- `pricing-card-standard.tsx` + `pricing-card-featured.tsx` price-row `whitespace-nowrap`
- `bento-pricing-section.tsx` global savings badge → per-card "Save $X/year" badges
- `calculateAnnualSavings()` helper in `src/config/pricing.ts` (already exists per researcher) wired into each card
- Unit test extensions for the math (Starter $38, Growth $98, Max $298)

**Out of scope:**
- Pricing copy (Phase 4 locked)
- Tier numbers (Phase 5 locked — pure consumption here)
- `kibo-style-pricing.tsx` dead code (zero importers; documented for future cleanup, not Phase 7)
- New design tokens (CSS-only Tailwind changes)

**Branch:** `gsd/phase-07-pricing-card-chrome`
**Phase requirement IDs:** CONS-05, CONS-09, CONS-10
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### CONS-05 Badge fix
Replace `-top-4` (creates ~12px overhang) with `top-0 -translate-y-1/2` (badge centered on top edge, fully contained). One-line Tailwind class change at `pricing-card-featured.tsx:140-144`.

### CONS-09 No-wrap on price row
Add `whitespace-nowrap` to the price-row flex container in BOTH `pricing-card-standard.tsx:167` and `pricing-card-featured.tsx` (parallel structure). Prevents `$XX` and `/mo` from wrapping at narrow grid columns. Phase 4 description already reads cleanly — no copy edits.

### CONS-10 Per-card savings (Option D — LOCKED)
- Drop the global "Save $98" badge from `bento-pricing-section.tsx` (only showed Growth's number, misleading for the other tiers)
- Add per-card "Save $X/year" badge on each card (Starter $38, Growth $98, Max $298) using the existing `calculateAnnualSavings()` helper from `src/config/pricing.ts`
- Badge appears only when annual toggle is ON; hidden when monthly

### Plan decomposition (LOCKED)
2 plans, sequential, 1 PR:
- Plan 07-01: card chrome (CONS-05 badge + CONS-09 nowrap) — ~6 LOC
- Plan 07-02: per-card savings math (CONS-10) — ~15 LOC + unit tests pinning $38/$98/$298

### Phase 4 + Phase 5 regression guards
- Phase 4 descriptions in `pricing.ts:100/133/167` byte-identical
- Phase 5 `MAX_PUBLIC_PRICE_DISPLAY = '$149'`
- Phase 5 `productJsonLd.offers.length === 3` test green
- Phase 5 stripePriceIds in `pricing.ts` (6 new price IDs)
- Phase 2 NumberTicker `value: 500` untouched
</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/07-pricing-card-chrome/07-RESEARCH.md`
- `.planning/REQUIREMENTS.md § CONS-05, CONS-09, CONS-10`
- `.planning/ROADMAP.md § Phase 7`
- `.planning/phases/05-pricing-restructure/05-RESEARCH.md` (Phase 5 tier numbers)
- `src/config/pricing.ts` (Phase 5 source of truth + `calculateAnnualSavings`)
- `src/components/pricing/pricing-card-{standard,featured}.tsx`
- `src/components/pricing/bento-pricing-section.tsx`
- `src/app/pricing/__tests__/page.test.ts`
- `CLAUDE.md`

</canonical_refs>

<specifics>

### Per-card savings math (Phase 5 numbers)
| Tier | Monthly | Annual | Savings/yr |
|------|---------|--------|------------|
| Starter | $19 | $190 | $38 |
| Growth | $49 | $490 | $98 |
| Max | $149 | $1,490 | $298 |

All derived from `monthly × 12 − annual = monthly × 2`. `calculateAnnualSavings()` helper already implements this.

### Test additions
- Extend `src/app/pricing/__tests__/page.test.ts` OR add `src/components/pricing/__tests__/pricing-card-{standard,featured}.test.tsx` to assert "Save $38/year" / "Save $98/year" / "Save $298/year" when annual toggle is on.
- E2E: `tests/e2e/tests/public/seo-smoke.spec.ts` or new spec — assert no badge overlap at 375px viewport (visual / position check via `boundingBox()` comparison).

### Live verification
```bash
curl -s https://tenantflow.app/pricing | grep -oE 'Save \$(38|98|298)/year' | sort -u
# Expect: 3 distinct matches after deploy
```

</specifics>

<deferred>

- `kibo-style-pricing.tsx` cleanup (zero importers — dead code) → future polish
- Annual toggle UX redesign → out of scope
- Price formatting (`$1,490` comma) — already correct via Phase 5 work

</deferred>

---

*Phase 7 context locked: 2026-05-10*
