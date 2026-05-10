# Phase 4: Persona & Copy Honesty — Context

**Gathered:** 2026-05-10
**Status:** Ready for research → planning
**Source:** UI audit `audit-ui-2026-05-08.md` (items #7, #21–#27) + Q&A round during /gsd-new-project + Phases 1–3 lessons logged

<domain>
## Phase Boundary

Phase 4 unifies the marketing surface around ONE persona word, fixes the hero subhead contradiction, replaces fabricated social proof with honest segment-specific framing, elevates the "tenants never log in" differentiator, de-amplifies DocuSeal plan-tier mentions, canonicalizes FAQ to `/faq`, softens technical jargon ("bulk-zip 500/request"), and reviews the hero dashboard mockup. Pure-frontend; no DB, no migration, no Stripe.

**In scope (8 requirements):**
- **CONS-01:** persona language unified across all marketing pages — global find-and-replace after research-driven word selection
- **COPY-01:** hero subhead reworded — eliminate "track tenants" / "tenants never log in" contradiction
- **COPY-02:** replace "Join 500+ Growth subscribers" with "Built for landlords with 1–15 rentals" (LOCKED — segment-specific framing, no fabricated count)
- **COPY-03:** "Tenants never have to log in" elevated from buried subhead to visible badge / dedicated section above the fold
- **COPY-04:** DocuSeal plan-tier note de-amplified to ≤3 strategic mentions (currently 6× per audit)
- **COPY-05:** FAQ canonicalized — homepage + `/pricing` FAQ sections reduced to ≤5 entries each with link to canonical `/faq`
- **COPY-06:** "Bulk-zip export (500 / request)" softened to non-technical phrasing across all surfaces
- **COPY-07:** Hero dashboard mockup names reviewed — drop "John Miller" / "Emma Wilson" / "David Park" if collision with real people; consider simpler mockup

**Out of scope** (deferred):
- CTA label canonicalization on non-pricing surfaces (`pricing-content.tsx:147` "Connect with sales", `:180` "Schedule a walkthrough") → Phase 10 (TRUST-03)
- Real testimonials / review badges → Phase 10 (TRUST-01..02)
- Pricing tier numbers → Phase 5 (PRICE-06; this phase locks Custom placeholder for Max via Phase 1's CRIT-03 work)
- Any blog / `/resources` page changes → Phase 6 (Blog Rebuild) and Phase 11 (TOKEN-02)
- New testimonial sourcing → Phase 10 (TRUST-01)

**Branch:** `gsd/phase-04-persona-copy`
**Phase requirement IDs:** CONS-01, COPY-01, COPY-02, COPY-03, COPY-04, COPY-05, COPY-06, COPY-07
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens. The token-grep gate runs on the diff and trivially passes if we keep the work to copy edits + tasteful Tailwind class additions.
</domain>

<decisions>
## Implementation Decisions

### CONS-01: Persona Word Selection (LOCKED — researcher picks during this phase)

- **Method:** per-phase researcher surveys 5+ comparable B2B SaaS products serving small-portfolio landlords / property owners / real estate investors. Documents each product's persona terminology with citations.
- **User Q&A signal (May 2026):** rejected bare "landlord" as too narrow. Open to "Property owner", "Owner-operator", "Rental investor" — leaning owner-operator. Did NOT pick definitively; deferred to research.
- **Constraints:** ONE word/phrase, applied consistently across hero, About, FAQ, meta descriptions, headlines. Must support SEO (searchable) AND conversion (resonates with the buyer's self-identity).
- **Recommendation lock-in:** researcher returns a recommendation; planner adopts unless user overrides. CONS-01 final word is locked at planning time (NOT during execution — execution is a global find-and-replace).
- **Implementation primitive:** sitewide find-and-replace across `src/app/marketing-home.tsx`, `src/app/about/page.tsx`, `src/app/pricing/page.tsx`, `src/app/faq/page.tsx`, `src/app/contact/page.tsx`, `src/app/compare/[competitor]/page.tsx`, root `layout.tsx` metadata, OG metadata, JSON-LD schemas where persona appears.

### COPY-01: Hero Subhead Reword (LOCKED — wording derived from research)

- **Current state** (per audit): "Track properties, tenants, leases, and maintenance in one place — tenants never have to log in"
- **Contradiction:** the verb "track tenants" + clause "tenants never log in" reads odd to prospects (tenants = records vs tenants = users).
- **Recommendation seed (CONTEXT lock):** something like "...tenant records, leases, and maintenance in one place — landlord-only, tenants stay off the platform" — final wording set during research/plan based on persona-word decision.
- **Constraint:** preserve the strongest differentiator ("tenants never log in" or equivalent) — this is COPY-03's elevation target.

### COPY-02: Social-Proof Replacement (LOCKED)

- **Replacement:** "Built for landlords with 1–15 rentals" (segment-specific framing — NO fabricated count).
- **User decision context:** zero current subscribers; user accepted the "honest framing" recommendation over fake "500+". Documented in `.planning/PROJECT.md` Key Decisions.
- **Sites of substitution:** wherever "Join 500+ Growth subscribers" or similar fabricated-count claims appear. Researcher locates all instances.
- **Note:** this phrase uses "landlords" — even though CONS-01 might pick "property owner" or "owner-operator" as the primary persona word, this specific framing is locked at "landlords with 1–15 rentals" because:
  1. It's segment-specific (anchored in number of rentals) — narrower than the persona word
  2. It accommodates the spectrum of buyers (some self-identify as landlords, some as investors)
  3. SEO long-tail value of "landlords with 1–15 rentals" is the practical phrase
  - **If the researcher recommends keeping "landlords" alongside the new persona word**, document the dual-language strategy in the plan.

### COPY-03: Tenants-Never-Login Elevation (LOCKED)

- **Goal:** prospects spot the differentiator within 3 seconds on the homepage. Currently buried at the end of the hero subhead.
- **Implementation options** (researcher recommends; planner picks):
  1. Visual badge in the hero (e.g., a `<Badge variant="outline">` near the heading)
  2. Dedicated mini-section above the bento grid ("Why landlord-only?")
  3. Featured pill in the value-prop list
- **Constraint:** uses globals.css tokens only. No new SVGs, no new icons beyond lucide-react.

### COPY-04: DocuSeal De-Amplification (LOCKED)

- **Current state** (per audit): mentioned 6× across cards / comparison table / FAQ / footer.
- **Target:** ≤3 strategic mentions. The 3 strategic surfaces:
  1. Pricing card (Plan tier limit — already canonical per Phase 1)
  2. Comparison table row (one row, not multiple)
  3. Dedicated FAQ entry (one entry on `/faq`)
- **Sites to remove from:** wherever DocuSeal is mentioned redundantly outside the 3 strategic surfaces. Research locates them.

### COPY-05: FAQ Canonicalization (LOCKED)

- **Canonical FAQ surface:** `/faq` page — full FAQ list lives here.
- **Reduce homepage FAQ to ≤5 entries** with "See all FAQs" link to `/faq`. Same for `/pricing` page FAQ.
- **Goal:** kill duplicate-content SEO penalty.
- **Constraint:** the 5 entries on each page should be the most relevant to that surface (homepage = top-of-funnel; pricing = pricing-related).

### COPY-06: Bulk-Zip Phrasing Softened (LOCKED)

- **Current:** "Bulk-zip export (500 / request)" — technical limit shouted at non-technical landlords.
- **Replacement:** "Tax-season zip exports" or "Bulk download for tax season" (researcher picks consistent wording).
- **Sites:** wherever "500 / request" or "bulk-zip" appears in copy (NOT in code — backend limits stay).

### COPY-07: Hero Dashboard Mockup Names (LOCKED)

- **Current names:** "John Miller", "Emma Wilson", "David Park" (per audit).
- **Risk:** name collision with real people, brand confusion.
- **Action:**
  1. Replace with non-real names (e.g., "Jamie Carter", "Alex Rivera", "Sam Chen") OR placeholders ("Tenant 1", "Property A").
  2. Researcher recommends + planner picks. Final names should be obviously synthetic but realistic enough to feel like a real dashboard.
- **Optional:** simpler mockup with fewer KPI cards and one workflow per breakpoint. Planner decides scope; can be deferred to v2.0+ if it's a redesign rather than a name swap.

### Phase 1+2+3 Lessons Carried Forward

- **Live verification matters.** After deploy, manually visit the homepage, About, FAQ, Pricing, Compare pages. Confirm persona word is consistent everywhere. Spot-check via curl + grep.
- **Don't trust research-only recommendations.** Live curl after deploy.
- **Don't introduce `loading.tsx` returning null.** Phase 1 anti-pattern.
- **Hydration race patterns** (Phase 2): N/A — copy edits don't introduce new client components.
- **301 vs 308 was harmonized in Phase 3** as 308 (`permanent: true`). This phase doesn't touch redirects.

### Cross-Cutting Design-Token Constraint

Every visual change uses canonical `globals.css` tokens. For COPY-03 (badge or mini-section): use `--color-accent` or `--color-primary` for emphasis; `bg-card` or `bg-muted` for backgrounds; standard `--radius-*` and `--shadow-*` scales. NEVER inline ms / hex / rgb / `bg-white`.

### Claude's Discretion

- Specific test names + structure
- Whether the persona word change requires snapshot tests for marketing pages (likely yes — to lock the contract)
- Plan file decomposition (planner picks; suggested 2-plan split below)
- Whether COPY-07 dashboard mockup polish stays in Phase 4 or defers to v2.0+ (planner recommends)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 research artifacts (specialists will produce)
- `.planning/phases/04-persona-copy/04-RESEARCH.md` — canonical synthesis (read FIRST)
- `.planning/phases/04-persona-copy/04-RESEARCH-persona-terminology.md` — Specialist 1: comparable-product persona survey
- `.planning/phases/04-persona-copy/04-RESEARCH-copy-audit.md` — Specialist 2: locate all current copy surfaces (DocuSeal mentions, "Join 500+", FAQ duplication, etc.)

### Project context
- `.planning/PROJECT.md § Key Decisions` — locked v1.0 decisions (CTA = "Contact Sales", "Built for landlords with 1–15 rentals" replaces "Join 500+", DocuSeal ≤3 mentions, FAQ canon to /faq, footer "Powered by Hudson Digital" KEPT, testimonials no headshots → Phase 10)
- `.planning/REQUIREMENTS.md § Critical-Block Marketing Spend (CRIT)` — none in Phase 4 scope
- `.planning/REQUIREMENTS.md § Consistency (CONS)` — CONS-01 only; CONS-02..14 are other phases
- `.planning/REQUIREMENTS.md § Copy & UX Refinement (COPY)` — all 7 entries are Phase 4 scope
- `.planning/ROADMAP.md § Phase 4` — phase goal + 9 success criteria
- `audit-ui-2026-05-08.md` (project root) — items #7, #21–#27
- `.planning/phases/{01,02,03}-*/0*-VERIFICATION.md` — Phases 1+2+3 lessons (live-verification mandate)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules; metadata patterns; accessibility (aria-label on icon-only buttons)
- `src/app/globals.css` — token authority

### Existing-pattern references (specialists locate + read)
- `src/app/marketing-home.tsx` — hero subhead + CTA wrapper (already touched in Phase 2)
- `src/app/about/page.tsx` — persona language
- `src/app/faq/page.tsx` — full FAQ (canonical surface)
- `src/components/sections/home-faq.tsx` — homepage FAQ (to reduce)
- `src/app/pricing/page.tsx` — pricing FAQ + JSON-LD
- `src/app/pricing/pricing-content.tsx` — has FAQ + sales-CTA labels (some line items deferred to Phase 10)
- `src/app/compare/[competitor]/page.tsx` — comparison page persona language
- `src/app/contact/page.tsx` — persona language
- `src/components/landing/feature-callouts.tsx` — DocuSeal mentions
- `src/components/landing/bento-features-section.tsx` — "Bulk-zip" + DocuSeal
- `src/components/sections/how-it-works.tsx` — DocuSeal step
- `src/components/pricing/pricing-comparison-table.tsx` — DocuSeal row + plan-tier limits (CRIT-03 already touched)
- Root layout metadata + OG metadata — persona word in description / Twitter cards
- Hero dashboard mockup component (researcher locates) — names to swap

### Memory references
- `feedback_perfect_pr_gate.md` — 2 zero-finding cycles required for merge
- `branch-protection-config.md` — required CI checks: `checks`, `e2e-smoke`, `rls-security`

</canonical_refs>

<specifics>
## Specific Ideas

- **Suggested plan decomposition:** 2 plans. Plan 04-01 covers persona-language unification + hero subhead + social-proof replacement (CONS-01, COPY-01, COPY-02, COPY-03). Plan 04-02 covers de-duplication / softening work (COPY-04 DocuSeal de-amp, COPY-05 FAQ canon, COPY-06 bulk-zip phrasing, COPY-07 dashboard mockup names). Plans are sequential (NOT parallel) because Plan 04-01's persona-word selection might affect Plan 04-02's wording in DocuSeal/FAQ entries. Researcher confirms.

- **Test additions:**
  - NEW: `tests/e2e/tests/public/persona-consistency.spec.ts` — visits each marketing page and asserts the chosen persona word appears, fabricated "500+" claim is absent, hero subhead doesn't contain the contradiction phrase, FAQ link from homepage points to `/faq`.
  - Optional snapshot test: `src/app/__tests__/marketing-copy-{landlord-only,persona,faq-canon}.test.ts` — already exists per Phase 1 search results; extend.

- **Audit verification (post-deploy live):**
  - Visit `https://tenantflow.app/`, `/about`, `/faq`, `/pricing`, `/contact`, `/compare/buildium` — confirm persona word is consistent + new social-proof phrase appears + DocuSeal mention count ≤3 site-wide.
  - Curl + grep: `curl -s URL | grep -c "DocuSeal"` should return ≤3 across ALL homepage + pricing + compare page sources.
  - Hero subhead: confirm contradiction phrase is gone.

</specifics>

<deferred>
## Deferred Ideas

These came up during planning but explicitly belong to other phases:

- **Real testimonials / review badges** → Phase 10 (TRUST-01..02)
- **CTA label canonicalization** on non-pricing surfaces → Phase 10 (TRUST-03)
- **Pricing tier numbers** → Phase 5 (PRICE-06)
- **Blog / `/resources` page rewrites** → Phase 6 + Phase 11
- **Visual redesign of bento grid** → v2.0+ (Phase 4 only modifies copy and tasteful additions like badges)
- **New SVG illustrations or photography** → out of scope; reuse existing assets
- **OG image regeneration** for the new persona word → Phase 12 (SEO-02 — per-page OG images)
- **i18n** (multi-language) → English-only is the strategic choice; out of scope

</deferred>

---

*Phase: 04-persona-copy*
*Context gathered: 2026-05-10 — pre-research lock-in*
