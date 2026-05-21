---
phase: 12
slug: seo-metadata-schema-content-cleanup
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note (from 12-RESEARCH.md):** Mixed phase — some real production
> work, mostly verify-and-pin.
> - SEO-01: REAL — 8 title strings drift from the canonical pipe `|` separator
>   (em-dash / hyphen); normalize + drift-guard test.
> - SEO-02: mostly shipped (`/pricing` + `/compare/[competitor]` OG routes exist);
>   `/features` is the ONLY gap — new `/api/og/features/route.tsx`.
> - SEO-03: `Organization` + `SoftwareApplication` JSON-LD already emit site-wide
>   via `getJsonLd()` → `<SeoJsonLd/>`; accept site-wide as satisfying the
>   requirement (zero code change), add a `getJsonLd()` regression-pin test.
> - SEO-04/05/06: shipped (blog slugs DB-sourced; visible breadcrumbs on compare
>   + blog; footer `Sitemap` link + `robots.ts` sitemap declaration) — verify-and-pin.
> - SEO-07: `aria-current` mechanically shipped via `isActiveLink`; needs a NEW
>   consolidated `seo-aria-current-audit.test.ts` (the green report).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom |
| **Config file** | `vitest.config.ts` (existing — no install needed) |
| **Quick run command** | `bunx vitest --run --project unit <file>` |
| **Full suite command** | `bun run test:unit` |
| **Estimated runtime** | ~3-6s (quick) / ~15s (full) |

---

## Sampling Rate

- **After every task commit:** Run the per-task `<automated>` command
- **After every plan wave:** Run `bun run validate:quick`
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 6 seconds per task

---

## Per-Task Verification Map

| Plan / Task | Requirement | Verification | Automated Command | Type |
|-------------|-------------|--------------|-------------------|------|
| 12-01 / T1 | SEO-01 | `generate-metadata.ts` — 3 brand strings on pipe, em-dash absent, template untouched | grep checks (see 12-01 plan verify) | unit (grep) |
| 12-01 / T2 | SEO-01 | 6 page titles — zero spaced em-dash/hyphen separators in `title:` strings | `grep -nE 'title: "[^"]* [—–-] '` over the 6 files returns nothing | unit (grep) |
| 12-01 / T3 | SEO-01 | title-separator drift-guard test (scans all `src/app` titles + `generate-metadata.ts`) | `bunx vitest --run --project unit src/app/__tests__/seo-title-separator-drift.test.ts` | unit (drift guard) |
| 12-02 / T1 | SEO-02 | `/api/og/features` edge route — 1200×630, `runtime=edge`, `revalidate=3600`, oklch only | `bash` grep checks (see 12-02 plan verify) | unit (grep) |
| 12-02 / T2 | SEO-02 | `/features` metadata wires `ogImage: "/api/og/features"` | `grep -qE 'ogImage:\s*"/api/og/features"' src/app/features/page.tsx` | unit (grep) |
| 12-02 / T3 | SEO-02 | `/features` metadata test — `openGraph` + `twitter` images point at `/api/og/features`; route edge config | `bunx vitest --run --project unit src/app/features/__tests__/page.test.ts` | unit |
| 12-03 / T1 | SEO-03 | `getJsonLd()` regression pin — `Organization` + `SoftwareApplication`, E.164 phone, `AggregateOffer` | `bunx vitest --run --project unit src/lib/__tests__/generate-metadata.test.ts` | unit (regression pin) |
| 12-03 / T2 | SEO-06 | footer `/sitemap.xml` external-link render assertion | `bunx vitest --run --project unit src/components/layout/__tests__/footer.test.tsx` | unit |
| 12-03 / T3 | SEO-07 | consolidated aria-current audit — at most one `aria-current="page"` per surface/route | `bunx vitest --run --project unit "src/app/__tests__/seo-aria-current-audit.test.*"` | unit (audit) |
| 12-03 / verify-only | SEO-04 | blog slugs DB-sourced via `generateStaticParams`, no timestamp generator — code-inspection note in SUMMARY | n/a (Phase 6 owns; verify by inspection) | code inspection |
| 12-03 / verify-only | SEO-05 | visible breadcrumbs on `/compare/[competitor]` + blog already pinned | `bunx vitest --run --project unit src/components/compare/__tests__/compare-breadcrumb.test.tsx src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` | unit (existing) |

---

## Wave 0 Requirements

No separate Wave 0 phase. Vitest 4 + jsdom already configured. All three plans are Wave 1
(zero `files_modified` overlap — fully parallel-eligible).

New files this phase: `src/app/api/og/features/route.tsx` (SEO-02), the title-separator
drift-guard test (SEO-01), the `/features` metadata test (SEO-02), the `getJsonLd()` pin
test (SEO-03), `footer.test.tsx` (SEO-06), and `seo-aria-current-audit.test.ts` (SEO-07).
SEO-04/05 are verify-only (no new test).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/features` OG image renders correctly when shared | SEO-02 | Visual render of the generated image | Hit `/api/og/features` in a browser; confirm a 1200×630 branded image |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every task in 12-01/02/03 carries an `<automated>` command (grep or `bunx vitest --run`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — all 9 tasks have automated verify
- [x] No watch-mode flags — all commands use `--run`
- [x] Feedback latency < 6s — grep checks are instant; per-file vitest runs are ~3-6s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner — 2026-05-21)
