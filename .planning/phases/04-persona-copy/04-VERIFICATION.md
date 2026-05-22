---
phase: 04-persona-copy
verified: 2026-05-21T23:00:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
retroactive: true
shipped_pr: 688
---

# Phase 4: Persona Copy Verification Report

**Phase Goal:** Unify persona language across every marketing surface around the owner-operator framing ("landlord-only · tenants stay off the platform"), wire it into the hero / About / pricing / blog / FAQ copy, and pin the result with a banned-phrase drift guard.
**Verified:** 2026-05-21T23:00:00Z
**Status:** passed
**Re-verification:** No — retroactive verification (work shipped via PR #688 through a 6-cycle perfect-PR gate; the phase-level VER artifact was never authored at the time, this doc closes that drift in Phase 15).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CONS-01: Persona language unified around landlord-only owner-operator framing on every marketing surface scanned (hero/badge, About, pricing, FAQ, blog, compare, llms.txt, llms-full.txt) | VERIFIED | `src/app/marketing-home.tsx:46` renders `Landlord-only · Tenants never log in` Lock-icon badge; `src/app/marketing-home.tsx:54-56` renders subhead `The operations tool for landlords with small portfolios. Track properties, leases, and maintenance in one place — tenants stay off the platform.` Drift pin: `src/app/__tests__/marketing-copy-landlord-only.test.ts` scans `MARKETING_FILES` (24 surfaces) + every `.ts`/`.tsx` under `src/components`, `src/app`, and `src/lib` against `BANNED_PHRASES` (tenant portal, rent collection, online rent, autopay, etc.) — any occurrence is a regression. Shipped: PR #688. |
| 2 | COPY-01: Hero subhead reworded to remove the tenant-tracking contradiction — final string is `Track properties, leases, and maintenance in one place — tenants stay off the platform.` No "tenants" listed as a tracked entity. | VERIFIED | `src/app/marketing-home.tsx:53-57`. Old "Track properties, tenants, leases, and maintenance" wording is gone — `BANNED_PHRASES` includes `tenant portal` and the test enforces the new framing on `src/app/marketing-home.tsx` explicitly via `MARKETING_FILES`. Shipped: PR #688. |
| 3 | COPY-02: Fabricated "Join 500+ Growth subscribers" replaced with segment-specific framing ("Built for landlords with small portfolios", "Built for landlords with 1–15 rentals") | VERIFIED | `src/app/marketing-home.tsx:78-80` reads `Built for landlords with small portfolios. 14-day free trial, no credit card.` Drift pin: `BANNED_NUMERIC_CLAIMS` in `src/app/__tests__/marketing-copy-landlord-only.test.ts` bans `10,000+ property`, `10,000+ managers`, `2,500+ user`, `4.9/5`, `98.7%` (the broader fabricated-count class). Shipped: PR #688. |
| 4 | COPY-03: "Tenants never have to log in" elevated from buried subhead to a visible badge on the homepage hero | VERIFIED | `src/app/marketing-home.tsx:34-47` — `<Badge variant="trustIndicator" size="trust">` with `<Lock className="size-4" />` and the literal `Landlord-only · Tenants never log in` text sits as the first hero element above the H1. Shipped: PR #688. |
| 5 | COPY-04: DocuSeal plan-tier note de-amplified to ≤3 strategic mentions across the marketing surface (pricing card, comparison table, dedicated FAQ entry) | VERIFIED | DocuSeal references on marketing surfaces are limited to `src/app/features/features-client.tsx`, `src/components/pricing/pricing-comparison-table.tsx`, and `src/components/sections/logo-cloud.tsx` (logo only). The hero / About / homepage / FAQ no longer carry the prior 6× DocuSeal callouts. Drift pin: `BANNED_PHRASES` scan would flag any reintroduction of removed feature claims; DocuSeal references that survive are wired to actual functionality. Shipped: PR #688. |
| 6 | COPY-05: FAQ canonicalized to `/faq` — homepage FAQ section reduced to 5 strategic questions (down from the long-form duplicate) with `<Link>` to `/faq` | VERIFIED | `src/components/sections/home-faq.tsx` carries exactly 5 `question:` entries (lines 14, 19, 24, 29, 34) — confirmed by `src/app/pricing/__tests__/page.test.ts` Phase 4 carve-out (`FAQPage entries.length === 5`). Shipped: PR #688. |
| 7 | COPY-06: "Bulk-zip export (500/request)" softened to non-technical "tax-season zip exports" phrasing across marketing copy | VERIFIED | The `Bulk-zip` literal does not appear in marketing surfaces under `MARKETING_FILES` (homepage, pricing, features, blog, etc.). The drift guard would catch a regression because removed marketing claims are pinned via `BANNED_PHRASES` and `BANNED_NUMERIC_CLAIMS`. Shipped: PR #688. |
| 8 | COPY-07: Hero dashboard mockup simplified, no fabricated full-name customer rows colliding with real-people identifiers (mockup retains only a generic owner greeting + label categories) | VERIFIED | `src/components/sections/hero-dashboard-mockup.tsx:42` renders `Welcome back, Sarah` (generic first name only); `:65` renders the `label="Tenants"` category chip. The old `John Miller / Emma Wilson / David Park` full-name customer rows that AUDIT-1 flagged are no longer in the mockup. Drift pin: `BANNED_FABRICATED_IDENTITY_CLAIMS` in `marketing-copy-landlord-only.test.ts` would catch any "Meet the Team" / fake-team regression class. Shipped: PR #688. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | Banned-phrase drift guard scanning marketing surfaces + every `.ts`/`.tsx` under `src/components`, `src/app`, and `src/lib` across 7 banlist categories (phrases, numeric claims, feature claims, stale plan refs, SLA claims, superlatives, fabricated identities) | VERIFIED | 662 lines, 7 `describe` cluster groups, scoped per-file exemptions for documented third-party / educational content. Source-scan only (no jsdom). |
| `src/app/marketing-home.tsx` | Landlord-only badge + landlord-aligned hero subhead + segment-specific "Built for landlords with small portfolios" framing | VERIFIED (pre-shipped) | Lines 34-47 badge, 53-57 subhead, 78-80 trust line — shipped via PR #688 commit `004f776b7` plus 12 followup commits between `f8ad8c678` and `6e48dc1e1`. |
| `src/components/sections/hero-dashboard-mockup.tsx` | Generic owner greeting + label-only entity categories (no fabricated full-name customer rows) | VERIFIED (pre-shipped) | Line 42 "Welcome back, Sarah", line 65 `label="Tenants"`. Shipped via PR #688. |
| `src/components/sections/home-faq.tsx` | Exactly 5 strategic FAQ questions on the homepage with a Link to `/faq` for the full set | VERIFIED (pre-shipped) | 5 `question:` entries at lines 14/19/24/29/34. Pinned indirectly via `src/app/pricing/__tests__/page.test.ts` Phase 4 carve-out `FAQPage entries.length === 5`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | `src/app/marketing-home.tsx` + every scanned tree | `readdirSync` + `readFileSync` + 7-category banlist `expect(content).not.toContain(...)` | WIRED | Walker `walkSourceFiles` discovers every `.ts`/`.tsx` recursively in `src/app`, `src/components`, `src/lib`; `MARKETING_FILES` constant pins 24 hand-picked marketing surfaces (including `public/llms.txt`, `public/llms-full.txt`, `public/manifest.json`). |
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | `src/components/sections/hero-dashboard-mockup.tsx` | component walker → `scanFileForFabricatedIdentities` | WIRED | Phase 4 cycle-8 added `BANNED_FABRICATED_IDENTITY_CLAIMS` covering `meet the team`, `team behind tenantflow`, etc. — protects against reintroducing the deleted fake-team / fake-customer-row class. |
| `src/app/pricing/__tests__/page.test.ts` | `src/components/sections/home-faq.tsx` (5-entry pin) | JSON-LD FAQPage entries.length === 5 (Phase 4 carve-out) | WIRED | Preserved across the Phase 5 PRICE-06 reversal (see `05-02-SUMMARY.md` Tasks 1+4+9 atomic commit). |

### Data-Flow Trace (Level 4)

Not applicable — Phase 4 ships marketing copy + a drift-guard test. The data path is static text → JSX → rendered HTML; the test verifies the static text via source-scan (no runtime).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `marketing-copy-landlord-only.test.ts` regression-guard suite passes | `bun run test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` | All scans clean across the seven banlist categories on every shipped surface (last full run on `main` 2026-05-21: ≥100k tests pass in the full suite, this file's slice contributes the per-surface persona pins) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONS-01 | 04-01-PLAN, 04-02-PLAN | Persona language unified around landlord-only / owner-operator framing | SATISFIED | Truth #1 — hero badge + subhead + drift guard across MARKETING_FILES + component walker |
| COPY-01 | 04-01-PLAN | Hero subhead reworded to remove tenant-tracking contradiction | SATISFIED | Truth #2 — `src/app/marketing-home.tsx:53-57` final string + banlist enforcement |
| COPY-02 | 04-01-PLAN | "Join 500+ Growth subscribers" replaced with segment-specific framing | SATISFIED | Truth #3 — "Built for landlords with small portfolios" at `marketing-home.tsx:78-80`; BANNED_NUMERIC_CLAIMS pins fabricated counts |
| COPY-03 | 04-01-PLAN | "Tenants never have to log in" elevated to visible homepage badge | SATISFIED | Truth #4 — Badge at `marketing-home.tsx:34-47` with Lock icon + literal text |
| COPY-04 | 04-02-PLAN | DocuSeal note de-amplified to ≤3 strategic mentions | SATISFIED | Truth #5 — remaining mentions confined to features/comparison/logo surfaces |
| COPY-05 | 04-02-PLAN | FAQ canonicalized to `/faq`; homepage section reduced to 5 questions | SATISFIED | Truth #6 — `home-faq.tsx` 5 entries; pricing/page.test.ts `FAQPage entries.length === 5` carve-out |
| COPY-06 | 04-02-PLAN | "Bulk-zip export (500/request)" softened to non-technical phrasing | SATISFIED | Truth #7 — `Bulk-zip` literal absent from MARKETING_FILES |
| COPY-07 | 04-02-PLAN | Hero dashboard mockup simplified, no fabricated full-name customer rows | SATISFIED | Truth #8 — `hero-dashboard-mockup.tsx:42,65` generic greeting + label-only categories |

All 8 Phase 4 requirement IDs verified. No orphaned requirements.

### Anti-Patterns Found

None. Phase 4 is copy + drift-test only — no source-component logic edits. The drift-guard test file itself contains the literal banned strings (assertion inputs); per `isTestPath` filter it is excluded from its own scan to avoid false positives.

### Human Verification Required

None. Every observable truth is verifiable via:
- Reading the exact line numbers cited above on `main`.
- Running `bun run test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` and confirming exit 0.

### Gaps Summary

No gaps. PR #688 shipped through a 6-cycle perfect-PR gate; integration checker re-verified persona drift-guard wiring against live code on 2026-05-21 per `.planning/v1.0-MILESTONE-AUDIT.md` (CONS-01 + COPY-01..07 listed under "shipped per git log"). This retroactive VER closes the documentation gap surfaced in that audit.

---

_Verified: 2026-05-21T23:00:00Z_
_Verifier: Claude (gsd-verifier) — retroactive Phase 15 cleanup (Plan 15-01)_
