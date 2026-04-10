# Phase 35: Structured Data Enrichment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 35-structured-data-enrichment
**Areas discussed:** Blog post author identity, New schema factories vs inline, Breadcrumb trail structure

---

## Blog Post Author Identity

| Option | Description | Selected |
|--------|-------------|----------|
| TenantFlow Team (Recommended) | Person name = 'TenantFlow Team'. Simple, consistent, no DB changes needed. | |
| Richard Hudson | Your real name as author on all posts. More personal, better for E-E-A-T signals. | Y |
| Use blogs.author_user_id | Look up real user name from DB via existing FK. Most accurate but adds query. | |

**User's choice:** Richard Hudson
**Notes:** User prefers personal branding for E-E-A-T signals.

---

## New Schema Factories vs Inline

| Option | Description | Selected |
|--------|-------------|----------|
| Factories for both (Recommended) | Create createHowToJsonLd() and createSoftwareAppJsonLd() in src/lib/seo/. | |
| Inline for HowTo, factory for SoftwareApp | HowTo is one-off, SoftwareApp used across ~5 pages. | |
| Both inline | Skip factories, construct inline with JsonLdScript. | |

**User's choice:** "You decide"
**Notes:** Deferred to Claude's discretion. Recommendation: factory for SoftwareApplication (multiple pages), inline for HowTo (one page).

---

## Breadcrumb Trail Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Home > Blog > Category > Post (Recommended) | Deepest trail, shows category in SERPs. | Y |
| Home > Blog > Post | Simpler 3-level, skips category. | |
| Home > Blog only | Minimal, no post crumb. | |

**User's choice:** Home > Blog > Category > Post (Recommended)
**Notes:** Deepest trail preferred for maximum Google context.

---

## Claude's Discretion

- HowTo vs SoftwareApplication factory decision
- Implementation order and wave structure
- Unit test structure for new factories
- Whether createBreadcrumbJsonLd needs helper for 4-level blog trails

## Deferred Ideas

None
