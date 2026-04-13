# Phase 40: Metadata & Verification Completeness - Discussion Log

> **Audit trail only.** Decisions captured in CONTEXT.md.

**Date:** 2026-04-12
**Phase:** 40-metadata-verification-completeness
**Areas discussed:** GSC verification, Scope, Title format, Breadcrumb gap closure

---

## GSC Verification (Conflict Resolution)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop requirement, document DNS | Honor Phase 38 D-01, update ROADMAP success criteria | |
| Add placeholder meta tag anyway | Belt-and-braces | |
| Add real token now | Pull actual GSC token | |
| Research and update | Research actual milestone state, align success criteria | ✓ |

**User's choice:** Research first, then update success criteria in line with rest of milestone.
**Follow-up:** Confirmed via research — Phase 38 D-01 already locked DNS verification. VALID-01 satisfied. Drop meta tag requirement.

---

## Scope (4 vs 7 pages)

| Option | Description | Selected |
|--------|-------------|----------|
| Just the 4 target pages | Honor success criteria exactly | |
| All 7 pages | Sweep all remaining public pages with raw metadata | |
| 4 + 3 as separate waves | Phase 40 + future phase | |
| Research then update | Investigate actual state first | ✓ |

**User's choice:** Research first. After research: 7 pages + drop VALID-01.
**Follow-up confirmed:** `Yes: 7 pages + drop VALID-01 (Recommended)`.

---

## Title Format

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite all 4 per Phase 34 pattern | Keyword-first, brand-trailing | ✓ |
| Keep current minimal titles | Legal pages not conversion targets | |
| Claude's discretion | Propose in PR | |

**User's choice:** Rewrite all 4 per Phase 34 pattern (Recommended).

---

## Breadcrumb Gap Closure

| Option | Description | Selected |
|--------|-------------|----------|
| Add breadcrumbs to all 7 pages | Close SCHEMA-01 gap consistently | ✓ |
| Only metadata, skip breadcrumbs | Narrower scope | |

**User's choice:** Yes, add breadcrumbs to all 7 pages (Recommended).

---

## Claude's Discretion

- Exact title/description wording within Phase 34 D-04/D-05 guidelines
- Plan wave structure
- Test coverage strategy for metadata changes

## Deferred Ideas

None — discussion stayed within phase scope.
