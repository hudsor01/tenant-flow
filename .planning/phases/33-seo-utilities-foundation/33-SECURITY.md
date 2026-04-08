---
phase: 33
slug: seo-utilities-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-08
---

# Phase 33 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| JSON-LD script injection | Schema data rendered as inline JSON in HTML script tags | Untrusted strings could inject scripts via angle brackets |
| FAQ content injection | FAQ question/answer text rendered into JSON-LD script tags | Text content from developer constants |
| Article content injection | Blog post titles and content rendered into JSON-LD | Admin-authored content from Supabase DB |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-33-01 | Tampering | JsonLdScript component | mitigate | XSS escaping via `.replace(/</g, '\\u003c')` in `json-ld-script.tsx:26` — centralized in one component | closed |
| T-33-02 | Information Disclosure | getSiteUrl() | accept | Returns public site URL only — no secrets exposed | closed |
| T-33-03 | Tampering | createBreadcrumbJsonLd overrides | accept | Override labels are developer-provided constants, not user input | closed |
| T-33-04 | Tampering | createFaqJsonLd inputs | accept | FAQ data from developer-authored constants; XSS escaping in JsonLdScript handles rendering | closed |
| T-33-05 | Tampering | createArticleJsonLd inputs | accept | Blog post data from Supabase DB (admin-authored); XSS escaping in JsonLdScript handles rendering | closed |
| T-33-06 | Tampering | createProductJsonLd offers | accept | Pricing data is developer-authored constants; no user input flows into offer schema | closed |
| T-33-07 | Information Disclosure | priceValidUntil date | accept | Dynamic date reveals only that pricing is valid for ~1 year — no sensitive information | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-33-02 | Public site URL is not sensitive data | gsd-secure-phase | 2026-04-08 |
| AR-02 | T-33-03 | Breadcrumb labels are hardcoded by developers, not user-supplied | gsd-secure-phase | 2026-04-08 |
| AR-03 | T-33-04 | FAQ data is a developer constant; JsonLdScript XSS escaping is the defense layer | gsd-secure-phase | 2026-04-08 |
| AR-04 | T-33-05 | Article data from admin-only DB; JsonLdScript XSS escaping is the defense layer | gsd-secure-phase | 2026-04-08 |
| AR-05 | T-33-06 | Pricing constants authored by developers; no user input vector | gsd-secure-phase | 2026-04-08 |
| AR-06 | T-33-07 | Date reveals only pricing validity window; no business-sensitive information | gsd-secure-phase | 2026-04-08 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-08 | 7 | 7 | 0 | gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-08
