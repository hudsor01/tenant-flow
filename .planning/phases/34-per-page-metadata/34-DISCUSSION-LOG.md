# Phase 34: Per-Page Metadata - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 34-per-page-metadata
**Areas discussed:** Server/client split approach, Metadata content strategy, Blog pagination noindex, Existing metadata cleanup

---

## Server/Client Split Approach

### Client component naming

| Option | Description | Selected |
|--------|-------------|----------|
| *-content.tsx | features-content.tsx, blog-content.tsx -- matches success criteria wording | |
| *-page.tsx | features-page.tsx, blog-page.tsx -- uses 'page' suffix | |
| *-client.tsx | features-client.tsx, blog-client.tsx -- explicit about rendering boundary | ✓ |

**User's choice:** *-client.tsx
**Notes:** User preferred explicit naming that makes the rendering boundary clear.

### Data fetching location

| Option | Description | Selected |
|--------|-------------|----------|
| Keep client-side | nuqs + TanStack Query stay in client component. Server page.tsx only exports metadata. | ✓ |
| Move to server-side | Fetch initial data in server component, pass as props to client. | |

**User's choice:** Keep client-side
**Notes:** Minimal refactor, preserves existing UX.

---

## Metadata Content Strategy

### Title format

| Option | Description | Selected |
|--------|-------------|----------|
| {Page Name} \| TenantFlow | Consistent brand-trailing format | |
| {Page Name} - TenantFlow | Dash separator | |
| TenantFlow - {Page Name} | Brand-first format | |

**User's choice:** Other -- "optimize for google indexing and organic search results"
**Notes:** User wants keyword-first, brand-trailing format optimized for Google. E.g., "Property Management Pricing & Plans | TenantFlow" not just "Pricing | TenantFlow".

### Description style

| Option | Description | Selected |
|--------|-------------|----------|
| Keyword-rich + CTA | Better for CTR in search results | ✓ |
| Concise and factual | Cleaner but lower CTR potential | |
| You decide | Claude writes SEO-optimized descriptions | |

**User's choice:** Keyword-rich + CTA
**Notes:** 150-160 characters, action-oriented language.

---

## Blog Pagination Noindex

| Option | Description | Selected |
|--------|-------------|----------|
| searchParams in generateMetadata | Next.js passes searchParams to generateMetadata(). Zero refactor to nuqs. | ✓ |
| Always noindex blog hub | Since listing is client-rendered, noindex the whole hub. | |
| Move to path segments | Change to /blog/page/2 pattern. Bigger refactor. | |

**User's choice:** Other -- "you decide, is this something tanstack helps with"
**Notes:** User deferred to Claude. TanStack Query doesn't help with server-side metadata. searchParams approach selected -- Next.js generateMetadata() receives searchParams natively, check ?page param, noindex if > 1.

---

## Existing Metadata Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, migrate inline patterns | Replace inline baseUrl + manual OG/breadcrumb with shared utilities | ✓ |
| No, only add missing metadata | Leave existing inline patterns alone | |
| Migrate selectively | Only migrate pages that need metadata added anyway | |

**User's choice:** Yes, migrate inline patterns
**Notes:** Full consistency pass across all public pages using createPageMetadata() and createBreadcrumbJsonLd().

---

## Claude's Discretion

- Specific title and description wording per page
- Implementation order and plan wave structure
- Whether to add metadata to unlisted pages that lack it

## Deferred Ideas

None -- discussion stayed within phase scope
