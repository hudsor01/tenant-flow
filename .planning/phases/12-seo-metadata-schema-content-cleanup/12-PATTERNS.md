# Phase 12: SEO Metadata, Schema & Content Cleanup - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 14 (8 modified production, 1 new production, 5 new/extended test)
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/generate-metadata.ts` | config (metadata) | transform | (self — edit in place) | exact (modify) |
| `src/app/resources/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/help/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/blog/page.tsx` | route (metadata via `generateMetadata`) | request-response | `src/app/compare/[competitor]/page.tsx` | exact |
| `src/app/privacy/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/support/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/resources/security-deposit-reference-card/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/features/page.tsx` | route (metadata export) | request-response | `src/app/pricing/page.tsx` | exact |
| `src/app/api/og/features/route.tsx` **(NEW)** | route handler (edge) | streaming (image) | `src/app/api/og/pricing/route.tsx` | exact |
| `src/app/__tests__/seo-title-separator-drift.test.ts` **(NEW)** | test (drift guard) | file-I/O scan | `src/app/__tests__/design-token-drift.test.ts` + `src/app/robots.test.ts` | exact |
| `src/lib/__tests__/generate-metadata.test.ts` **(NEW)** | test (regression pin) | transform-assertion | `src/lib/seo/__tests__/software-application-schema.test.ts` | exact |
| `src/app/__tests__/seo-aria-current-audit.test.ts` **(NEW)** | test (consolidated audit) | render-assertion | `src/lib/__tests__/is-active-link.test.ts` + `src/components/compare/__tests__/compare-breadcrumb.test.tsx` + `design-token-drift.test.ts` walker | role-match |
| `src/components/layout/__tests__/footer.test.tsx` **(NEW)** | test (render assertion) | render-assertion | `src/components/compare/__tests__/compare-breadcrumb.test.tsx` | exact |
| `src/app/features/__tests__/page.test.ts` **(NEW)** | test (metadata assertion) | transform-assertion | `src/lib/seo/__tests__/software-application-schema.test.ts` | role-match |

**No new test needed for SEO-04** — Phase 6 owns blog slug cleanliness; verify by code inspection only (`generateStaticParams` in `src/app/blog/[slug]/page.tsx` reads the DB `slug` column; no timestamp generator exists). **No new test for SEO-05** — `compare-breadcrumb.test.tsx` + `blog-post-breadcrumb.test.tsx` already pin it.

## Pattern Assignments

### SEO-01: Title separator normalization — 8 drift sites (controller/config, transform)

**Analog:** `src/lib/seo/page-metadata.ts` (canonical separator authority) + `src/app/pricing/page.tsx` (a title already on the canonical pipe).

**Canonical separator: pipe `|`.** Locked by two structural sources — DO NOT flip them:
- `src/lib/generate-metadata.ts:31` — `template: "%s | TenantFlow"`
- `src/lib/seo/page-metadata.ts:70` — `const suffixed = alreadyBranded ? title : \`${title} | TenantFlow\``

**Correct title shape** (`src/app/pricing/page.tsx:26-32` — copy this `createPageMetadata` call shape):
```tsx
export const metadata: Metadata = createPageMetadata({
  title: "Property Management Software Pricing | Plans from $19/mo",
  description: "...",
  path: "/pricing",
  ogImage: "/api/og/pricing",
});
```

**Exact 8 edits — change `—`/`-` separator to ` | `:**

| File:line | Current | Fixed |
|-----------|---------|-------|
| `src/lib/generate-metadata.ts:33` | `title.default: "TenantFlow — Property Management Software for Independent Landlords"` | `"TenantFlow \| Property Management Software for Independent Landlords"` |
| `src/lib/generate-metadata.ts:54` | `openGraph.title: "TenantFlow — Property Management Software..."` | pipe |
| `src/lib/generate-metadata.ts:81` | `twitter.title: "TenantFlow — Property Management Software..."` | pipe |
| `src/app/resources/page.tsx:20` | `title: "Free Landlord Resources — Templates & Tools"` | `"Free Landlord Resources \| Templates & Tools"` |
| `src/app/help/page.tsx:22` | `title: "Help Center — Property Management Support & Guides"` | `"Help Center \| Property Management Support & Guides"` |
| `src/app/blog/page.tsx:74` | `title: "Property Management Blog — Tips for Independent Landlords"` | `"Property Management Blog \| Tips for Independent Landlords"` |
| `src/app/privacy/page.tsx:8` | `title: "Privacy Policy - Data Protection & User Rights"` | `"Privacy Policy \| Data Protection & User Rights"` |
| `src/app/support/page.tsx:18` | `title: "Support Center - Property Management Help"` | `"Support Center \| Property Management Help"` |
| `src/app/resources/security-deposit-reference-card/page.tsx:13` | `title: "Security Deposit Laws by State - Quick Reference Card"` | `"Security Deposit Laws by State \| Quick Reference Card"` |

**Constraints:** Em-dashes inside `description`/body copy are NOT in scope — only `<title>` separators. The 3 `generate-metadata.ts` strings (`title.default`, `openGraph.title`, `twitter.title`) are the SAME string repeated — keep them in sync. The string still contains the brand token `TenantFlow`, so `createPageMetadata`'s `alreadyBranded` guard (`page-metadata.ts:69`) still applies — no double-branding concern.

---

### SEO-02: `/features` OG route (route handler, edge streaming) — NEW FILE

**Analog:** `src/app/api/og/pricing/route.tsx` — copy structure verbatim, swap the content.

**Full structure to copy** (`src/app/api/og/pricing/route.tsx:1-87`):
```tsx
import { ImageResponse } from "@vercel/og";

// `@vercel/og` requires the edge runtime — streams the rendered PNG
// directly without spinning a Node process. CDN caches the PNG 1h.
export const runtime = "edge";
export const revalidate = 3600;

export function GET() {
  // Brand colors from globals.css --color-primary (oklch).
  // `@vercel/og` requires inline CSS — the ONE permitted exception
  // to the no-hex/no-inline-color rule. Use oklch literals, NOT hex.
  const bgGradient =
    "linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)";

  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex",
      flexDirection: "column", justifyContent: "space-between",
      padding: "60px", background: bgGradient, color: "oklch(1 0 0)",
      fontFamily: "sans-serif" }}>
      {/* eyebrow: uppercase "Features" — fontSize 24, letterSpacing 0.1em, opacity 0.85 */}
      {/* headline block: gap 16 — fontSize 64 fontWeight 900 lineHeight 1.1 + subhead fontSize 28 */}
      {/* brand mark: "TenantFlow" — fontSize 28 fontWeight 700 opacity 0.9 */}
    </div>,
    { width: 1200, height: 630 },
  );
}
```

**Critical constraints (Pitfall 4 from RESEARCH):**
- `oklch()` literals ONLY — hex would fail `design-token-drift.test.ts` (scans `src/app/**`, hex regex on string-literal content). The 3 sibling OG routes use oklch and pass.
- Every text node that is a flex parent of multiple children needs `display: "flex"` (satori requirement — see the `pricing/route.tsx` headline/subhead wrappers).
- `GET()` takes NO params — static content, singular cache key. Do not add `params` (unlike `compare/[competitor]/route.tsx`).
- File extension is `.tsx` (JSX in the route handler).

**Then wire it** — modify `src/app/features/page.tsx:12-18`, add `ogImage` arg to the existing `createPageMetadata` call:
```tsx
export const metadata: Metadata = createPageMetadata({
  title: "Property Management Features | Document Vault, Lease E-Signing & Maintenance",
  description: "...",
  path: "/features",
  ogImage: "/api/og/features",   // <-- NEW; createPageMetadata absolutizes the path
});
```
`createPageMetadata` absolutizes a root-relative `ogImage` (`page-metadata.ts:41-47`) and emits it into `openGraph.images[0].url` + `twitter.images[0]`.

---

### SEO-03: `getJsonLd()` regression-pin test (test, transform-assertion) — NEW FILE

**Analog:** `src/lib/seo/__tests__/software-application-schema.test.ts` — same `vi.mock` + `toPlain` pattern.

**SHIPPED — verify-and-pin only.** `src/lib/generate-metadata.ts:136-208` `getJsonLd()` already returns `[organization, software]`, emitted site-wide via `<SeoJsonLd/>` (`src/app/layout.tsx:91`). RESEARCH Option 1 recommended: accept site-wide emission, no code change. Just add the missing test.

**Test pattern to copy** (`software-application-schema.test.ts:1-30`):
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://tenantflow.app", VERCEL_URL: undefined },
}));

import { getJsonLd } from "#lib/generate-metadata";

/** schema-dts readonly result -> plain JSON for assertions */
function toPlain(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
```

**Assertions to pin** (the gap RESEARCH §SEO-03 identified — no `getJsonLd()` test exists):
- `getJsonLd()` returns an array of length 2.
- Element 0 `@type === "Organization"`; has `name`, `url`, `logo`, `contactPoint.telephone === "+1-214-843-0779"` (E.164 — pin it; vanity regression guard per State-of-the-Art table).
- Element 1 `@type === "SoftwareApplication"`; has `applicationCategory`, `offers["@type"] === "AggregateOffer"`, non-empty `featureList`.
- Both have `"@context": "https://schema.org"`.

Note: `getJsonLd()` itself does NOT mock `getSiteUrl` separately — it calls `getSiteUrl()` internally which reads `env`. Mock `#env` (as above), not `#lib/generate-metadata`, since the SUT IS `generate-metadata`.

---

### SEO-01 drift-guard test (test, file-I/O scan) — NEW FILE

**Location:** `src/app/__tests__/seo-title-separator-drift.test.ts`
**Analog:** `src/app/__tests__/design-token-drift.test.ts` (recursive `walkSourceFiles` + per-file `describe`) + `src/app/robots.test.ts` (import-source-of-truth discipline).

**Walker pattern to copy** (`design-token-drift.test.ts:110-178`):
```ts
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function isTestPath(relPath: string): boolean {
  return relPath.includes("/__tests__/") || relPath.includes(".test.") ||
    relPath.includes(".spec.") || relPath.endsWith(".d.ts");
}

function walkSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { recursive: true, withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const parentPath = (entry as { parentPath?: string; path?: string }).parentPath
      ?? (entry as { path?: string }).path ?? "";
    const absPath = join(parentPath, entry.name);
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (isTestPath(absPath)) continue;
    files.push(absPath);
  }
  return files;
}

const cwd = process.cwd();
for (const abs of walkSourceFiles(join(cwd, "src/app"))) {
  const rel = relative(cwd, abs).replace(/\\/g, "/");
  const content = readFileSync(abs, "utf8");
  describe(rel, () => { /* per-file title-separator assertions */ });
}
```

**Approach:** Scan every `page.tsx` under `src/app/**` plus `src/lib/generate-metadata.ts`. Extract `title:` string-literal values from `createPageMetadata({...})` / `metadata` / `generateMetadata` blocks. Assert no title string contains a SPACED em-dash/en-dash/hyphen separator pattern `/ [—–-] /`. Allow hyphens inside hyphenated words (no surrounding spaces). Include a meta-test block (like `design-token-drift.test.ts:180-247`) proving the regex catches ` — ` and ` - ` but not `Quick-Reference`. Test files skipped via `isTestPath` so the regex/fixtures don't self-trigger.

---

### SEO-07 consolidated aria-current audit (test, render-assertion) — NEW FILE

**Location:** `src/app/__tests__/seo-aria-current-audit.test.ts`
**Analog:** `src/lib/__tests__/is-active-link.test.ts` (predicate coverage) + `src/components/compare/__tests__/compare-breadcrumb.test.tsx` (render + `aria-current` query) + `design-token-drift.test.ts` walker (if a recursive emit-surface scan is wanted).

**SHIPPED mechanically — 6 surfaces already emit `aria-current`:**
1. `src/components/layout/navbar/navbar-desktop-nav.tsx:98,130` — via `isActiveLink`
2. `src/components/layout/navbar/navbar-mobile-menu.tsx:56,88` — via `isActiveLink`
3. `src/components/shell/main-nav.tsx:228,254` — dashboard nav
4. `src/components/ui/mobile-nav.tsx:46,118` — mobile nav
5. `src/components/ui/breadcrumb.tsx:57` — `BreadcrumbPage` hardcodes `aria-current="page"`
6. `src/components/ui/stepper-trigger.tsx` — stepper step

**aria-current query pattern** (`compare-breadcrumb.test.tsx:48-52`):
```tsx
it('uses aria-current="page" on the current segment', () => {
  render(<CompareBreadcrumb competitorName="AppFolio" />);
  const current = screen.getByText("TenantFlow vs AppFolio");
  expect(current).toHaveAttribute("aria-current", "page");
});
```
Header — file needs `@vitest-environment jsdom` doc-comment (see `compare-breadcrumb.test.tsx:9`) and the `next/link` mock (`compare-breadcrumb.test.tsx:15-29`).

**`isActiveLink` route-coverage pattern** (`is-active-link.test.ts:10-36`) — assert the predicate for `/`, `/pricing`, `/features`, `/compare/buildium`, subpath, and prefix-without-separator cases.

**Audit assertions (the "green report"):** For a sample of routes (`/`, `/pricing`, `/features`, `/compare/buildium`), render the marketing nav + breadcrumb and assert (a) at most ONE element per nav surface has `aria-current="page"`, (b) the active one matches the current route. Footer has NO `aria-current` (intentional — footer links are not nav state); the audit must NOT expect it there.

---

### SEO-06 footer test (test, render-assertion) — NEW FILE

**Location:** `src/components/layout/__tests__/footer.test.tsx`
**Analog:** `src/components/compare/__tests__/compare-breadcrumb.test.tsx` — same jsdom + `next/link` mock + `screen.getByRole("link", ...)` pattern.

**SHIPPED — verify-and-pin.** `src/components/layout/footer.tsx:48` already has `{ label: "Sitemap", href: "/sitemap.xml", external: true }`. No footer test exists — add one.

**Test pattern to copy** (`compare-breadcrumb.test.tsx:12-46`):
```tsx
/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: {
    children: React.ReactNode; href: string;
  }) => <a href={href} {...props}>{children}</a>,
}));

import Footer from "#components/layout/footer";

describe("Footer", () => {
  it("renders the /sitemap.xml link as an external link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: "Sitemap" });
    expect(link).toHaveAttribute("href", "/sitemap.xml");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
```
`Footer` is a default export. The `external: true` link renders `target="_blank" rel="noopener noreferrer"` (`footer.tsx:68-73`).

---

### SEO-02 `/features` metadata test (test, transform-assertion) — NEW FILE

**Location:** `src/app/features/__tests__/page.test.ts`
**Analog:** `src/lib/seo/__tests__/software-application-schema.test.ts` (env mock + plain-JSON assertion).

**Assertions:** Import `metadata` from `src/app/features/page.tsx`; assert `metadata.openGraph.images[0].url` ends with `/api/og/features` and `metadata.twitter.images[0]` ends with `/api/og/features`. Mock `#env` so `getSiteUrl()` resolves to `https://tenantflow.app` (same `vi.mock("#env", ...)` block as `software-application-schema.test.ts:3-8`). Optionally assert the new `/api/og/features` route module exports `runtime === "edge"` and `revalidate === 3600`.

## Shared Patterns

### `createPageMetadata` helper — the title + OG + canonical authority
**Source:** `src/lib/seo/page-metadata.ts:36-102`
**Apply to:** Every static-route metadata edit (SEO-01 resources/help/privacy/support/security-deposit-card, SEO-02 features).
- It is the single transform that produces `title` / `openGraph` / `twitter` / `alternates.canonical` from `{ title, description, path, ogImage?, noindex?, absoluteTitle? }`.
- `ogImage` arg is absolutized at `page-metadata.ts:41-47` — pass `"/api/og/features"`, not a full URL.
- `alreadyBranded` guard (`:69`) prevents double-branding when `title` contains `TenantFlow` — relevant because the `generate-metadata.ts` default title keeps the brand token after the separator fix.
- Pages on the ROOT segment (`src/app/page.tsx` only) must pass `absoluteTitle: true`; all Phase-12 targets are nested — leave it off.

### JSON-LD emission — two coexisting patterns
**Sources:** `src/components/seo/seo-json-ld.tsx` (site-wide) + `src/components/seo/json-ld-script.tsx` (per-page)
**Apply to:** SEO-03 only (no code change — verify the existing `SeoJsonLd` path).
- `SeoJsonLd` (`seo-json-ld.tsx:3-19`) calls `getJsonLd()` and maps `[Organization, SoftwareApplication]` into escaped `<script type="application/ld+json">` tags in root layout `<head>` (`layout.tsx:91`).
- `JsonLdScript` (`json-ld-script.tsx:16-33`) is the typed per-page emitter (`schema-dts`), used for `BreadcrumbList`/`Product`/`FAQ`. Both escape `<` → `<` for XSS.
- DO NOT add a second `SoftwareApplication` on the homepage while `getJsonLd()` still emits the site-wide one (Pitfall 5 — compare page comment `page.tsx:93-95` documents this hazard).

### Drift-guard test discipline — `readFileSync` source scan
**Sources:** `src/app/__tests__/design-token-drift.test.ts` (recursive walker + meta-test), `src/app/robots.test.ts` (import the source-of-truth array, bidirectional drift)
**Apply to:** SEO-01 separator drift guard, SEO-07 aria-current audit.
- Walk source with `readdirSync(root, { recursive: true, withFileTypes: true })`, skip `isTestPath`, per-file `describe`.
- Always include a meta-test block proving the detection regex catches known-bad and ignores known-good — `design-token-drift.test.ts:180-247` is the template.
- Runs in lefthook pre-commit + CI `checks` gate.

### Test framework conventions (CLAUDE.md)
**Apply to:** all 5 new/extended test files.
- Vitest 4 + jsdom. Component-render tests need `@vitest-environment jsdom` doc-comment.
- `vi.hoisted()` for any mock var referenced inside `vi.mock()`.
- `.rejects.toMatchObject({ message: expect.stringContaining(...) })` — never `.rejects.toThrow('string')` (chai 6 bug).
- No `any` — `unknown` + type guards. The `(entry as { parentPath?: string })` cast in the walker is the established narrow exception.
- 80% coverage threshold enforced pre-commit.

## No Analog Found

None. Every Phase-12 file has a strong existing analog — this phase has zero greenfield surface beyond the single `/api/og/features` route, which copies `/api/og/pricing` verbatim.

## Metadata

**Analog search scope:** `src/app/api/og/`, `src/app/{pricing,features,compare,resources,help,blog,privacy,support}/`, `src/lib/{generate-metadata.ts,seo/}`, `src/components/{seo,layout,compare,layout/navbar}/`, `src/app/__tests__/`, `src/lib/__tests__/`, `src/lib/seo/__tests__/`, `src/app/{robots,sitemap}.ts` + tests.
**Files scanned:** 24
**Pattern extraction date:** 2026-05-21
