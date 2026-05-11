---
phase: 06-blog-rebuild
phase_number: 6
generated: 2026-05-10
synthesized_from:
  - 06-RESEARCH-codebase-audit.md (Specialist 1 — DB schema, UI inventory, n8n surface map, soft-404 verdict)
  - 06-RESEARCH-content-strategy.md (Specialist 2 — 5 clusters, 12-post slate, n8n architecture, OG image strategy)
user_decisions_2026-05-10: 12 strategic decisions locked in 06-CONTEXT.md
db_state_2026-05-10: 100 draft rows (Phase 1 unpublish), 0 published; CHECK constraint = ('draft','published','archived')
infra_state_2026-05-10: 70%+ of blog UI infra already shipped from PR #674 (MarkdownContent, Article schema, BreadcrumbList JSON-LD, sitemap with real lastmod, RSS feed)
---

# Phase 6: Blog Rebuild + n8n Redesign — Canonical Research

## Locked Decisions (Pre-Plan Inputs)

All locked decisions are in `06-CONTEXT.md § <decisions>`. This file is the routing index.

| ID | Decision | Source |
|----|----------|--------|
| **BLOG-01 DB cleanup + status workflow** | Drop Phase-1 BEFORE-INSERT trigger; hard-DELETE 100 broken draft rows; extend CHECK to add `'in-review'`; add slug regex CHECK; 9 BEFORE-INSERT validation triggers | Specialist 1 + user 2026-05-10 |
| **BLOG-02 UI server-render + breadcrumbs** | `BlogClient` + `BlogCategoryClient` → server components; `/blog/[slug]` swap to `generateStaticParams` + `revalidate=300` + `notFound()`; shadcn breadcrumb primitive | Specialist 1 |
| **BLOG-03 n8n redesign** | Full LLM content factory via Claude Sonnet 4.5; webhook ingest at `supabase/functions/n8n-blog-ingest`; HMAC-SHA256 auth; 9 validation gates (DB defense-in-depth + n8n-side); `N8N-FLOW.md` runbook + JSON spec | Specialist 2 + user 2026-05-10 |
| **BLOG-04 12 initial posts** | 5 clusters × (3-2-2-2-3) distribution = 12 posts; titles + slugs locked in CONTEXT.md; funnel mix 3 top / 5 middle / 4 bottom; persona-aligned per Phase 4 lock | Specialist 2 + user 2026-05-10 |
| **BLOG-05 review/QA workflow** | Draft → in-review → published. Editorial gatekeeper = Supabase Studio direct edit (sole maintainer). Manual `published_at` set on flip. | Specialist 2 + user 2026-05-10 |
| **BLOG-06 sitemap + RSS reflection** | Already handle empty state per PR #674; auto-update on post publish. No code changes; verify-only. | Specialist 1 |

## Tier Shape (LOCKED — Option A "Full LLM content factory")

- **Trigger:** Manual webhook (curl from CLI; no cron)
- **LLM:** Claude Sonnet 4.5 (brand-voice + cost-ratio winner per Specialist 2)
- **Pipeline:** brief → research → outline → draft → `@vercel/og` image → SEO meta → 9 validation gates → INSERT into `blogs` (status='in-review')
- **Editorial gate:** User flips `'in-review'` → `'published'` in Supabase Studio
- **Cost:** ~22K words for 12 posts = <$1
- **OG images:** dynamic per-post via `@vercel/og` route at `src/app/api/og/blog/[slug]/route.tsx`

## DB Migration Strategy (LOCKED)

### Migration 1: drop Phase-1 BEFORE-INSERT reject trigger

The Phase-1 `unpublish_broken_blogs` migration installed a trigger that rejected any new INSERT containing the "Error Processing Blog" sentinel string. That trigger is obsolete — the Phase 6 9-gate validation replaces it. Drop it cleanly.

### Migration 2: extend status CHECK constraint

```sql
ALTER TABLE public.blogs DROP CONSTRAINT blogs_status_check;
ALTER TABLE public.blogs ADD CONSTRAINT blogs_status_check
  CHECK (status IN ('draft', 'in-review', 'published', 'archived'));
```

### Migration 3: add slug regex CHECK constraint

```sql
ALTER TABLE public.blogs ADD CONSTRAINT blogs_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

This closes the previous-flow `Date.now()` failure mode at the DB boundary.

### Migration 4: 9 BEFORE-INSERT validation triggers

One trigger function `validate_blog_post()` containing all 9 checks. Per check: word count, H2 count, persona phrase, slug pattern (already covered by CHECK), meta length, excerpt length, category enum, banlist, DocuSeal mention count.

### Migration 5: hard-DELETE Phase-1 broken draft rows

```sql
DELETE FROM public.blogs WHERE status = 'draft' AND created_at < '2026-05-09';
-- Expected: 100 rows
```

## UI Migration Strategy (LOCKED)

| File | Current state | Phase 6 action |
|------|---------------|----------------|
| `src/app/blog/page.tsx` | Server wrapper around `BlogClient` | Direct server-render — fetch `published` posts in the page component, render list inline |
| `src/app/blog/[slug]/page.tsx` | `force-dynamic` + `notFound()` | Swap to `generateStaticParams` (pre-render slugs from `published` posts) + `revalidate=300` (5-min ISR); `notFound()` only for slugs not in the static set |
| `src/app/blog/category/[slug]/page.tsx` | Server wrapper around `BlogCategoryClient` | Direct server-render — same pattern |
| `src/components/blog/BlogClient.tsx` | Client component with `useBlogs()` query + loading state | DELETE — replaced by server-rendering in page.tsx |
| `src/components/blog/BlogCategoryClient.tsx` | Same | DELETE |
| `src/components/blog/BlogPostBreadcrumb.tsx` | DOES NOT EXIST | NEW — shadcn breadcrumb primitive wrapper, mounted on `/blog/[slug]` and `/blog/category/[slug]` |
| `src/app/api/og/blog/[slug]/route.tsx` | DOES NOT EXIST | NEW — `@vercel/og` PNG generator |
| `src/hooks/api/use-blogs.ts` | TanStack Query hook | KEEP for any future client-side use; not consumed by Phase 6 SSR pages |

## n8n Webhook Ingest (LOCKED)

### New Edge Function: `supabase/functions/n8n-blog-ingest/index.ts`

- **Endpoint:** `POST /functions/v1/n8n-blog-ingest`
- **Auth:** HMAC-SHA256. n8n includes `x-n8n-signature` header containing `sha256(secret + body_json)`. Edge function reads `N8N_WEBHOOK_SECRET` from Supabase Vault, recomputes, rejects with 401 if mismatch.
- **Payload schema (n8n → Edge Function):**
  ```typescript
  {
    title: string,         // 5-100 chars
    slug: string,          // ^[a-z0-9]+(-[a-z0-9]+)*$
    excerpt: string,       // 80-200 chars
    content: string,       // 1,200-3,000 words, markdown
    category: 'lease-law'|'tax-prep'|'tenant-screening'|'maintenance'|'software-vault',
    meta_description: string, // 50-160 chars
    og_image_url?: string  // optional override; defaults to /api/og/blog/[slug]
  }
  ```
- **Validation:** 9 gates (word count, H2 count, persona phrase, slug pattern, meta length, excerpt length, category, banlist, DocuSeal mention count). Defense-in-depth — DB triggers are primary. n8n-side gates fail fast and return useful error messages.
- **Insert:** `INSERT INTO public.blogs (..., status='in-review')`. Return 201 + `{id, slug, status, blog_url}` on success.
- **Error responses:**
  - 400 with `{error, gate_failures: [{gate, message}]}` — validation failures
  - 401 — signature mismatch
  - 409 — slug collision (existing row with same slug)
  - 500 — internal error (Sentry-logged, generic message to client per CLAUDE.md)
- **Tests:** Deno suite at `supabase/functions/tests/n8n-blog-ingest.test.ts`. Cases: valid payload, signature mismatch, malformed JSON, banlist hit, persona missing, slug collision, word-count out-of-range, etc.

### `N8N-FLOW.md` runbook contents

Captures the n8n cloud workflow design as a runbook + JSON spec:
1. Trigger node: Webhook (manual)
2. Anthropic Claude node: outline generation (system prompt + user prompt for the topic)
3. Anthropic Claude node: draft generation (chained from outline)
4. Function node: pre-flight validation (run the 9 gates in JS before calling the Edge Function)
5. HTTP Request node: POST to `n8n-blog-ingest` with HMAC signature header
6. Branch on response: success path → log to Slack/email; failure path → log + retry
7. JSON workflow file importable into n8n cloud

User runs the flow 12 times manually (one per locked title) post-merge.

## Test Strategy

### New tests
- Unit: `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` — breadcrumb renders correct labels for slug/category combos
- Integration: `tests/integration/rls/blogs-status-workflow.rls.test.ts` — 9 cases pinning the validation gates against direct INSERT (anonymous denied; service-role accepts valid; service-role rejected on each gate violation)
- E2E: extend `tests/e2e/tests/public/seo-smoke.spec.ts` with breadcrumb-visible + OG-image-URL pattern assertions on `/blog/[slug]`
- E2E: extend persona-consistency.spec.ts (already covers `/blog`) — verify after 12 posts ship that body text contains "landlords"
- Edge Function: `supabase/functions/tests/n8n-blog-ingest.test.ts` — Deno suite for the webhook receiver

### Existing tests that must stay green
- `marketing-copy-landlord-only.test.ts` banlist — Phase 6 doesn't change banlist; verify untouched
- `persona-consistency.spec.ts` — `/blog` is in PUBLIC_PATHS; assertion stays green after 12 posts ship (each post body must contain "landlords" per gate #3)
- Phase 4 + Phase 5 regression guards — pricing.ts descriptions, Phase 2 NumberTicker, design-token diff gate

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **R1**: 9 DB triggers slow down INSERTs noticeably | LOW | LOW | Each trigger runs simple regex/length checks; expected <1ms total per row. Document with EXPLAIN ANALYZE in commit. |
| **R2**: HMAC signature implementation drifts between n8n and Edge Function | MEDIUM | HIGH | Lock the canonical signature spec in N8N-FLOW.md with a known-good test vector. Edge Function tests pin against the test vector. |
| **R3**: `generateStaticParams` slow on first build (12 posts × ISR) | LOW | LOW | 12 paths is trivial. Vercel build time impact <1s. |
| **R4**: OG image generation fails for some post (font load, SVG render) | MEDIUM | MEDIUM | Fallback to default site OG image at `og:image` if dynamic route returns 500. e2e asserts the URL pattern only, not the rendered PNG. |
| **R5**: Validation gate too strict — every post rejected | MEDIUM | HIGH | Each gate has a specific error message; n8n flow's pre-flight catches before Edge Function call. User can edit prompts and re-run. |
| **R6**: Slug collision in 12-post slate | LOW | LOW | All 12 slugs locked in CONTEXT.md and verified unique. DB CHECK constraint prevents collision at INSERT. |
| **R7**: Persona phrase "landlord" missing from a post body | MEDIUM | LOW | Gate #3 catches at insert; n8n prompt includes "every section must mention landlords" in system prompt. |
| **R8**: cannibalization between `tenantflow-vs-buildium` post and `/compare/buildium` page | MEDIUM | MEDIUM | Post #10 ships with `<link rel="canonical" href="/compare/buildium">` — directs Google's authority to the compare page. Monitor in Phase 12 SEO. |
| **R9**: Phase 1 `force-dynamic` removal causes ISR cache miss surge on first deploy | LOW | LOW | ISR `revalidate=300` (5 min) means first hit per slug is SSR; subsequent within 5min are cached. 12 posts × 1 SSR-hit-per-5min is trivial. |

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Tier choice (full LLM factory) | HIGH | User confirmed 2026-05-10 |
| 12-post slate | HIGH | 5 clusters convergent across 8 competitors; segment-aligned per Phase 4 lock |
| OG image strategy | HIGH | `@vercel/og` is 2026 dominant pattern; per-post unique at zero per-post cost |
| Status workflow primitive | HIGH | Single CHECK extension + simple Studio editorial flow |
| n8n webhook auth (HMAC) | HIGH | Standard pattern; Deno + Web Crypto API both support |
| 9 validation gates | HIGH | All grep-verifiable or regex-verifiable; defensive in depth |
| UI server-render rewrite | HIGH | Specialist 1 mapped every file; deletions clean |
| 70%+ existing infra | HIGH | Phase 4 PR #674 deliverables verified live |

## Sources

- `.planning/phases/06-blog-rebuild/06-RESEARCH-codebase-audit.md` (Specialist 1)
- `.planning/phases/06-blog-rebuild/06-RESEARCH-content-strategy.md` (Specialist 2)
- `.planning/phases/04-persona-copy/04-RESEARCH.md` (Phase 4 locked persona word + banlist)
- `.planning/phases/05-pricing-restructure/05-RESEARCH.md` (Phase 5 — DocuSeal de-amp constraint relevant for gate #9)
- 8 competitor blog crawls (TurboTenant, Avail, Hemlane, RentRedi, Stessa, Innago, TenantCloud, Baselane)
- Supabase MCP `execute_sql` 2026-05-10 (`blogs` table state confirmed: 100 draft, 0 published)

---

*Phase 6 research synthesized: 2026-05-10 — ready for `/gsd-plan-phase 6 --skip-research` dispatch.*
