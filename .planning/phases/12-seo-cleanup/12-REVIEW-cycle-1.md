---
phase: 12-seo-cleanup
reviewed: 2026-05-12T00:00:00Z
depth: standard
cycle: 1
files_reviewed: 7
files_reviewed_list:
  - src/app/api/og/pricing/route.tsx
  - src/app/api/og/compare/[competitor]/route.tsx
  - src/components/compare/compare-breadcrumb.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/pricing/page.tsx
  - src/components/layout/footer.tsx
  - src/lib/seo/page-metadata.ts
findings:
  P0: 0
  P1: 0
  P2: 3
  total: 3
verdict: FAIL
---

# Phase 12 SEO Cleanup — Cycle 1 Review

**Reviewed:** 2026-05-12
**Depth:** standard
**Files reviewed:** 7
**Verdict:** FAIL (3 P2 findings — perfect-PR gate requires zero)

## Summary

The implementation is structurally correct: OG routes follow the blog reference shape, the visible compare breadcrumb path matches the JSON-LD schema emitted by `createBreadcrumbJsonLd`, the `/compare` index page exists so the breadcrumb link is not broken, the relative import in the compare OG route (`../../../../compare/[competitor]/compare-data`) resolves correctly, and `createPageMetadata` correctly handles both `/api/og/pricing`-style relative paths and absolute `https://...` paths without double-prefixing. No P0/P1 issues. Three P2 items below — all polish/consistency.

The pricing title separator question raised in the brief is resolved as a non-issue: pricing uses the parent template (`%s | TenantFlow`), so the rendered title is `Property Management Software Pricing | Plans from $19/mo | TenantFlow`. There is no double-`TenantFlow` because the raw title contains no brand. The `title.absolute` opt-out in `compare/[competitor]/page.tsx` is correctly scoped only to that page where the title would otherwise stack `... Comparison | TenantFlow | TenantFlow`.

The footer sitemap link with `external: true` is consistent with the established `/feed.xml` pattern in the same array — both are same-origin machine-readable XML resources routed to a new tab. The pattern was set in PR #674; Phase 12 follows it.

---

## Findings

### CR-01 — N/A
No critical findings.

### WR-01 — N/A
No warning-level findings.

### IN-01 (P2): New OG routes lack the documented inline-style exception comment

**Files:**
- `src/app/api/og/pricing/route.tsx:7-8`
- `src/app/api/og/compare/[competitor]/route.tsx:19-20`

**Evidence:**
The reference route `src/app/api/og/blog/[slug]/route.tsx:31-36` documents the inline-style exception explicitly:

```tsx
// Brand colors derived from globals.css `--color-primary` (oklch).
// `@vercel/og` requires inline CSS values so the canonical token
// literals are duplicated here. This is the ONE permitted exception
// to the no-hex/no-inline-color rule (Phase 6 CONTEXT.md § Design Token).
const bgGradient =
    'linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)'
```

The two new OG routes copy the literal gradient + inline-style block but drop the justification comment. CLAUDE.md "Zero Tolerance Rules" #5 says "No inline styles — Tailwind utilities or globals.css custom properties only" — without the carve-out comment, the next reviewer or grep-based linter will read these files as violations.

**Suggested fix:** Copy the 6-line comment block from the blog OG route above the `bgGradient` declaration in both new files. Same wording, no edits needed.

---

### IN-02 (P2): Redundant `container` class on CompareBreadcrumb wrapper

**File:** `src/components/compare/compare-breadcrumb.tsx:23`

**Evidence:**

```tsx
<div className="container mx-auto max-w-7xl px-6 lg:px-8 pt-6">
```

Tailwind's `container` utility sets responsive max-widths (sm/md/lg/xl/2xl breakpoints). Pairing it with `max-w-7xl` overrides every one of those breakpoints, making `container` a no-op. The rest of the codebase consistently uses `max-w-7xl mx-auto px-6 lg:px-8` (see `src/components/layout/page-layout.tsx`, `src/app/pricing/page.tsx:52`, `src/app/compare/page.tsx:31`). The new component drifts from that pattern.

**Suggested fix:**

```tsx
<div className="max-w-7xl mx-auto px-6 lg:px-8 pt-6">
```

---

### IN-03 (P2): `ogImage.startsWith('http')` is permissive — prefer protocol-anchored regex

**File:** `src/lib/seo/page-metadata.ts:22-26`

**Evidence:**

```ts
const normalizedOgImage = ogImage
    ? ogImage.startsWith('http')
        ? ogImage
        : `${siteUrl}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`
    : undefined
```

`startsWith('http')` matches any string beginning with the four characters `http` — including pathological inputs like `httpdocs/og.png` (not a URL, would be passed through unchanged and yield a malformed OG tag) or `httpx.png`. The current callers (`/api/og/pricing`) don't hit this, but the function is exported and the next caller could.

**Suggested fix:**

```ts
const isAbsoluteUrl = /^https?:\/\//.test(ogImage)
const normalizedOgImage = ogImage
    ? isAbsoluteUrl
        ? ogImage
        : `${siteUrl}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`
    : undefined
```

Or use `URL.canParse(ogImage)` (Node 19.9+, Vercel runtime supports it) for full validation. Hardens against accidental relative paths that happen to start with `http`.

---

## Items Verified (no finding)

- **Compare OG relative import path** (`../../../../compare/[competitor]/compare-data`) — counted segments, resolves to `src/app/compare/[competitor]/compare-data`. Correct.
- **`/compare` index page exists** at `src/app/compare/page.tsx` — breadcrumb link `/compare` is not broken.
- **Visible breadcrumb ↔ JSON-LD parity** — `createBreadcrumbJsonLd('/compare/<slug>', { [slug]: 'TenantFlow vs <name>' })` emits Home → Compare → TenantFlow vs X. `CompareBreadcrumb` renders the exact same three segments with the same labels and hrefs. Match confirmed.
- **Pricing title separator** — raw `Property Management Software Pricing | Plans from $19/mo` + template `%s | TenantFlow` → `Property Management Software Pricing | Plans from $19/mo | TenantFlow`. No duplicated brand. Acceptable.
- **Compare title `absolute` opt-out** — correctly avoids `... Comparison | TenantFlow | TenantFlow` per the inline comment justification.
- **`createPageMetadata` ogImage handling** — relative (`/api/og/pricing`), absolute (`https://...`), and bare (`api/og/pricing`) paths all resolve correctly without double-prefix. (See IN-03 for the residual robustness concern.)
- **Footer Sitemap `external: true`** — consistent with the established `/feed.xml` pattern in the same array (PR #674). Both are same-origin XML resources routed to a new tab. Not a finding.
- **Edge runtime + revalidate** — matches blog reference (`runtime = 'edge'`, `revalidate = 3600`). No drift.
- **No `bg-white`** in any scoped file.
- **No bare `text-muted`** (all uses are `text-muted-foreground`) in scoped files.
- **No `any` / `as unknown as`** in any scoped file.
- **No PostgreSQL ENUMs** (n/a — no DB changes).
- **Color literals** in inline OG styles are `oklch(...)` only, no hex. Compliant with the documented carve-out.
- **File names** kebab-case throughout.
- **Line counts:** all files ≤ 213 lines (max is `compare/[competitor]/page.tsx` at 213). Under the 300-line cap.
- **No commented-out code.**
- **Icon-only buttons** — none introduced; existing `ArrowRight` icons sit alongside text labels.
- **`Breadcrumb` aria-label** — the shared `<Breadcrumb>` component (`src/components/ui/breadcrumb.tsx:9`) sets `aria-label="breadcrumb"` (lowercase). CLAUDE.md prefers `"Breadcrumb"` (capital B). This is a pre-existing issue in the shared component, not introduced by Phase 12, and outside review scope.

---

## Verdict

**FAIL** — 3 P2 findings. Apply the fixes above and re-run cycle 2. No structural changes, no migrations, no logic edits required — these are comment + class-list + regex hardening.

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Cycle: 1_
