# Phase 8: Nav, Active States & Dead Links - Context

**Gathered:** 2026-05-20 (via /gsd-discuss-phase 8 --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

Three marketing-surface nav/chrome audit fixes, scoped by ROADMAP Phase 8 (requirements CONS-02, CONS-03, CONS-11):

1. **CONS-02** — The "Multi-Property Dashboard" feature card uses a wrong icon (a back-arrow). Replace with a lucide-react icon that visually communicates the feature.
2. **CONS-03** — On the homepage `/`, the nav active-state logic incorrectly highlights "Compare" (`aria-current="page"` is wrong). Fix the matcher so no nav link is falsely active on `/`.
3. **CONS-11** — The Resources nav dropdown has dead `href="/#"` link(s). Each Resources dropdown item must navigate to a real URL; keyboard activation must work.

Token-alignment + bug-fix only — NOT a nav redesign. No new hex/rgb/`bg-white`/inline-style tokens.
</domain>

<decisions>
## Implementation Decisions

### CONS-02 — Multi-Property Dashboard icon
- **D-01:** Replace the back-arrow icon in `src/components/sections/features-section.tsx` (Multi-Property Dashboard card) with a lucide-react icon. ROADMAP locks the choice to one of `LayoutGrid`, `Building2`, `LayoutDashboard`.
- **D-02 (Claude's discretion):** Prefer `LayoutDashboard` — it literally communicates "dashboard," the card's headline noun. Planner may pick `Building2` instead if the surrounding feature-card icon set already leans property/building imagery (researcher to check for visual consistency with sibling cards).

### CONS-03 — homepage active-nav state
- **D-03:** Fix the nav active-state matcher so that on `/` no link receives `aria-current="page"` incorrectly (specifically "Compare" must not highlight). Root-cause the matcher logic — likely a `pathname.startsWith(...)` or loose-prefix match that treats `/` as a prefix of `/compare`. Fix is exact-path matching for the home link and correct prefix scoping for others.
- **D-04:** The fix applies to the marketing navbar — `src/components/layout/navbar/navbar-desktop-nav.tsx` and `navbar-mobile-menu.tsx` (both reference `aria-current`). Keep `aria-current="page"` correct for genuinely-active routes; only the false-positive on `/` is in scope.

### CONS-11 — Resources dropdown dead links
- **D-05:** Every Resources nav dropdown item must point to a real, existing route (no `href="/#"`, no `href="#"`). Researcher must FIRST locate the Resources dropdown definition — a `grep` for literal `href="/#"` returned zero matches, so the dead link is either (a) already partially fixed, (b) expressed via a nav config/data object rather than literal JSX, or (c) a different placeholder pattern. Verify against the live audit finding before planning the fix.
- **D-06:** Dead items resolve to their real destinations (e.g. blog, resources hub, FAQ, support, security, legal pages — whichever the dropdown lists). If a dropdown item has no real destination yet, remove the item rather than linking to a placeholder.

### Claude's Discretion
- Exact icon (within the 3 ROADMAP-approved options).
- The precise matcher refactor for CONS-03, provided `/` no longer false-highlights and real active states still work.
- Whether to remove vs re-point any Resources item that genuinely has no destination.

</specifics>
<specifics>
## Specific Ideas

- Audit source: external UI audit 2026-05-08 (`audit-ui-2026-05-08.md`, project root) — findings CONS-02, CONS-03, CONS-11.
- This phase mirrors the Phase 7 pattern: small, well-scoped audit fixes; expect regression-pinning tests for each fix (icon present, `aria-current` correctness on `/`, dropdown hrefs non-placeholder).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit source
- `audit-ui-2026-05-08.md` (project root) — CONS-02 / CONS-03 / CONS-11 finding text

### Code touchpoints (verify during research)
- `src/components/sections/features-section.tsx` — Multi-Property Dashboard feature card (CONS-02)
- `src/components/layout/navbar/navbar-desktop-nav.tsx` — desktop nav active-state logic (CONS-03)
- `src/components/layout/navbar/navbar-mobile-menu.tsx` — mobile nav active-state logic (CONS-03)
- Resources dropdown definition — LOCATE during research (CONS-11; no literal `href="/#"` found by grep)

### Project rules
- `CLAUDE.md` — zero-tolerance rules (lucide-react only, no inline styles, no hex/rgb, no `bg-white`); Accessibility section (`aria-current` on breadcrumbs/nav)

</canonical_refs>

<deferred>
## Deferred Ideas

None — phase scope is the 3 audit findings only. Any nav restructure or new dropdown items are out of scope for v1.0.

</deferred>

---

*Phase: 08-nav-active-states*
*Context gathered: 2026-05-20 via /gsd-discuss-phase 8 --auto*
