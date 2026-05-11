# Phase 10: CTA & Conversion Standardization — Context

**Gathered:** 2026-05-11
**Status:** Implementation complete; TRUST-01/02 deferred per zero-customer reality

<domain>
## Phase Boundary

Seven requirements: CONS-06 (CTA labels), CONS-07 (neutral `/compare/*` framing), CONS-08 (`/contact` form default), TRUST-01 (testimonials), TRUST-02 (review badges), TRUST-03 (monitored inboxes), TRUST-04 (auto-derived from above).

**In scope (shipped this PR):**
- CONS-06: replaced "Talk to Sales", "Connect with sales", "Schedule a walkthrough" with canonical "Contact Sales" across `/about`, `/pricing` (4 string swaps).
- CONS-07: added `'na'` variant to `FeatureSupport` type + `FeatureIcon` renderer (neutral `Minus` in `text-muted-foreground`); flipped 3 ACH/Payment Processing rows + 1 HOA Management row in `compare-data.ts` from `'no'` (red ✗) to `'na'` with positioning-anchored notes.
- CONS-08: `/contact` form "How did you hear about us?" SelectValue placeholder changed from "Select an option" to "Please select" — explicit-action ask, no false-positive Search-Engine bias.

**Deferred to post-customer (TRUST-01, TRUST-02):**
- TRUST-01 real testimonials: zero current customers. Per Phase 4 lesson ("Phase 67 deleted fabricated testimonials"), fabricating quotes is REJECTED. Wait until first 3 paying customers exist + opt-in to public quote.
- TRUST-02 G2/Capterra/Trustpilot review badges: same reality — no reviews exist yet. Document deferred here; revisit after customer feedback accumulates.

**TRUST-03 — Monitored inbox documentation (shipped):**
- `security@tenantflow.app` — already documented in `/security-policy` (24h acknowledgement, 72h assessment, 90d coordinated disclosure). Inbox monitored by orchestrator account.
- `sales@tenantflow.app` — added to security-policy footer with same monitoring SLA (response within 1 business day).

**Out of scope** (deferred to other phases):
- Real testimonials integration mechanism (component already exists at `src/components/sections/testimonials-section.tsx`; gates on `testimonials.length === 0`).
- Customer migration testimonial collection workflow.
- G2/Capterra/Trustpilot listing creation (operational, not code).

**Branch:** `gsd/phase-10-cta-conversion`
**Phase requirement IDs:** CONS-06, CONS-07, CONS-08, TRUST-01 (deferred), TRUST-02 (deferred), TRUST-03, TRUST-04
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens.
</domain>

<decisions>
## Implementation Decisions

### CONS-06 — Canonical "Contact Sales" label
Standardize on "Contact Sales" sitewide. Variants killed: "Talk to Sales", "Connect with sales", "Schedule a walkthrough", "Schedule a demo".

### CONS-07 — Neutral framing for positioning choices
Added `'na'` variant to `FeatureSupport` (`'yes' | 'no' | 'partial' | 'addon' | 'na'`). Renders as muted-foreground Minus, not destructive red X. Flipped ACH/Payment Processing (3 rows) and HOA Management (1 row) in `compare-data.ts`.

Rows that genuinely lack a feature (red ✗) keep `tenantflow: 'no'`. Rows that don't have a feature **by design** use `tenantflow: 'na'` + a `tenantflowNote` like "By design — landlord-only platform".

### CONS-08 — Contact form placeholder
Form field "How did you hear about us?" — placeholder is "Please select" (explicit ask). Default to a specific value would skew first-touch attribution to false positives.

### TRUST-01 / TRUST-02 — Honest deferral
Both require real customer data. Zero customers today. Fabricating testimonials or badges would re-introduce the exact problem Phase 67 + Phase 4 (COPY-02 social proof) killed. Deferred; component scaffolding ready for real data when it exists.

### TRUST-03 — Inbox monitoring documentation
- `security@tenantflow.app` — public via `/security-policy` § 2 (vulnerability disclosure)
- `sales@tenantflow.app` — added to `/security-policy` § 7 (general contact) as separate channel with 1-business-day SLA

</decisions>

<canonical_refs>
## Canonical References
- `.planning/REQUIREMENTS.md § CONS-06..08, TRUST-01..04`
- `.planning/ROADMAP.md § Phase 10`
- `src/types/sections/compare.ts` (FeatureSupport union)
- `src/app/compare/[competitor]/compare-sections.tsx` (FeatureIcon renderer)
- `src/app/compare/[competitor]/compare-data.ts` (feature row data)
- `src/components/contact/contact-form-fields.tsx`
- `src/components/sections/testimonials-section.tsx` (testimonials-empty-state gating, Phase 67)
- `src/app/security-policy/page.tsx`
- `CLAUDE.md`

</canonical_refs>

<deferred>

- **TRUST-01 real testimonials** — reactivate when first 3 paying customers opt-in. Implementation surface already exists in `testimonials-section.tsx`. Pass `testimonials={[...]}` from a server component fetching real quotes.
- **TRUST-02 review badges** — reactivate when reviews exist on G2/Capterra/Trustpilot. Component lift is small (badge row above footer).
- **Customer testimonial collection workflow** — separate ops process (email outreach + opt-in form), not v1.0 code work.
- **Featured-page top-nav CTA pill consolidation** — only one CTA pill currently exists on `/features` per Phase 9 cleanup; nothing to consolidate. Roadmap line satisfied trivially.

</deferred>

---

*Phase 10 context locked: 2026-05-11*
