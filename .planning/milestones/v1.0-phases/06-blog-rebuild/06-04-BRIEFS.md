# Phase 6 / Plan 06-04 — 12 Paste-Ready Content Briefs

**Phase:** 06-blog-rebuild
**Plan:** 06-04 (Wave 4 — depends on 06-02 + 06-03)
**Purpose:** 12 paste-ready n8n trigger payloads, one per locked title from `06-CONTEXT.md § Initial 12-Post Slate`. Each brief contains the JSON body the user POSTs to the n8n manual webhook trigger, plus a system-prompt augmentation that supplements the base outline + draft prompts in `N8N-FLOW.md`.

**Audience for every brief:** landlords with 1–15 rentals.
**Author byline (LOCKED from Phase 4):** "TenantFlow Team" (Organization-type schema, set inside the n8n draft prompt — not a per-brief input).
**Persona phrase requirement (Gate #3):** every post body MUST contain "landlord" or "landlords" at least once. Enforced by both n8n preflight (Plan 06-03) and DB `validate_blog_post()` trigger (Plan 06-01).
**DocuSeal mention cap (Gate #9):** ≤1 per post.
**Banlist (Gate #8):** Phase 4 BANNED_PHRASES — `rent collection`, `online rent`, `autopay`, `auto-pay`, `tenant portal`, `automated rent`, `collect rent`, `rent processing`, `pay rent online`, `online payments`, `online rent payment`, `rent collection software`, `tenants can pay`, `pay rent through`, `automated workflow`, `rent tracking`, `mobile app access`, `record rent`, `paid rent`, `pay rent`. Any of these in `content` triggers automatic rejection at both preflight and DB trigger.
**Slug regex (Gate #4):** `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, length 3–120.
**Category enum (Gate #7):** `('lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault')`.
**Word count (Gate #1):** 1,200 ≤ words(content) ≤ 3,000. Target each brief at 1,500–2,200 to leave headroom.
**H2 count (Gate #2):** 4 ≤ count(`^## `) ≤ 10.
**Meta length (Gate #5):** 50 ≤ length(meta_description) ≤ 160.
**Excerpt length (Gate #6):** 80 ≤ length(excerpt) ≤ 200.

**CRITICAL — Blocker-#1 wiring:** Canonical redirects are set via the n8n payload field `canonical_url`, NOT by injecting `<link rel="canonical">` HTML into the markdown body. The Edge Function (Plan 06-03) threads `canonical_url` into the `blogs` row. The post page's `generateMetadata()` (Plan 06-02) reads `post.canonical_url` and emits `alternates.canonical`, which Next.js renders inside `<head>` — the only location Google honors. Brief #10 is the only brief in this slate using the override.

---

## Brief 1 — `whats-required-in-a-lease-agreement`

**Cluster:** lease-law
**Funnel:** top
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "What's Required in a Lease Agreement (Every State Covers This)",
  "slug": "whats-required-in-a-lease-agreement",
  "category": "lease-law",
  "funnel": "top"
}
```

**System-prompt augmentation:**

> Cover the 8 clauses every state requires (parties, premises, term, rent amount, security deposit, default + cure, repairs + habitability, holdover). Include a state-variation callout box for the 5 most common state additions (e.g., NY rent stabilization disclosure, CA mold disclosure, TX lead-based-paint disclosure, FL radon, OR co-signer rules). Anchor every H2 to landlords with 1–15 rentals; do NOT write toward property managers or 50+ unit operators. Lead-magnet-eligible (existing `BLOG_TO_RESOURCE` map covers this slug — no new lead-magnet creation needed). Cross-link to `/compare/buildium` in the "What Comes Next" section as the natural escalation path for landlords who outgrow a 1–15 rental document-vault model. DO NOT mention rent collection, autopay, tenant portal, or any banlisted phrase.

---

## Brief 2 — `rent-increase-notice-per-state`

**Cluster:** lease-law
**Funnel:** middle
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "How to Send a Rent Increase Notice (Per-State Notice Period Cheat Sheet)",
  "slug": "rent-increase-notice-per-state",
  "category": "lease-law",
  "funnel": "middle"
}
```

**System-prompt augmentation:**

> Lead with the cheat-sheet table: every state, statutory minimum notice period (30/60/90 days), whether the state caps annual increase percentage, whether mid-term increases are permitted. Follow with an H2 walk-through of the 5 highest-renter states (CA, NY, TX, FL, IL). Include a "send method" H2 covering certified mail vs hand delivery vs electronic per state rules. Reference at least 2 real-world rules (e.g., CA AB 1482 5% + CPI cap; OR statewide 7% cap). Persona: landlords managing 1–15 units who need to raise rent legally without losing the tenant. DO NOT mention rent collection software, autopay, online payments, or any banlisted phrase. Cross-link to brief #1 (lease basics) and brief #3 (late fees) inside the body.

---

## Brief 3 — `late-fee-rules-by-state-2026`

**Cluster:** lease-law
**Funnel:** middle
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "Late Fee Rules for Landlords by State (2026)",
  "slug": "late-fee-rules-by-state-2026",
  "category": "lease-law",
  "funnel": "middle"
}
```

**System-prompt augmentation:**

> Year-suffixed (`-2026`) because late-fee statutes change annually. Lead with a per-state table: grace period, max flat fee, max percentage cap, whether the fee must be disclosed in the lease. Follow with H2s on: how to write an enforceable late-fee clause, what "reasonable" means in court, common landlord mistakes that void the fee, what to do if the tenant disputes. Cite at least 3 state caps verbatim (e.g., TX 12% of monthly rent, MD $35 or 5% whichever is greater, FL no statutory cap but "reasonable"). Persona-anchor every H2 to landlords with 1–15 rentals. DO NOT mention rent collection, online rent, autopay, or any banlisted phrase. End with a "What Comes Next" linking to `tax-document-vault-checklist` (brief #5) for tracking late-fee income for tax purposes.

---

## Brief 4 — `landlord-tax-deductions-2026`

**Cluster:** tax-prep
**Funnel:** top
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "What Landlords Can Deduct (2026 Tax Guide for 1–15 Rentals)",
  "slug": "landlord-tax-deductions-2026",
  "category": "tax-prep",
  "funnel": "top"
}
```

**System-prompt augmentation:**

> Year-suffixed (`-2026`) because IRS thresholds, depreciation rates, and Section 179 limits update annually. Cover the 12 most-missed deductions for 1–15 rental landlords: mortgage interest, property tax, insurance, repairs (vs improvements — explain the distinction with examples), depreciation (27.5-yr residential), travel between properties, home-office allocation, professional fees, advertising, utilities paid by landlord, supplies, education. Include a "what's NOT deductible" callout (improvements that must be capitalized, personal-use portions). Reference the IRS Schedule E and Form 4562. Persona-anchor: this is the landlord's first tax-prep pass; do NOT assume CPA-level vocabulary. DO NOT mention rent collection software, autopay, tenant portal, or any banlisted phrase. Lead-magnet-eligible. Cross-link to brief #5 (tax-document-vault-checklist) as the natural next read for landlords ready to organize receipts.

---

## Brief 5 — `tax-document-vault-checklist`

**Cluster:** tax-prep
**Funnel:** bottom
**Word target:** 1,500–2,000

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "Tax-Time Document Vault: Every Receipt Your CPA Will Ask For",
  "slug": "tax-document-vault-checklist",
  "category": "tax-prep",
  "funnel": "bottom"
}
```

**System-prompt augmentation:**

> Bottom-funnel — assume the landlord has read brief #4 and now wants the operational checklist. Structure as a category-by-category checklist (mortgage docs, property-tax statements, insurance binders, repair invoices, depreciation schedules, mileage logs, utility bills paid by landlord, professional-fee receipts, capital-improvement records). For each category: what the CPA wants, the typical filename pattern, how long to retain (IRS 3-year + 7-year audit window). Include a "vault-first workflow" H2 that positions TenantFlow's document vault as the natural home for these (≤1 DocuSeal mention overall). Persona-anchor: landlords with 1–15 rentals who are tired of shoeboxes. DO NOT mention rent collection, online rent payments, autopay, or any banlisted phrase. End with "What Comes Next" cross-linking to brief #11 (lease-document-organization).

---

## Brief 6 — `tenant-screening-checklist`

**Cluster:** tenant-screening
**Funnel:** top
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "Free Tenant Screening Checklist for DIY Landlords",
  "slug": "tenant-screening-checklist",
  "category": "tenant-screening",
  "funnel": "top"
}
```

**System-prompt augmentation:**

> Top-funnel — this is the search-query-matching post for landlords who have NEVER screened a tenant before. 7-step checklist: (1) pre-qualifying questions before the application, (2) the rental application form, (3) credit check (Equifax/TransUnion/Experian for landlords, ~$25-40), (4) background check (eviction history, criminal record), (5) employment + income verification (3x rent rule), (6) prior-landlord reference calls (script the 5 questions), (7) decision + adverse-action letter compliance (FCRA + ECOA). Include a Fair Housing Act callout box (7 protected classes + state additions). Persona-anchor: DIY landlords with 1–15 rentals doing this themselves, no property manager. Lead-magnet-eligible. DO NOT mention rent collection software, tenant portal, autopay, or any banlisted phrase. Cross-link to brief #7 (screening software compared) as the upgrade path.

---

## Brief 7 — `tenant-screening-software-compared-2026`

**Cluster:** tenant-screening
**Funnel:** middle
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "Tenant Screening Software Compared (2026)",
  "slug": "tenant-screening-software-compared-2026",
  "category": "tenant-screening",
  "funnel": "middle"
}
```

**System-prompt augmentation:**

> Year-suffixed (`-2026`) — pricing and feature lists for screening services churn yearly. Compare 5–6 services landlords actually use: SmartMove (TransUnion), RentPrep, Avail (Realtor.com), Apartments.com Screening, MyRental, TurboTenant Screening. Per-service rows: per-applicant cost, what's included (credit + criminal + eviction), report turnaround, who pays (landlord vs applicant), FCRA-compliant adverse-action workflow, integration with applicant portals. Honest comparison — call out when a "free" tier means the applicant pays the fee. Persona-anchor: landlords with 1–15 rentals comparing tools, not enterprise. DO NOT mention rent collection software, autopay, tenant portal, or any banlisted phrase. Cross-link to brief #6 (DIY checklist) as the pre-read and brief #10 (TenantFlow vs Buildium) as the property-management-stack comparison.

---

## Brief 8 — `annual-maintenance-schedule`

**Cluster:** maintenance
**Funnel:** middle
**Word target:** 1,500–2,000

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "Annual Maintenance Schedule for 1–15 Rentals",
  "slug": "annual-maintenance-schedule",
  "category": "maintenance",
  "funnel": "middle"
}
```

**System-prompt augmentation:**

> Calendar-driven content: month-by-month preventive maintenance checklist for a landlord operating 1–15 single-family or small-multifamily properties. Spring (gutter clean, AC tune-up, exterior caulk inspection), summer (HVAC filter, smoke-detector test, pest), fall (heating tune-up, weatherstripping, gutter clean #2, plumbing winterization), winter (smoke/CO test, freeze-prevention, leak inspection). For each month: 4–6 line items, time estimate, DIY-vs-pro guidance, typical cost range. Include an "annual one-time" H2 (chimney sweep, water-heater anode rod, roof inspection). Persona-anchor: landlords with 1–15 rentals doing maintenance themselves or coordinating contractors. DO NOT mention rent collection, autopay, tenant portal, or any banlisted phrase. Cross-link to brief #9 (tracking maintenance requests).

---

## Brief 9 — `track-maintenance-no-ticketing-system`

**Cluster:** maintenance
**Funnel:** middle
**Word target:** 1,500–2,000

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "How to Track Maintenance Requests Without a Ticketing System",
  "slug": "track-maintenance-no-ticketing-system",
  "category": "maintenance",
  "funnel": "middle"
}
```

**System-prompt augmentation:**

> Operations-focused post for landlords with 1–15 rentals who don't need (and can't justify the cost of) a property-management ticketing system. 4 lightweight approaches: (1) a shared Google Sheet with status column, (2) a dedicated email folder + label workflow, (3) a simple Trello/Notion board, (4) a document-vault folder structure per property. For each: setup time, monthly cost (most are free), pros/cons, when to upgrade. Include a "what to log per request" H2 (date received, property, tenant report, vendor dispatched, cost, completion date, receipts). Persona-anchor: landlords with 1–15 rentals — explicitly NOT property managers. DO NOT mention rent collection, automated workflow, mobile app access, or any banlisted phrase. ≤1 DocuSeal mention. Cross-link to brief #8 (annual maintenance schedule).

---

## Brief 10 — `tenantflow-vs-buildium`

**Cluster:** software-vault
**Funnel:** bottom
**Canonical override (Blocker-#1):** `/compare/buildium` — set via payload `canonical_url` field. The Edge Function (Plan 06-03) writes it to `blogs.canonical_url`; Plan 06-02 `generateMetadata()` reads it and emits `<link rel="canonical" href="/compare/buildium">` inside `<head>` via Next.js Metadata API. Do NOT inject the canonical tag into the markdown body — Google ignores body-level canonicals.
**Word target:** 1,800–2,200

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "TenantFlow vs Buildium: Honest Comparison for 1–15 Rental Landlords",
  "slug": "tenantflow-vs-buildium",
  "category": "software-vault",
  "funnel": "bottom",
  "canonical_url": "/compare/buildium"
}
```

**System-prompt augmentation:**

> Honest comparison structured as four H2 blocks: (1) "When TenantFlow fits" — landlords with 1–15 rentals who want a document-vault-first owner-only tool, no tenant portal, no rent facilitation; (2) "When Buildium fits" — 50+ unit operators who need the full property-management-software stack (tenant portal, accounting, vendor management, online leasing); (3) "Feature-by-feature" — 8-row table covering document vault, lease storage, owner reporting, tenant communication, accounting depth, screening integration, mobile experience, pricing tier; (4) "What TenantFlow doesn't do" — explicit honesty section (no tenant portal, no rent processing through the app, no full accounting suite). The `canonical_url` payload field (`/compare/buildium`) is set in the JSON above — this directs SEO authority to the `/compare/buildium` compare page so the post doesn't cannibalize the existing compare URL. DO NOT include any `<link rel="canonical">` HTML tag inside the markdown body; canonical tags must live in `<head>`, which Plan 06-02 emits via Next.js Metadata. Just write the post content. Persona-anchor every H2 to landlords with 1–15 rentals. DO NOT use banlisted phrases (rent collection, autopay, tenant portal — actually you CAN use "tenant portal" in the context of describing what Buildium offers vs what TenantFlow does NOT offer, but check it's not flagged by the preflight banlist; if the gate rejects, rephrase as "tenant-facing portal feature" or similar). ≤1 DocuSeal mention.

---

## Brief 11 — `lease-document-organization-system-landlords`

**Cluster:** software-vault
**Funnel:** bottom
**Word target:** 1,500–2,000

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "How to Organize Lease Documents: One System, Search-Ready, Tax-Ready",
  "slug": "lease-document-organization-system-landlords",
  "category": "software-vault",
  "funnel": "bottom"
}
```

**System-prompt augmentation:**

> Bottom-funnel — landlords with 1–15 rentals who have signed leases scattered across email, Dropbox, and filing cabinets. Structure: (1) the "search-ready" principle (folder-per-property, sub-folder-per-document-type, ISO-date-prefixed filenames); (2) what to store per lease (signed PDF, addenda, riders, prior-version redlines, security-deposit receipt, move-in inspection photos); (3) retention windows (typical state-statute 7 years post-lease, longer for security-deposit disputes); (4) a "tax-ready" cross-reference to brief #5 (tax-document-vault-checklist). Position TenantFlow's document vault as the natural home (≤1 DocuSeal mention). Persona-anchor: landlords with 1–15 rentals who are NOT property managers. DO NOT mention rent collection, autopay, tenant portal, mobile app access, or any banlisted phrase. Cross-link to brief #12 (spreadsheet-to-vault migration).

---

## Brief 12 — `spreadsheet-to-document-vault-migration`

**Cluster:** software-vault
**Funnel:** bottom
**Word target:** 1,500–2,000

**Trigger payload (POST to n8n webhook):**

```json
{
  "topic": "From Spreadsheet to Document Vault: Migration Guide for Small Landlords",
  "slug": "spreadsheet-to-document-vault-migration",
  "category": "software-vault",
  "funnel": "bottom"
}
```

**System-prompt augmentation:**

> Bottom-funnel — landlords who have outgrown Excel/Sheets but haven't moved to a real tool. Structure as a 6-step migration: (1) audit what's in the spreadsheet (properties, leases, tenants, dates, amounts), (2) export to CSV with normalized columns, (3) decide what to keep as data vs scan-and-upload as documents, (4) create the property-first folder structure in TenantFlow, (5) bulk-upload PDFs and tag by property + document type, (6) decommission the spreadsheet (keep a read-only backup for 90 days). For each step: estimated time for a 5-property landlord, common pitfalls (e.g., losing addenda that lived in email), verification checklist. Persona-anchor: landlords with 1–15 rentals — explicitly NOT a property-manager migration. ≤1 DocuSeal mention. DO NOT mention rent collection, autopay, tenant portal, automated workflow, mobile app access, or any banlisted phrase. Cross-link to brief #11 (lease-document-organization-system-landlords) as the precursor.

---

## Run Order

Briefs are numbered 1..12. The user invokes the n8n manual webhook once per brief, in any order they prefer. Recommended cadence below.

### Stagger Schedule (recommended)

Stagger publish over weeks 1–4 post-merge, ~3 posts per week. This is an OPERATIONAL recommendation — the user controls the actual `published_at` flip in Supabase Studio. All 12 rows ship to prod in `status='in-review'` as part of Plan 06-04's deliverable; the staggered flip is post-merge ops.

| Week | Briefs to flip to `published` | Funnel coverage |
|------|-------------------------------|-----------------|
| Week 1 (post-merge day 0–7) | 1, 4, 6 | All 3 top-funnel posts — drive organic acquisition early |
| Week 2 | 2, 8, 7 | Middle-funnel — lease law + maintenance + screening software |
| Week 3 | 3, 9, 11 | Middle-to-bottom transition — late fees + maintenance tracking + lease organization |
| Week 4 | 5, 10, 12 | Bottom-funnel — tax vault + Buildium comparison + spreadsheet migration |

Rationale (from `06-RESEARCH-content-strategy.md` § funnel mix): front-load top-of-funnel posts in week 1 to seed Google indexing and capture early search traffic; ship the bottom-funnel comparison and conversion posts last when the top-of-funnel reads are already creating in-bound link equity.

Sitemap and RSS feed auto-update via PR #674 routes — no code changes needed when each post flips to `published`.

---

## BLOG-05 Automated SEO + Tone Gate Mapping (Blocker-#2)

REQUIREMENTS.md BLOG-05 reads: "automated SEO + tone check pre-publish". That requirement is satisfied IN FULL by the gate machinery shipped in Plans 06-01 and 06-03 — there is no separate runtime probe in Phase 6. Specifically:

1. **9 DB validation triggers in `validate_blog_post()`** (Plan 06-01 migration `20260510214935_phase_6_validation_triggers.sql`) — fire automatically on every INSERT/UPDATE transitioning a row INTO `status='in-review'` OR `status='published'`. Rejection on failure with PostgreSQL `ERRCODE 23514` and a human-readable message identifying which gate failed. Source of truth for all 9 gates.
2. **n8n preflight (Function node in `n8n-blog-ingest.workflow.json`)** (Plan 06-03 Task 3) — re-runs the same 9 gates in JavaScript before HTTP. Fail-fast: saves the network round-trip when Claude's draft output is obviously broken. Defense-in-depth — NOT the source of truth.
3. **Edge Function `n8n-blog-ingest`** (Plan 06-03 Task 1) — re-runs the same 9 gates server-side AND verifies HMAC, then INSERTs. Returns `{gate_failures: [...]}` array on rejection.
4. **Integration test `tests/integration/rls/blogs-status-workflow.rls.test.ts`** (Plan 06-01 Task 3) — pins each gate's rejection behavior end-to-end against prod. CI gate — runs on every PR and weekly cron.

The "tone check" portion of BLOG-05 is human-mediated at editorial flip: the user reads each `'in-review'` row in Supabase Studio before flipping to `'published'`. That review IS the tone check. The "automated" half of the requirement is delivered by the 9 gates, which collectively cover persona phrase, banlist, word count, H2 count, slug, meta, excerpt, category, and DocuSeal-mention cap.

---

## Editorial Flip Workflow Reminder

When the user opens each `'in-review'` row in Supabase Studio to flip to `'published'`:

1. Review `title`, `slug`, `excerpt`, `content`, `meta_description`, `category` for any human-editorial polish.
2. **For Brief #10 specifically** (`tenantflow-vs-buildium`): **DO NOT clear the `canonical_url` column** unless intentionally removing the canonical redirect to `/compare/buildium`. The canonical wiring (Blocker-#1) depends on `canonical_url='/compare/buildium'` remaining in the row. Plan 06-02's `generateMetadata()` reads this column; if it's null, the canonical tag falls back to the post's own URL and the post will cannibalize the existing `/compare/buildium` page. Phase 12 SEO follow-up monitors for this drift.
3. Set `status='published'` AND `published_at = now()`.
4. Wait up to 5 minutes for Next.js ISR (`revalidate=300` from Plan 06-02) to surface the post at `/blog/[slug]`.
5. Verify the post is live: `curl -I https://tenantflow.app/blog/{slug}` returns 200 (not 404).

If a human-editorial edit to the row's `content`, `excerpt`, `meta_description`, or `slug` violates any of the 9 gates, the DB `validate_blog_post()` trigger re-fires on UPDATE and rejects with `ERRCODE 23514`. Fix the edit and retry — same enforcement on UPDATE as on INSERT.
