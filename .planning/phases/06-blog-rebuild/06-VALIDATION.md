---
phase: 06-blog-rebuild
phase_number: 6
generated: 2026-05-10
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfilled: 2026-05-22
backfill_note: "Phase 15 milestone audit round-2 polish — frontmatter fields added retroactively; the test maps below and all referenced tests ship in CI (blog-post-breadcrumb.test.tsx, seo-smoke.spec.ts, blog/[slug] dynamicParams + notFound() unit coverage, plus the Phase 14 D-03/D-04 try-catch + loading.tsx regression layer)."
source: derived from `06-RESEARCH.md § Test Strategy` + `06-CONTEXT.md § <decisions>`
---

# Phase 6 Validation Strategy

## Test Framework Inventory

| Layer | Framework | Quick Command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `pnpm test:unit -- --run <path>` |
| E2E | Playwright | `pnpm test:e2e -- --project=public --grep "<grep>"` |
| Type | TypeScript 5.x strict | `pnpm typecheck` |
| Lint | ESLint flat | `pnpm lint` |
| RLS Integration | Vitest 4 + Supabase prod (dual-client) | `pnpm test:integration` |
| Edge Function | Deno | `pnpm supabase functions serve` + `deno test` |

## Phase Requirements → Test Map

### BLOG-01: DB cleanup + status workflow + validation gates

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| Phase-1 BEFORE-INSERT trigger DROPPED | grep | `grep -F 'DROP TRIGGER IF EXISTS reject_n8n_error_blogs_trigger' supabase/migrations/202605*` returns ≥1 (Info-#10 fix — Phase-1 trigger name is `reject_n8n_error_blogs_trigger`, verified at `supabase/migrations/20260508231802_unpublish_broken_blogs.sql:100`) |
| 100 broken Phase-1 draft rows DELETED | unit | Migration includes `DELETE FROM public.blogs WHERE status='draft' AND created_at < '2026-05-09'`; verify via Supabase MCP `execute_sql SELECT COUNT(*)` returns 0 post-migration |
| `'in-review'` added to status CHECK | grep | `grep -F "'in-review'" supabase/migrations/202605*` returns ≥1 |
| Slug regex CHECK enforced (leading-letter requirement) | RLS test | INSERT slug `'1234567890'` (numeric-only) rejected with message containing `blogs_slug_format_check`; INSERT slug `'valid-slug-format'` accepted; INSERT slug `'Bad Slug With Spaces'` rejected. Regex is `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (Blocker-#4 fix). |
| `canonical_url` column exists (nullable text, no CHECK) | unit | Migration adds `ADD COLUMN IF NOT EXISTS canonical_url text NULL`; verify `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='blogs' AND column_name='canonical_url'` returns 1 row (Blocker-#1 prerequisite) |
| `canonical_url` accepts override + defaults to NULL | RLS test | INSERT with `canonical_url='/compare/buildium'` succeeds + SELECT returns the value; INSERT without `canonical_url` succeeds + SELECT returns NULL |
| Word count gate rejects out-of-range | RLS test | INSERT content with 800 words rejected; 1500 words accepted |
| H2 count gate rejects out-of-range | RLS test | INSERT content with 2 H2s rejected; 5 H2s accepted |
| Persona phrase gate rejects | RLS test | INSERT content without "landlord" rejected |
| Meta length gate rejects | RLS test | INSERT meta_description=30 chars rejected; 100 chars accepted |
| Excerpt length gate rejects | RLS test | INSERT excerpt=50 chars rejected; 120 chars accepted |
| Category enum gate rejects | RLS test | INSERT category='invalid' rejected; category='lease-law' accepted |
| Banlist gate rejects | RLS test | INSERT content containing banned phrase rejected |
| DocuSeal mention gate rejects ≥2 mentions | RLS test | INSERT content with 3 'DocuSeal' rejected; 1 'DocuSeal' accepted |

### BLOG-02: UI server-render + breadcrumbs + OG image + canonical wiring

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `/blog` page is server component (no `'use client'`) | grep | `grep -L "'use client'" src/app/blog/page.tsx` returns the path |
| `BlogClient.tsx` deleted | grep | `test ! -f src/components/blog/BlogClient.tsx && echo "deleted"` |
| `BlogCategoryClient.tsx` deleted | grep | `test ! -f src/components/blog/BlogCategoryClient.tsx && echo "deleted"` |
| `/blog/[slug]` uses `generateStaticParams` | grep | `grep -F 'export async function generateStaticParams' src/app/blog/[slug]/page.tsx` returns 1 |
| `/blog/[slug]` uses `revalidate = 300` | grep | `grep -F 'export const revalidate = 300' src/app/blog/[slug]/page.tsx` returns 1 |
| `/blog/[slug]` does NOT use `force-dynamic` | grep | `grep -F "export const dynamic = 'force-dynamic'" src/app/blog/[slug]/page.tsx` returns 0 |
| `/blog/[slug]` `generateMetadata` wires `alternates.canonical` from `post.canonical_url` | grep | `grep -F 'canonical_url' src/app/blog/[slug]/page.tsx` returns ≥1 AND `grep -E 'alternates: ?\\{ ?canonical' src/app/blog/[slug]/page.tsx` returns ≥1 (Blocker-#1 fix — canonical lives in <head> via Next.js Metadata API, NOT in markdown body) |
| Breadcrumb component imported on `/blog/[slug]` | grep | `grep -F 'BlogPostBreadcrumb' src/app/blog/[slug]/page.tsx` returns 1 |
| OG image route exists | grep | `test -f src/app/api/og/blog/[slug]/route.tsx` |
| Live: `/blog/unknown-slug` returns 404 | manual | `curl -s -o /dev/null -w "%{http_code}\n" https://tenantflow.app/blog/this-does-not-exist` returns `404` |
| Live: `/blog/[slug]` shows visible breadcrumb | e2e | seo-smoke spec extended; assert `aria-label="Breadcrumb"` element present (skip-if-not-published guard) |
| Live: `/blog/[slug]` `<meta property="og:image">` points at `/api/og/blog/{slug}` | e2e | spec asserts URL pattern matches `api\\/og\\/blog\\/` |
| Live: `/blog/tenantflow-vs-buildium` `<link rel="canonical">` href ends with `/compare/buildium` | e2e | seo-smoke spec asserts `page.locator('link[rel="canonical"]')` has href matching `/\/compare\/buildium$/` (skip-if-not-published guard for pre-editorial-flip merge window) |

### BLOG-03: n8n redesign + webhook ingest (with canonical_url passthrough)

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `n8n-blog-ingest` Edge Function exists | grep | `test -f supabase/functions/n8n-blog-ingest/index.ts` |
| HMAC signature mismatch returns 401 | edge fn test | Deno test: invalid signature → 401 |
| Valid payload + signature → 201 + insert | edge fn test | Deno test: valid → 201, row exists with `status='in-review'` |
| Banlist hit → 400 with gate_failures | edge fn test | Deno test: banned phrase → 400 with specific gate name |
| Slug collision → 409 | edge fn test | Deno test: insert twice with same slug → second returns 409 |
| Slug regex aligned with Plan 06-01 (leading-letter) | grep | `grep -F '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' supabase/functions/n8n-blog-ingest/index.ts` returns 1 |
| `canonical_url` payload field threads into INSERT (Blocker-#1 wiring) | edge fn test | Deno test: payload includes `canonical_url='/compare/buildium'` → 201, response data + SELECT row show `canonical_url='/compare/buildium'` |
| `canonical_url` shape gate rejects `javascript:` URI | edge fn test | Deno test: payload `canonical_url='javascript:alert(1)'` → 400 with gate `canonical_url_format` |
| Deno tests use deterministic `phase-6-deno-` slug prefix + beforeAll/afterEach/afterAll cleanup | grep | `grep -F 'phase-6-deno-' supabase/functions/tests/n8n-blog-ingest.test.ts` returns ≥1; `grep -F 'beforeAll' ...` returns ≥1; `grep -F 'afterEach' ...` returns ≥1 (Warning-#8 fix) |
| HMAC test vector reproducible | unit | `deno run scripts/compute-hmac-vector.ts` prints hex matching the value embedded in N8N-FLOW.md (Warning-#9 fix) |
| `N8N-FLOW.md` runbook exists | grep | `test -f .planning/phases/06-blog-rebuild/N8N-FLOW.md` |

### BLOG-04: 12 initial posts shipped

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| 12 posts inserted with `status='in-review'` after n8n flow runs | manual | Supabase MCP `SELECT COUNT(*) FROM blogs WHERE status='in-review' AND category IN (...)` returns 12 |
| All 12 slugs match locked list | grep | `for slug in <12 slugs>; do echo $slug; done | sort` matches Supabase MCP `SELECT slug FROM blogs ORDER BY slug` |
| All 12 categories distributed 3-2-2-2-3 | unit | Aggregate query: lease-law=3, tax-prep=2, tenant-screening=2, maintenance=2, software-vault=3 |
| Post #10 (`tenantflow-vs-buildium`) has `canonical_url='/compare/buildium'` in DB column (Blocker-#1) | manual | `mcp__supabase__execute_sql "SELECT canonical_url FROM blogs WHERE slug='tenantflow-vs-buildium'"` returns `/compare/buildium` |
| Brief #10 payload contains `canonical_url` field (NOT a `<link>` in markdown body) | grep | `grep -qF '"canonical_url": "/compare/buildium"' .planning/phases/06-blog-rebuild/06-04-BRIEFS.md` exits 0 |
| 06-04-BRIEFS.md verifies all 12 locked slugs and brief #10 payload field | grep | See Plan 06-04 Task 1 verify block (Warning-#7 fix) |

### BLOG-05: Review/QA workflow active (automated SEO+tone gate satisfied by gate machinery)

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| BLOG-05 "automated SEO+tone gate pre-publish" delivered by 9 DB triggers + n8n preflight + integration test | manual + grep | `must_haves.truths` in Plan 06-04 explicitly maps BLOG-05 to the gate machinery (Blocker-#2 fix); `tests/integration/rls/blogs-status-workflow.rls.test.ts` pins each gate end-to-end |
| `'in-review'` rows can be flipped to `'published'` via Studio | manual | User confirms post-merge: each of 12 rows flipped one-by-one |
| `published_at` timestamp set on flip | manual | Trigger or app-level set: verify Supabase MCP query shows `published_at IS NOT NULL` post-flip |
| `'published'` rows visible to anonymous users via RLS | RLS test | Anonymous client SELECT WHERE status='published' returns rows; status='in-review' returns 0 |

### BLOG-06: Sitemap + RSS reflection

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `/sitemap.xml` includes 12 published posts after staggered publish | manual | `curl -s https://tenantflow.app/sitemap.xml | grep -oE '<loc>[^<]+/blog/[a-z0-9-]+</loc>' | wc -l` returns ≥12 |
| `/feed.xml` carries 12 published posts | manual | `curl -s https://tenantflow.app/feed.xml | grep -oE '<item>' | wc -l` returns ≥12 |
| `lastmod` on each post matches DB `updated_at ?? published_at` | manual | Spot-check 3 random slugs |

### Phase 4 + Phase 5 regression guards

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| Phase 4 banlist test green | unit | `pnpm test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` exits 0 |
| Phase 4 persona-consistency e2e green | e2e | `pnpm test:e2e -- --project=public --grep "Persona consistency"` |
| Phase 5 pricing.ts descriptions byte-identical | grep | 3-line grep guard on pricing.ts (Starter/Growth/Max descriptions) |
| Phase 5 `MAX_PUBLIC_PRICE_DISPLAY = '$149'` | grep | `grep -F "MAX_PUBLIC_PRICE_DISPLAY = '\$149'" src/config/pricing.ts` returns 1 |
| Phase 5 `productJsonLd.offers.length === 3` | unit | `pnpm test:unit -- --run src/app/pricing/__tests__/page.test.ts` exits 0 |
| Phase 2 NumberTicker `value: 500` | grep | `grep -F 'value: 500' src/components/sections/stats-showcase.tsx` returns 1 |

### Cross-cutting design-token diff gate

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| No new hex codes (excluding OG route's deliberate inline CSS) | grep | `git diff main...HEAD -- src/ | grep -E "^\+.*#[0-9a-fA-F]{3,8}\\b" | grep -v '/api/og/blog/' | wc -l` returns 0 |
| No new rgba | grep | `git diff main...HEAD -- src/ | grep -E "^\+.*rgba?\(" | grep -v '/api/og/blog/' | wc -l` returns 0 |
| No bg-white | grep | `git diff main...HEAD -- src/ | grep -E "^\+.*bg-white" | wc -l` returns 0 |
| No inline ms | grep | `git diff main...HEAD -- src/ | grep -E "^\+.*\b[0-9]+ms\b" | wc -l` returns 0 |

## Sampling Rate

- **Per task commit:** task-specific verify block
- **Per plan merge:** `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Plan 06-01 gate:** above + Supabase MCP `list_migrations` reconciled + RLS integration tests for the 9 validation gates + canonical_url column verified
- **Plan 06-02 gate:** above + e2e seo-smoke green (including canonical/buildium assertion with skip-if-not-published)
- **Plan 06-03 gate:** above + Edge Function Deno tests pass + HMAC vector reproducible via `deno run scripts/compute-hmac-vector.ts`
- **Plan 06-04 gate:** above + 12 posts inserted as `in-review` (manual flow run) + brief #10's canonical_url column verified
- **Phase ship gate:** full suite + Phase 4 + Phase 5 regression guards
- **Post-deploy gate:** Vercel deploy + sitemap shows 12 (after staggered publish complete)

## Wave 0 Gaps

New files to create:
- `src/app/api/og/blog/[slug]/route.tsx` (Plan 06-02)
- `src/components/blog/blog-post-breadcrumb.tsx` (Plan 06-02)
- `supabase/functions/n8n-blog-ingest/index.ts` (Plan 06-03)
- `supabase/functions/tests/n8n-blog-ingest.test.ts` (Plan 06-03)
- `scripts/compute-hmac-vector.ts` (Plan 06-03 — Warning-#9 fix)
- `tests/integration/rls/blogs-status-workflow.rls.test.ts` (Plan 06-01)
- `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` (Plan 06-02)
- `.planning/phases/06-blog-rebuild/N8N-FLOW.md` (Plan 06-03)

Files to delete:
- `src/components/blog/BlogClient.tsx` (Plan 06-02)
- `src/components/blog/BlogCategoryClient.tsx` (Plan 06-02)

DB migrations to ship (orchestrator-applied via Supabase MCP):
- `phase_6_drop_phase_1_reject_trigger`
- `phase_6_extend_status_check_in_review`
- `phase_6_slug_format_check` (regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` — Blocker-#4 fix)
- `phase_6_validation_triggers`
- `phase_6_delete_phase_1_broken_drafts`
- `phase_6_blogs_canonical_url` (NEW — Blocker-#1 prerequisite)

## Manual Verification Anchors

| Plan | Manual Checkpoint |
|------|-------------------|
| 06-01 | Supabase MCP confirms migrations applied; trigger validation matches expected behavior; 100 rows deleted; `canonical_url` column visible in `information_schema.columns` |
| 06-02 | After Vercel deploy: `/blog` SSR (no client loading state); `/blog/[slug]` returns 404 for unknown slug; breadcrumb visible; OG image URL points at `/api/og/blog/{slug}`; `/blog/tenantflow-vs-buildium` has `<link rel="canonical" href="/compare/buildium">` in `<head>` (after editorial flip; e2e self-skips if pre-flip) |
| 06-03 | n8n flow imported into n8n cloud from N8N-FLOW.md JSON; HMAC test vector matches between flow and Edge Function (reproducible via `deno run scripts/compute-hmac-vector.ts`); Deno test suite cleans up via `phase-6-deno-` prefix |
| 06-04 | Run n8n flow 12 times (one per locked title); verify 12 rows in `blogs` with `status='in-review'`; brief #10's `canonical_url` column = `/compare/buildium`; flip each to `published` over 3-4 weeks |

## Security Domain

- **Webhook auth:** HMAC-SHA256 with `N8N_WEBHOOK_SECRET` from Supabase Vault. Signature in `x-n8n-signature` header. Edge Function rejects with 401 if mismatch. Standard CSRF + replay defenses.
- **DB RLS:** anonymous SELECT `WHERE status='published'`; service-role full access; n8n flow uses service-role key.
- **Input validation:** 9 gates at DB-trigger level (defense-in-depth) + n8n-side preflight (fail fast). Slug regex requires leading letter (Blocker-#4).
- **canonical_url URI safety:** Edge Function rejects values that don't start with `/` or `https://` (`canonical_url_format` gate, defense against `javascript:` injection). Next.js Metadata API additionally normalizes via URL-safe serialization.
- **No PII handling:** posts are public marketing content.

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Test framework inventory | HIGH | Same as Phases 2-5 |
| BLOG-01 schema migration tests | HIGH | Standard CHECK constraint + trigger patterns; canonical_url column is plain nullable text |
| BLOG-02 SSR + breadcrumb + OG + canonical wiring | HIGH | Specialist 1 mapped every file; existing PR #674 patterns reusable; Next.js Metadata.alternates.canonical is the framework-native canonical mechanism |
| BLOG-03 n8n + Edge Function | HIGH | HMAC pattern is standard; n8n flow JSON spec is new; HMAC vector reproducible via script |
| BLOG-04 12 posts | HIGH | Locked slate; manual flow execution post-merge; brief #10 canonical_url wired via payload field |
| BLOG-05 review workflow | HIGH | Gate machinery delivers "automated" requirement; editorial flip delivers "tone" requirement |
| BLOG-06 sitemap + RSS | HIGH | Already handle empty state per PR #674 |
| Phase 4 + 5 regression guards | HIGH | All grep/unit-checkable; established pattern |

---

*Validation strategy generated: 2026-05-10 — derived from research synthesis after 12 strategic decisions locked. Revision 1 (Blockers-1/2/3/4 + Warnings-5/6/7/8/9 + Infos-10/11) applied 2026-05-10.*
