---
phase: 65
slug: documents-landing
status: inherited-amended
source: pre-split contract (authored 2026-07-26, checker-verified under Phase 56)
created: 2026-08-02
---

# Phase 65 — Documents Landing: UI Design Contract

> **This file is the single source of truth for the `/documents` landing design.**
>
> It was NOT re-derived. The contract was authored before the Phase 56/65 split, passed
> Phase 56's ui-checker, and was preserved verbatim rather than deleted. It is materialized
> here so Phase 65 owns its own design artifact instead of inheriting one from a shipped
> phase's files — a future edit to those Phase 56 documents must not silently change what
> Phase 65 builds.
>
> `65-RESEARCH.md` §"Inherited Design Contract" previously held this body and now points
> here. The research's job is verification and landmines; this file's job is the design.

## Amendments to the inherited contract

Two decisions in `65-CONTEXT.md` amend what follows. **Where the inherited body below and
these amendments disagree, the amendments win.**

### A-1 — Navigation is FLAT (supersedes the inherited discretion ruling AND an intermediate amendment)

`Documents` is a flat nav entry pointing at `/documents`. It is NOT a parent with children.

During discussion this was briefly amended to a parent+children shape mirroring `Reports`,
on the rationale that it would keep the vault one click away while still making the landing
navigable. **Research refuted the second half:** `renderNavItem`'s `hasChildren` branch
(`main-nav.tsx:211-230`) renders the parent as a `<button onClick={toggleExpanded}>` with
**no `<Link>`**; `item.href` is read only by `isActive()` at `:208`, which that branch never
consults. A parent's href is decorative, so the shape would have left `/documents`
unreachable from the sidebar — defeating DOCS-01's entry-point requirement.

Flat items render as `<Link>`, so flat is the only shape in the current component that
satisfies DOCS-01 without changing shared nav behaviour. **Accepted cost:** the vault is two
clicks (sidebar → landing → "Open the vault"). Band 1's primary Button is the page's single
loudest affordance, which is what absorbs that cost.

The one-item `Templates` nav section is still deleted (D-09), and both `Documents` entries
change — `main-nav.tsx:48` and the Cmd+K palette at `app-shell.tsx:101`, plus the Cmd+K
`Templates` group at `app-shell.tsx:162-176` that D-09 did not originally account for.

### A-2 — Recent-list empty BODY copy (supersedes the locked `[65]` Copywriting row)

| | |
|---|---|
| Empty **title** | **`No documents yet`** — unchanged, ships as locked |
| Empty **body** | **`Documents you upload appear here, newest first.`** |

The inherited body read *"Upload documents from any property, lease, tenant, or maintenance
record and the newest will appear here."* That enumeration is **already wrong**: there are
five entity types (`documents-section.tsx:62-68` — `property, lease, tenant,
maintenance_request, inspection`); it names four, drops `inspection`, and renames
"maintenance request" to "maintenance record". The sibling vault sentence names all five and
is pinned by a drift-guard test (`documents-vault.test.tsx:209-219`) written for exactly this
failure mode.

Dropping the enumeration removes the drift surface entirely, stays true for a zero-property
owner and a fifty-property owner alike, and follows the repo's own nested-preview convention
(`notification-popover-list.tsx:86-93` renders title-only while the full inbox carries
guidance). "Newest first" is factually accurate — `search_documents` orders `created_at desc`
with no query.

Everything else in the empty-state contract stands: `<Empty className="py-6">`,
`EmptyTitle` + `EmptyDescription`, no `EmptyMedia`, no CTA.

> **Implementation note (L-07):** `<Empty className="py-6">` does not actually compact —
> tailwind-merge leaves the primitive's base `md:p-12` intact. The `md:` companion is
> required for the compact form to take effect at `md` and above.

---

# Inherited contract (verbatim, checker-verified under Phase 56)

> Reproduced from `56-UI-SPEC.md` §"MOVED TO PHASE 65" (lines 575-693) and the `[65]`-tagged rows
> in its cross-cutting tables (lines 89, 374-384, 400-403, 422, 426, 436, 443-455, 461, 473-482,
> 500-503, 527-533, 543). Verbatim except where a CONTEXT decision amends it — amendments are
> marked inline.

### I-1. Three-band descending-weight ladder (D-01)

**Locked and non-negotiable:** vault entry + lease-template entry + **four separate** printable
template cards + a recent-documents list. Six tiles plus a list. The two real problems the ladder
solves are (a) six tiles skew weight toward templates when the vault is the primary destination,
and (b) the recent list overlaps `/documents/vault` and the two must not visibly disagree.

**Both are solved by one move: the recent-documents list lives INSIDE the vault panel, and the
vault panel is a full-width primary band that the templates cannot compete with.**

```
BAND 1 — Vault (full width, bg-card, p-6, contains the recent list)
  ┌──────────────────────────────────────────────────────────────────┐
  │ ▣ size-12 bg-primary/10   Document Vault              16px/600   │
  │   FolderArchive text-primary                                     │
  │   Search, filter, and bulk-download every document attached      │
  │   to your properties, leases, tenants, and maintenance requests. │
  │   [ Open the vault ]   ← the ONLY primary Button on the page     │
  │  ─────────────────────────── Separator ───────────────────────── │
  │   Recently added                                    12px/400/mut │
  │   • Lease agreement — Unit 4B          2 days ago                │
  │   • Inspection report — Maple St       5 days ago                │
  │   • … (exactly 5 rows, non-interactive)                          │
  │                                     View all documents →  (link) │
  └──────────────────────────────────────────────────────────────────┘
                                                     32px band gap
BAND 2 — Build a document (full width, one tile)
  ┌──────────────────────────────────────────────────────────────────┐
  │ ▣ size-10 bg-muted  Lease Template Builder            16px/600   │
  │   Draft a lease from your own clauses, branding, and custom      │
  │   fields, then send it for signature.                            │
  └──────────────────────────────────────────────────────────────────┘
                                                     32px band gap
BAND 3 — Printable forms (grid gap-4 sm:grid-cols-2 lg:grid-cols-4)
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   compact tiles, p-4
  │▣ size-8│ │▣ size-8│ │▣ size-8│ │▣ size-8│   bg-muted medallion
  │Rental  │ │Property│ │Mainten.│ │Tenant  │   16px/600 title
  │Applic. │ │Inspect.│ │Request │ │Notice  │   14px/400 muted desc
  └────────┘ └────────┘ └────────┘ └────────┘
```

**Why this fixes balance (a):** the vault occupies full width, carries a `size-12` primary-tinted
medallion, is the page's only filled primary `Button`, and contains live content — roughly half
the page's vertical real estate. Below it, six tiles read as **1 + 4** across two labelled bands
with progressively smaller medallions (`size-10` → `size-8`) and padding (`p-5` → `p-4`) and
neutral `bg-muted` medallions. Tile count is untouched (four separate printable cards); the
hierarchy is carried by size, width, color budget, and content — not by deleting anything.

**Why this fixes overlap (b) — two independent guarantees:**

1. **Semantic:** nesting the list inside the vault panel, under a `Separator`, below the
   "Open the vault" CTA, makes it read unambiguously as *a preview of what is in the vault*
   rather than a second, competing document surface. It is subordinate by position, never a
   sibling band.
2. **Structural — they cannot disagree, by construction:** the list calls
   `documentSearchQueries.list({ page: 0 })` from `#hooks/api/query-keys/document-search-keys`
   with **no filters** and slices the result to the first 5 client-side. That is the exact factory
   the vault client calls (`documents-vault.client.tsx:230-238`) → the same `search_documents` RPC
   → the same `mapDocumentRow` boundary mapper → the same TanStack Query cache entry.

**Scope of the "same cache entry" claim:** it holds for the vault's *default, unfiltered landing
state* — `queryParam=""`, `entityType=undefined`, `categories=[]`, `from`/`to=""`, `page=0` —
which normalizes to the identical query key as `documentSearchQueries.list({ page: 0 })`. Once
the owner types a search or applies a filter the vault moves to a different key, and the landing's
list legitimately keeps showing unfiltered recents. That is correct behaviour, not drift: the two
only ever share a cache entry when they are asking the same question. **Building a second query,
a second mapper, or a direct `.from('documents')` select is a blocking violation of this contract.**

### I-2. Recent-document row anatomy (D-03)

`<ul>` of `Item` compound rows, `variant="default"`, `size="sm"`, **non-interactive** — no `<a>`,
no `<button>`, no `cursor-pointer`, no hover background. They are a preview, not a control surface.

| Slot | Primitive | Spec |
|------|-----------|------|
| Icon | `ItemMedia variant="icon"` | lucide `File` (or a mime-derived icon if one already exists in the vault client — reuse, do not invent), `size-4 text-muted-foreground`, `aria-hidden="true"` |
| Title | `ItemTitle` | 14px / **400** / `text-foreground`, `truncate`. Override the primitive's default `font-medium` with `font-normal`. |
| Meta | `ItemDescription` | 12px / 400 / `text-muted-foreground` — `{document category} · {relative date}` |

**Why rows are not links:** a row that opens a signed URL would be a second download path
competing with the vault's — the exact disagreement the contract warns about — and would require
a second signed-URL generation path. One door: the panel's `View all documents` link →
`/documents/vault`. `/documents/vault` stays canonical (D-05).

### I-3. Recent-list states

| State | Treatment |
|-------|-----------|
| Loading | 5 `Skeleton` rows at `h-10 rounded-md`, `space-y-2`. Never a spinner. The vault CTA above renders immediately and is never blocked by the list. |
| Empty | `Empty` compound in compact form — `<Empty className="py-6">` with `EmptyTitle` + `EmptyDescription`, **no `EmptyMedia`**. No CTA (the vault CTA is 24px above it). |
| Error | Inline `text-sm text-muted-foreground` copy + `Button variant="ghost" size="sm"` labelled `Retry`. Never a raw PostgREST string — route through `handlePostgrestError`. Never an error boundary that takes down the vault CTA. |

> **Amendment note (I-3 Empty precedent):** the inherited spec cites `revenue-expense-chart.tsx`
> as the "no `EmptyMedia`" precedent. That citation is **wrong** — that file renders
> `EmptyMedia variant="icon"` at `:58-60` [VERIFIED: file read]. The prescribed *shape* is still
> correct and has a real precedent: `chart-area-interactive.tsx:207-213` is
> `<Empty>` → `EmptyTitle` + `EmptyDescription`, no `EmptyHeader`, no `EmptyMedia`
> [VERIFIED: file read]. Use that as the reference.

### I-4. Page-level contract (D-04, D-06)

- `src/app/(owner)/documents/page.tsx` is a **Server Component**; only the recent-documents panel
  is a `'use client'` island. Server-rendering the list would create a second fetch path and
  forfeit the cache-sharing guarantee.
- The file carries a short comment recording that **DOCS-01 superseded** the earlier
  `permanentRedirect("/documents/vault")` decision and why, so the reversal reads as deliberate.
- Band headings are real `<h2>`; each band is `<section aria-labelledby>`. Band 1's heading is the
  vault title itself.
- Every tile is one `<Link>`, whole-card clickable, no nested interactive elements. Medallion
  icons and the `ArrowRight` are `aria-hidden="true"`.

### I-5. Icon + copy table — the four printables must be visually distinct (D-07)

All four template pages currently use `FileText`, which is flat. The landing differentiates them:

| Tile | Route | lucide icon | Description |
|------|-------|-------------|-------------|
| Document Vault | `/documents/vault` | `FolderArchive` (matches nav) | Search, filter, and bulk-download every document attached to your properties, leases, tenants, and maintenance requests. |
| Lease Template Builder | `/documents/lease-template` | `FileCheck` (matches nav) | Draft a lease from your own clauses, branding, and custom fields, then send it for signature. |
| Rental Application | `/documents/templates/rental-application` | `ClipboardList` | Collect applicant details and background-check authorization. |
| Property Inspection | `/documents/templates/property-inspection` | `ClipboardCheck` | Record move-in and move-out condition with checklists and photos. |
| Maintenance Request | `/documents/templates/maintenance-request` | `Wrench` | Issue a work order for a vendor or tenant. |
| Tenant Notice | `/documents/templates/tenant-notice` | `FileWarning` | Late rent, lease violation, and move-out notices. |

### I-6. Locked copy (`[65]` rows from the Copywriting table)

| Element | Copy |
|---------|------|
| `/documents` page title | **Documents** |
| `/documents` page subtitle | **Your document vault, the lease builder, and printable forms.** |
| Vault panel title | **Document Vault** |
| Vault panel description | **Search, filter, and bulk-download every document attached to your properties, leases, tenants, and maintenance requests.** |
| **Primary CTA (the only one on that page)** | **Open the vault** |
| Recent list label | **Recently added** |
| Recent list footer link | **View all documents** |
| Band 2 heading | **Build a document** |
| Band 3 heading + one-liner | **Printable forms** — *Fill in and download a ready-to-print PDF.* |
| 6 document tile titles + descriptions | Per the I-5 icon table |

**State copy:**

| Case | Copy |
|------|------|
| Recent documents — empty **title** | **No documents yet** |
| ~~Recent documents — empty body~~ | ~~Upload documents from any property, lease, tenant, or maintenance record and the newest will appear here.~~ **SUPERSEDED BY D-12** |
| Recent documents — empty **body** (D-12) | **Documents you upload appear here, newest first.** |
| Recent documents — error | **Couldn't load recent documents.** + `Retry` (ghost, `size="sm"`). Never a raw PostgREST string — route through `handlePostgrestError`. |
| Recent documents — loading | 5 `Skeleton` rows. No copy. |

**Case conventions (pinned by the spec):** Title Case for accounting/proper document names only.
Sentence case for every button, helper line, description, heading one-liner, and empty/error copy.
Never `typography-hero` / `typography-display*` (marketing-only, Playfair). No em-dashes in
user-facing strings. No emojis — lucide only.

### I-7. Spacing rungs (`[65]` rows)

Tailwind base `--spacing: 0.25rem`; every value is a multiple of 4.

| Token | Value | `[65]` usage |
|-------|-------|--------------|
| sm | 8px (`gap-2`, `space-y-2`) | skeleton row gap |
| — | 12px (`gap-3`) | recent-row medallion-to-text; compact template-tile medallion-to-text |
| md | 16px (`p-4`, `gap-4`) | every grid `gap-4`; compact printable-tile padding; recent-list top offset from the `Separator` |
| — | 20px (`p-5`) | Band-2 tile padding |
| lg | 24px (`p-6`, `space-y-6`) | vault panel padding; CTA-to-`Separator` gap |
| xl | 32px (`space-y-8`, `lg:p-8`) | band separation |

**Icon medallion ladder:** the three-rung ladder `size-12` (vault) → `size-10` (Band 2) → `size-8`
(printable tiles) is the whole composition — descending weight is what makes the vault primary.

### I-8. Typography roles (`[65]` rows)

| Role | Size | Weight | Leading | `[65]` usage |
|------|------|--------|---------|--------------|
| Page title | `typography-h1` (24px) | 700 (documented weight exception) | 1.2 | `<h1>` on `/documents` |
| Section / tile title | 16px (`text-base`) | 600 | 1.35 | band `<h2>`; the vault panel title |
| Body / description | 14px (`text-sm`) | 400 | 1.5 | page subtitle; band one-liners; every tile description; button labels; recent-row title |
| Metadata | 12px (`text-xs`) | 400 | 1.5 | `Recently added` label; recent-row meta line |

**Override:** `ItemTitle`'s primitive default is `font-medium` → override to **`font-normal`** on
recent-document rows (they are metadata, not headings).

**No hierarchy is carried by type size beyond these roles.** The vault panel's primacy comes from
full width, the `size-12` primary-tinted medallion, the page's only filled primary button, and
the content it contains — deliberately **not** from an extra font size.

### I-9. Color / accent budget (`[65]` rows)

| Weight | Token | Usage |
|--------|-------|-------|
| Dominant (60%) | `--color-background` (`bg-background`) | Page canvas on `/documents` |

The accent budget on this surface is exactly three items:

1. The **vault medallion only** — `bg-primary/10` with a `text-primary` glyph. The single
   accent-tinted medallion on the page, and the reason the vault reads as primary.
2. The **single primary `Button`** — `Open the vault` (`Button` default variant =
   `bg-primary text-primary-foreground`). The only filled primary button on that surface.
3. **Text link affordances** — `View all documents`
   (`text-primary-text hover:underline underline-offset-4`).

**Accent is explicitly NOT applied to:** the lease-builder or printable-template medallions
(neutral `bg-muted` + `text-foreground`), or recent-document rows.

**WCAG companion-token rule (CLAUDE.md):** vivid tokens are for icon fills, `-text` companions
are for text. Use `text-primary-text` for every accent-coloured *text* run; `text-primary`
appears only as the vault medallion *glyph* sitting on `bg-primary/10`. No `text-destructive`,
`text-success`, `text-warning`, or `text-info` appears here.

### I-10. Interaction & state contracts (`[65]` rows)

| Concern | Contract |
|---------|----------|
| `/documents` landing data | Server Component shell + one `'use client'` island for the recent list. No other client boundary. |
| Recent list source | `documentSearchQueries.list({ page: 0 })` with no filters, sliced to 5. Same factory, RPC, mapper, and cache entry as the vault. A second query path is a blocking violation (D-02). |
| Recent rows | Non-interactive `<li>`. No link, no button, no `cursor-pointer`, no hover background. |
| Loading | `Skeleton` rows in the recent panel only. Never a blocking spinner, never a full-page loader. The vault CTA renders immediately regardless of list state. |
| Empty | `Empty` compound, compact form (no `EmptyMedia`), recent panel only. |
| Error | Inline copy + `Retry` in the recent panel only. Never an error boundary that removes the vault CTA. |
| Focus / keyboard, mobile | Tab order: page title → Band 1 CTA → `View all documents` → Band 2 tile → Band 3 tiles; non-interactive recent rows are skipped, correctly. Bands stack; printables `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-4`; the vault panel stacks the recent list below the CTA. |
| Destructive actions | **None.** No `ConfirmDialog`, no `AlertDialog`, no destructive-variant control appears anywhere in scope. |
| Motion | **None new.** No `BlurFade`. Any inherited animation honors `prefers-reduced-motion` via the global rule. |
| Component size | Max 300 lines per component (CLAUDE.md). The six tiles live in a data-array module rendered by a small tile component — not six inline JSX blocks. |

### I-11. Breadcrumb LABEL_MAP additions (D-07)

| Segment | Label |
|---------|-------|
| `vault` | Vault |
| `templates` | Templates |
| `rental-application` | Rental Application |
| `property-inspection` | Property Inspection |
| `maintenance-request` | Maintenance Request |
| `tenant-notice` | Tenant Notice |

### I-12. Registry safety

**Zero new components fetched. Zero new npm runtime dependencies.** The `[65]` primitives —
`Item`, `Button`, `Empty`, `Separator` — are all pre-existing in `src/components/ui/`.
`components.json` declares nine third-party registries; this phase pulls **zero blocks** from any
of them. The vetting gate is **not triggered**.

### I-13. Superseded inherited text (shown so the planner recognizes it if encountered)

| Inherited ruling | Status |
|------------------|--------|
| "Nav `Documents` target → **`/documents`** (the new landing), not `/documents/vault`" — **flat entry** | **STANDS.** An intermediate amendment briefly replaced this with a parent+children shape; that amendment was REVERTED on 2026-08-02 after research showed a nav parent renders as a toggle with no `<Link>`. See §A-1. The inherited flat ruling is what ships. |
| ~~Recent-documents empty body: "Upload documents from any property, lease, tenant, or maintenance record and the newest will appear here."~~ | **SUPERSEDED by D-12.** → "Documents you upload appear here, newest first." |
| Nav "Templates" section (one item: Lease Template) → **Removed** | **STANDS** (restated as D-09). |
| Recent-documents list: client-fetched `'use client'` island using `documentSearchQueries.list({ page: 0 })` | **STANDS** (restated as D-02/D-04). |

---

## Provenance

- Authored 2026-07-26 as Design Problem 2 of the pre-split Phase 56 UI-SPEC (D-14..D-17).
- Preserved verbatim through the 2026-07-26 phase split rather than deleted.
- Re-verified against HEAD on 2026-08-02 — see `65-RESEARCH.md` §"Verification Ledger" for
  the per-claim status, and §"STALE / CORRECTED" for the four citation drifts found.
- Materialized into this standalone file 2026-08-02 with amendments A-1 and A-2 applied.
