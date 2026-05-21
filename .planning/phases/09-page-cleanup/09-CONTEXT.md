# Phase 9: Page-Level Cleanup - Context

**Gathered:** 2026-05-20 (via /gsd-discuss-phase 9 --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

Three marketing/legal page-level audit fixes, scoped by ROADMAP Phase 9 (requirements CONS-04, CONS-13, CONS-14):

1. **CONS-04** — Legal-page `Last Updated:` dates must be honest + consistent: no future dates, no stale Oct-2025 entries. Pages: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/security-policy/page.tsx`.
2. **CONS-13** — The Trusted Integrations row (`src/components/sections/logo-cloud.tsx`) must render all 5 logos (Stripe, Vercel, DocuSeal, Resend, Supabase) at consistent visual weight — fix the faded Supabase logo.
3. **CONS-14** — The "Why Landlords Choose TenantFlow" comparison table is duplicated on the homepage (`src/app/marketing-home.tsx`) and `/features` (`src/components/sections/comparison-table.tsx`). De-duplicate: keep on one surface.

Token-alignment + bug-fix only — NOT a page redesign. No new hex/rgb/`bg-white`/inline-style tokens.
</domain>

<decisions>
## Implementation Decisions

### CONS-04 — legal-page Last Updated dates
- **D-01:** Each of the three legal pages' `Last Updated:` value must reflect the actual most-recent revision date of that page's content. No future dates; no stale Oct-2025 placeholder.
- **D-02:** A sitemap drift-guard test already couples legal-page dates to `src/app/sitemap.ts` constants (added in the SEO PR — it `readFileSync`s the page bodies and asserts the date matches the sitemap constant). Any date change MUST update both the page body AND the corresponding `sitemap.ts` constant in lockstep so the drift-guard test stays green. Researcher must locate the exact constants and current values.
- **D-03 (Claude's discretion):** If a page's content has not genuinely changed, the honest date is its last real content revision (from `git log` on that file) — not "today." Prefer the true git-history revision date over a fresh stamp.

### CONS-13 — Trusted Integrations logo weight
- **D-04:** In `logo-cloud.tsx`, the Supabase logo renders faded relative to the other 4. Bring all 5 to consistent visual weight. Root-cause the fade (likely a per-logo opacity/grayscale class, a missing dark-mode variant, or an asset issue) and fix so all 5 match.

### CONS-14 — duplicate "Why Landlords Choose" table
- **D-05:** Keep the comparison table on **`/features`** only; remove it from the homepage (`marketing-home.tsx`). Rationale: deep feature/competitor comparison belongs on the features page; the homepage stays lean and scannable. Researcher must confirm the table currently renders on both surfaces and identify the exact homepage render site to remove.
- **D-06 (Claude's discretion):** If research finds the two instances are already meaningfully differentiated (different content/framing per surface), flag it — keeping both differentiated instances is the ROADMAP's allowed alternative. Default is remove-from-homepage.

### Claude's Discretion
- Exact honest dates per legal page (from git history).
- The precise CSS/asset fix for the faded Supabase logo.
- Whether to remove vs differentiate the duplicate table (default: remove from homepage).

</decisions>

<specifics>
## Specific Ideas

- Audit source: external UI audit 2026-05-08 (`audit-ui-2026-05-08.md`, project root) — findings CONS-04, CONS-13, CONS-14.
- Unlike Phases 7-8 (test-only), Phase 9 likely requires REAL production edits (date strings, a logo style fix, a table removal). Expect production-code changes plus regression-pinning tests. The legal-date drift-guard test is the existing safety net for CONS-04.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit source
- `audit-ui-2026-05-08.md` (project root) — CONS-04 / CONS-13 / CONS-14 finding text

### Code touchpoints (verify during research)
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/security-policy/page.tsx` — legal pages (CONS-04)
- `src/app/sitemap.ts` + `src/app/sitemap.test.ts` — legal-date constants + drift-guard test (CONS-04 lockstep)
- `src/components/sections/logo-cloud.tsx` — Trusted Integrations row (CONS-13)
- `src/app/marketing-home.tsx` — homepage comparison-table render site (CONS-14)
- `src/components/sections/comparison-table.tsx` — the "Why Landlords Choose" table component (CONS-14)

### Project rules
- `CLAUDE.md` — zero-tolerance rules (no inline styles, no hex/rgb, no `bg-white`, lucide-react only); Accessibility section

</canonical_refs>

<deferred>
## Deferred Ideas

None — phase scope is the 3 audit findings only.

</deferred>

---

*Phase: 09-page-cleanup*
*Context gathered: 2026-05-20 via /gsd-discuss-phase 9 --auto*
