# Phase 1 — Canonical Research (Synthesized)

**Phase:** 01 — Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder)
**Synthesized:** 2026-05-08
**Sources:** 4 specialist research files (see Appendices below) + REQUIREMENTS.md (CRIT-01, CRIT-03) + ROADMAP.md (Phase 1 success criteria)
**Consumed by:** `/gsd-plan-phase 1`

This is the single canonical research document for Phase 1. The four specialist files remain in this directory as appendices (referenced by name when deeper detail is needed):

- `01-RESEARCH-blog-data.md` — Specialist 1 (DB safety, identification rule, state transition, migration shape, rollback)
- `01-RESEARCH-blog-seo.md` — Specialist 2 (HTTP status, sitemap/RSS, empty-state, soft-404 audit, Phase 6 forward-compat)
- `01-RESEARCH-pricing-schema.md` — Specialist 3 (JSON-LD shape, competitor survey, Product vs SoftwareApplication)
- `01-RESEARCH-pricing-ui.md` — Specialist 4 (Stripe-vs-public divergence, comparison table, features grid, annual toggle, CTA, design tokens)

---

## Phase 1 TL;DR

Phase 1 is a **stop-bleed** PR. Two parallel-eligible workstreams, neither requiring novel tech:

1. **CRIT-01 — Blog bulk-unpublish.** One SQL migration via Supabase MCP `apply_migration` flips `~70` broken `blogs` rows from `status='published'` → `status='draft'`, plus a temporary BEFORE-INSERT trigger guarding against n8n re-bleed (n8n is **confirmed still active**). Read path already filters `status='published'` on all four public surfaces (`/blog`, `/blog/[slug]`, `/sitemap.xml`, `/feed.xml`, `get_blog_categories` RPC) — **zero application code change required**. `BlogEmptyState` already wired. Real `404` already emitted by `notFound()`.
2. **CRIT-03 — Pricing "Custom" placeholder.** Three (not four) public surfaces drift on Max-tier pricing: comparison-table sticky header (`$199/mo`), pricing-page metadata description, JSON-LD `Product.offers[2].price`. Pricing card already says "Custom". Fix: introduce one `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` constant in `src/config/pricing.ts`; update the comparison-table cell to use it; **omit Max from JSON-LD `offers` entirely** (Specialist-3 Option C — industry default); update metadata description string. Stripe products and prices stay untouched (Phase 5 owns the restructure). Authenticated `/billing/plans` UI is **out of scope**.

Estimated implementation surface: 1 migration file + 2 component edits + 2 config/page edits + 1 test update. Zero design-token risk (no new visual tokens added).

---

## Standard Stack

| Layer | Tool | Phase 1 Use |
|-------|------|-------------|
| Migrations | Supabase MCP `apply_migration` (preferred) → `mcp__supabase__list_migrations` for timestamp reconciliation | CRIT-01 single migration with pre/post-flight `do $$` assertion blocks + the BEFORE-INSERT re-bleed-guard trigger |
| Migration drift handling | Per `migration-mcp-prod-drift.md` memory: rename repo file to match prod-assigned timestamp | Mandatory after `apply_migration` returns |
| Pre-flight verification | Supabase MCP `mcp__supabase__execute_sql` | Run the 6 verification queries in Specialist-1 § Identification Rule before applying |
| Pricing config | `src/config/pricing.ts` — single source for `PRICING_PLANS` + Stripe IDs | Add `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` |
| JSON-LD factory | `src/lib/seo/product-schema.ts` (`createProductJsonLd`) — unchanged | Call site in `src/app/pricing/page.tsx` passes 2 offers (not 3) |
| Test framework | Vitest 4 (`pnpm test:unit`) | Update `src/lib/seo/__tests__/product-schema.test.ts` + page-level assertion for "exactly 2 offers" |
| RLS-protected mutation | Migration runs as superuser, bypasses RLS; SELECT policy `blogs_select_published` (`status='published'`) is the visibility gate | No RLS changes |
| Schema mutation | `blogs.status` is `text` with `CHECK ('draft','published','archived')` — no DDL needed | Phase 1 stays in this lane |

---

## Architecture Patterns

| Pattern | Where | Rationale |
|---------|-------|-----------|
| **Soft-flip via `status` column** (vs archive-then-delete) | CRIT-01 | Properties already use `status='inactive'`; blogs use `status='draft'`. Reversible by symmetric UPDATE. ~100-row volume + one-shot mutation = wrong fit for the archive-then-delete pattern (which targets 10k+/day operational logs). |
| **One-shot SQL migration with pre/post-flight `do $$` assertions** | CRIT-01 | `raise exception` on bound violations aborts; `raise notice` logs counts. Idempotent because WHERE includes `status='published'` (re-run matches zero rows). |
| **Defense-in-depth WHERE: `(title=... OR content LIKE ...)`** | CRIT-01 | Two of three n8n failure-path signatures; `slug LIKE 'error-%'` skipped to avoid false positives on legit "errors-about" content. |
| **Temporary re-bleed guard via BEFORE-INSERT trigger** | CRIT-01 | n8n confirmed still active. Trigger raises `exception` on rows matching the bad-row signature. Phase 6 (BLOG-03) drops the trigger after the redesigned n8n flow ships. |
| **Public-vs-Stripe price divergence via planId/variant boundary check** | CRIT-03 | Existing precedent: `pricing-card-standard.tsx:167-168` already shows "Custom" when `variant === 'enterprise'`; `kibo-style-pricing.tsx:143-146` independently uses `planId === 'max'`. Phase 1 propagates this to the 3 stale surfaces via one shared constant. |
| **Single shared placeholder constant** | CRIT-03 | `MAX_PUBLIC_PRICE_DISPLAY` in `src/config/pricing.ts`. Phase 5 cleanup is `grep -r MAX_PUBLIC_PRICE_DISPLAY src/` → delete constant + 3 call sites. |
| **JSON-LD: omit unpriced tier from `offers` array** (Schema.org Option C) | CRIT-03 | Industry default: Notion, Slack, RentRedi, AppFolio all do this. Google's Structured Data General Guidelines forbid emitting prices the visible page doesn't show. |
| **Sitemap/feed self-healing via existing `status='published'` filters** | CRIT-01 | `src/app/sitemap.ts:120` and `src/app/feed.xml/route.ts:70` already filter. ISR `revalidate=86400` regenerates within 24h of merge. **Zero code changes needed.** |
| **Server-component `notFound()` before render** | CRIT-01 | `src/app/blog/[slug]/page.tsx:61, 104` calls `notFound()` from `generateMetadata` AND `Page` before any JSX returns. No `loading.tsx` in the segment. Real 404 emitted. **No soft-404.** |

---

## Don't Hand-Roll

| Anti-pattern | Why not | Use instead |
|--------------|---------|-------------|
| Don't introduce a `blogs_archive` table | Volume + retention SLA mismatch (archive pattern is for 10k+/day operational logs with policy-driven retention; this is one-shot 70-row content correction) | `UPDATE blogs SET status='draft'` — soft-flip via existing `status` column |
| Don't hard-DELETE blog rows in Phase 1 | Phase 6 BLOG-01 explicitly owns the categorize-and-delete decision (REQUIREMENTS.md L51) | Soft-flip; Phase 6 hard-deletes after categorizing |
| Don't change the CHECK constraint or add an enum to `blogs.status` | `add_status_enums` migration (L48,64,76) deliberately left `blogs.status` as `text`-with-CHECK because of the active n8n workflow | Use existing `'draft'` value |
| Don't run the migration against the Supabase SQL editor without an `apply_migration` MCP call | Manual edits leave no audit trail in repo | Use Supabase MCP `apply_migration`; reconcile timestamp via `list_migrations` post-apply |
| Don't add an Edge Function for the bulk update | Massive overkill (deploy + secrets + rate-limit + error handler) for a single `UPDATE` | One-shot SQL migration |
| Don't use 410 instead of 404 | Google explicitly states 4xx (except 429) treated identically; 410 plumbing adds complexity for zero crawler benefit | Existing 404 path via `notFound()` |
| Don't request URL inspection for 70 broken URLs in GSC | Throttled to ~10/day; no faster than natural deindex | Let sitemap-honest 404s drive the 2–4 week deindex |
| Don't use Google Indexing API for blog URLs | Google explicitly forbids non-`JobPosting`/`BroadcastEvent`; Gary Illyes called this actively harmful | Skip |
| Don't use GSC Removals tool | Temporary 6-month relief, not deindex; permanent removal still requires 404 | Skip |
| Don't build a generic blog "Coming soon" page | `BlogEmptyState` already exists at `src/components/shared/blog-empty-state.tsx` and is wired at `blog-client.tsx:108-110` | Use existing component, unchanged |
| Don't switch JSON-LD to `SoftwareApplication` for `/pricing` | `SoftwareApplication` requires `aggregateRating` OR `review`; we have neither (audit item #31 confirms zero customer proof) | Stay on `Product` schema; SEO-03 (Phase 12) adds `SoftwareApplication` to homepage separately |
| Don't add a `displayPrice` field to `PricingConfig` interface | Bloats type for one transitional value; only Max needs it; Phase 5 rips it out anyway | One module-scope constant `MAX_PUBLIC_PRICE_DISPLAY` |
| Don't price-place "Custom" inline as `Offer.price` text | `Offer.price` requires numeric string per Google docs; non-numeric triggers warning | Omit Max from `offers` array entirely; mention in `Product.description` text |
| Don't fabricate `AggregateOffer.highPrice` | Yoast docs require `highPrice`; making one up = misleading markup violation | Skip AggregateOffer; emit only Starter + Growth as individual `Offer` nodes |
| Don't use Stripe `metadata.public_price_display` | Adds external surface Phase 5 must reconcile; Phase 5 replaces products entirely | Codebase-only constant |
| Don't touch the homepage features-section "Max unlimited" string | That's a feature *limit* description, not a price (audit's "4 surfaces" framing is wrong — it's 3 surfaces; see Open Questions Resolved §2) | Leave it |
| Don't change the annual-toggle "Save $158" math or copy | Math is correct: Growth $79×12 − $790 = $158 (audit item #16 is wrong; see Open Questions Resolved §3) | Leave it; CONS-10 (Phase 7) owns any future revisit |
| Don't replace "Connect with sales" / "Schedule a walkthrough" / "Talk to Sales" labels in Phase 1 | Phase 10 (TRUST-03) owns CTA canonicalization | Leave them; the Max card already uses canonical "Contact Sales" |
| Don't touch authenticated `/billing/plans` UI | Authenticated subscribers need Stripe-truth pricing; CRIT-03 scope is public marketing surfaces only | Leave at $199 (see Open Questions Resolved §4) |
| Don't lower `revalidate` on `sitemap.ts` / `feed.xml` | Bottleneck is Google's natural crawl frequency, not our regen cadence | Leave at 86400 |
| Don't manually `revalidatePath('/sitemap.xml')` after the migration | One-shot DB update isn't a Server Action chain; not worth the wiring | Trust ISR's 24h cycle |

---

## Common Pitfalls

These get checked at `/gsd-verify-work` time. Most are mitigations the planner should turn into explicit verification tasks.

### CRIT-01 pitfalls

1. **Migration filename timestamp drifts from prod-assigned timestamp via MCP.** Per `migration-mcp-prod-drift.md` memory, `apply_migration` assigns a prod-side timestamp; rename the repo file to match before merging. Run `mcp__supabase__list_migrations` after applying.
2. **WHERE clause too wide → flips a legit "errors-about" article.** Pre-flight queries (5)+(6) in Specialist-1 explicitly check the disjunctive split. Non-zero on either = human eyeball before applying.
3. **WHERE clause too narrow → tail of bad rows still indexed.** Pre-flight query (4) shows title distribution; widen if a non-trivial cluster of other "error-shaped" titles appears.
4. **n8n re-bleed after migration.** **Confirmed live** by user. Mitigation: temporary BEFORE-INSERT trigger (mandatory per § CRIT-01 Re-bleed Guard below) drops in the same migration.
5. **Soft-404 instead of real 404.** Verify post-merge: `curl -sI https://tenantflow.app/blog/error-1778151609106 | head -1` MUST return `HTTP/2 404`. If 200, investigate streaming.
6. **Sitemap CDN cache serves stale URLs.** ISR `revalidate=86400` resolves within 24h. Worst-case 5-min stale at the Vercel edge — acceptable for stop-bleed.
7. **Concurrent UPDATE from n8n during migration.** Low risk (n8n inserts; migration UPDATEs already-published rows). Not preemptively wrapped in `LOCK TABLE`. The trigger guards new inserts.
8. **Slug collision when Phase 6 republishes.** Bad slugs are `error-<unix_ms>`; Phase 6 uses semantic slugs. Namespaces don't overlap. **Zero risk.**
9. **Bad-row count outside `[60, 200]`.** Migration aborts via `raise exception` if `v_match_count > 200`. Pre-flight query (1) reconciles before invoking.

### CRIT-03 pitfalls

10. **Webspam manual action for "structured data not matching visible content."** **Highest CRIT-03 risk.** Mitigation: ship Option C (omit Max from JSON-LD) BEFORE any further drift; the page already shows "Custom" — schema MUST agree on day 1.
11. **`product-schema.test.ts` line 106 still asserts `offers[2].price === '199'`.** Factory test stays valid (factory accepts any-length array); add a NEW page-level test asserting "exactly 2 offers, Starter + Growth, no Max" against the page's call-site.
12. **A reviewer sees `Custom` in PR diff and worries Stripe was changed.** Mitigation: explicit comment in PR body + plan referencing `src/config/pricing.ts:152-159` showing Stripe price IDs are untouched.
13. **Future agent sees `MAX_PUBLIC_PRICE_DISPLAY` and assumes it's permanent.** JSDoc on the constant: `// Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this. Search this symbol.`
14. **Loss of "from $29/mo" SERP price snippet.** Lowest emitted Offer is what Google uses. Starter at $29 stays the lowest emitted Offer pre- and post-change. **Zero net effect.**
15. **`description` field text drifts from visible card copy.** Lock alignment: Product `description` MUST mention "Custom pricing, contact sales" verbatim matching the visible Max card (which already shows "Custom" + "Contact Sales" CTA). See Cross-Domain Resolution §1 below.
16. **Comparison-table sticky-header layout breaks when "Custom" replaces "$199/mo".** Both render at `text-xs` in the same grid cell; CSS doesn't flex on character count. Visual diff via screenshot in PR review.
17. **Future Phase 5 re-add of Max forgotten.** Inline comment at the page call-site references PRICE-06 explicitly.

### Cross-cutting pitfalls

18. **No new design tokens introduced.** Phase 1 uses only existing tokens: `text-foreground`, `text-muted-foreground`, `bg-muted/50`, `text-xs`, `text-3xl`, `bg-card`, `border-border/50`, `rounded-2xl`. Verified at cited globals.css lines.
19. **CI gates all green.** lint + typecheck + `next build` + E2E smoke + RLS security; coverage ≥80% via lefthook pre-commit.

---

## Code Examples

### CRIT-01: Migration shape (planner extends this template)

```sql
-- supabase/migrations/<YYYYMMDDHHmmss>_unpublish_broken_blogs.sql
-- (timestamp reconciled to prod-assigned post-MCP via mcp__supabase__list_migrations)

-- =============================================================================
-- Pre-flight assertions
-- =============================================================================
do $$
declare
  v_match_count integer;
  v_total_published integer;
begin
  select count(*) into v_match_count
  from public.blogs
  where status = 'published'
    and (
      title = 'Error Processing Blog'
      or content like 'Error: Could not extract content. Response keys: %'
    );

  select count(*) into v_total_published
  from public.blogs
  where status = 'published';

  if v_match_count > 200 then
    raise exception 'CRIT-01 abort: WHERE matched % rows (expected <=200). Investigate before mutating.', v_match_count;
  end if;

  if v_total_published > 0 and (v_match_count::numeric / v_total_published) > 0.95 then
    raise exception 'CRIT-01 abort: bad-row ratio % of % (>95%%). Human review required.', v_match_count, v_total_published;
  end if;

  raise notice 'CRIT-01 pre-flight: % bad rows of % published rows', v_match_count, v_total_published;
end$$;

-- =============================================================================
-- Mutation
-- =============================================================================
update public.blogs
set status = 'draft',
    updated_at = now()
where status = 'published'
  and (
    title = 'Error Processing Blog'
    or content like 'Error: Could not extract content. Response keys: %'
  );

-- =============================================================================
-- Re-bleed guard (n8n is confirmed still active — Phase 6 BLOG-03 drops this)
-- =============================================================================
create or replace function public.reject_n8n_error_blogs()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.title = 'Error Processing Blog'
     or new.content like 'Error: Could not extract content. Response keys: %' then
    raise exception 'CRIT-01 re-bleed guard: refusing to insert n8n parser-failure row (title=%)', new.title
      using errcode = '23514';
  end if;
  return new;
end$fn$;

drop trigger if exists reject_n8n_error_blogs_trigger on public.blogs;
create trigger reject_n8n_error_blogs_trigger
before insert on public.blogs
for each row execute function public.reject_n8n_error_blogs();

comment on function public.reject_n8n_error_blogs() is
  'Phase 1 (CRIT-01) re-bleed guard. Drop in Phase 6 (BLOG-03) once redesigned n8n flow no longer produces parser-failure rows. Tracked as Phase-6 dependency in 01-RESEARCH.md.';

-- =============================================================================
-- Post-flight verification
-- =============================================================================
do $$
declare
  v_remaining integer;
begin
  select count(*) into v_remaining
  from public.blogs
  where status = 'published'
    and (
      title = 'Error Processing Blog'
      or content like 'Error: Could not extract content. Response keys: %'
    );

  if v_remaining <> 0 then
    raise exception 'CRIT-01 post-flight: % rows still match the bad signature after UPDATE', v_remaining;
  end if;

  raise notice 'CRIT-01 post-flight: zero bad rows remain published';
end$$;
```

### CRIT-03: Constant + call sites

`src/config/pricing.ts` (new export — module top-level near `PRICING_PLANS`):

```typescript
/**
 * Phase 1 (CRIT-03) public placeholder for Max-tier price.
 * Stripe products + prices are intentionally unchanged ($199/mo, $2189/yr).
 * Phase 5 (PRICE-*) deletes this constant + every call site.
 * Search the codebase for `MAX_PUBLIC_PRICE_DISPLAY` to locate them.
 */
export const MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const
```

`src/components/pricing/pricing-comparison-table.tsx` (line 205):

```tsx
// BEFORE
<div className="text-xs text-muted-foreground">$199/mo</div>

// AFTER
<div className="text-xs text-muted-foreground">{MAX_PUBLIC_PRICE_DISPLAY}</div>
```

`src/app/pricing/page.tsx` (lines 22-23 metadata + lines 32-40 JSON-LD):

```diff
@@ -20,7 +20,7 @@ export const metadata: Metadata = createPageMetadata({
   title: 'Property Management Software Pricing — Plans from $29/mo',
   description:
-    'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max ($199/mo, unlimited). 14-day free trial, no credit card required. Compare plans and features.',
+    'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), Max — Custom pricing, contact sales. 14-day free trial, no credit card required. Compare plans and features.',
   path: '/pricing'
 })

@@ -29,15 +29,17 @@ export default async function PricingPage() {
   const breadcrumbJsonLd = createBreadcrumbJsonLd('/pricing')
   const productJsonLd = createProductJsonLd({
     name: 'TenantFlow Property Management Software',
     description:
-      'Professional property management software with lease tracking, maintenance management, and financial reporting. Plans starting at $29/month.',
+      'Professional property management software for landlords with 1–15 rentals. Starter $29/mo (5 properties), Growth $79/mo (20 properties). Max enterprise tier — Custom pricing, contact sales. 14-day free trial, no credit card required.',
     offers: [
       { name: 'Starter', price: '29.00' },
-      { name: 'Growth', price: '79.00' },
-      { name: 'Max', price: '199.00' }
+      { name: 'Growth', price: '79.00' }
+      // Max omitted from JSON-LD: visible page shows "Custom"; per Google's
+      // Structured Data General Guidelines we must not emit a price the page
+      // doesn't show. Re-add when PRICE-06 (Phase 5) ships final Max pricing.
     ]
   })
```

### CRIT-01 rollback (Path 1 — primary-key list)

```sql
-- Reverses the Phase 1 flip using the IDs captured in
-- .planning/phases/01-*/01-CRIT-01-affected-ids.txt before applying.
update public.blogs
set status = 'published',
    updated_at = now()
where id in (
  '<id-1>', '<id-2>', '...'  -- from artifact
)
and status = 'draft';
```

---

## CRIT-01: Blog Bulk-Unpublish (Definitive Approach)

### Identification rule (final WHERE)

```sql
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  )
```

Rationale: two-of-three n8n failure-path signatures (title, content). Skip `slug LIKE 'error-%'` to avoid false positives on legit "errors-about" content. Verified by Specialist 1 against `audit-ui-2026-05-08.md:14`.

### State transition: `status='draft'` (option a, not archived/delete/archive-then-delete)

Why this wins:
- **Zero schema change.** `blogs.status` text+CHECK accepts `'draft'` already.
- **Read path already gates on it.** All four public surfaces (`blog-keys.ts:89,135,177,198`, `sitemap.ts:120`, `feed.xml/route.ts:70`, `blog_categories_rpc:18`) filter `.eq('status','published')`.
- **RLS aligns.** `blogs_select_published` is `USING (status = 'published')`.
- **Reversible.** Symmetric UPDATE.
- **Phase 6 BLOG-01 owns hard-delete.** Don't pre-empt.
- **Archive-then-delete pattern is wrong tool.** Pattern targets 10k+/day operational logs with retention SLAs. Blog is ~100 rows, one-shot.

See `01-RESEARCH-blog-data.md` § State Transition Recommendation for the full a/b/c/d trade-off matrix.

### Migration shape

**One-shot SQL via Supabase MCP `apply_migration`** with three blocks: pre-flight `do $$` assertions, `UPDATE` mutation, post-flight `do $$` verification. Plus the BEFORE-INSERT trigger (next sub-section). Filename pattern: `supabase/migrations/<YYYYMMDDHHmmss>_unpublish_broken_blogs.sql`. Reconcile timestamp with prod via `mcp__supabase__list_migrations` after applying.

Full template in § Code Examples above.

### Re-bleed guard (mandatory — n8n is still active)

**User confirmed mid-research that the n8n content-generation workflow is still actively pushing rows.** Re-bleed risk is real, not theoretical.

The same migration that flips bad rows MUST add a `BEFORE INSERT` trigger:

```sql
create or replace function public.reject_n8n_error_blogs() ...
before insert on public.blogs
for each row execute function public.reject_n8n_error_blogs();
```

The trigger raises `exception` (errcode `23514`) on rows whose `title='Error Processing Blog'` OR `content LIKE 'Error: Could not extract content. Response keys: %'`. **The function carries a `comment` declaring it a Phase-1 stop-bleed mechanism** scheduled for removal in Phase 6 (BLOG-03) once the redesigned n8n flow ships.

**Phase 6 dependency:** `BLOG-03` plan must include "drop function `public.reject_n8n_error_blogs()` and the `reject_n8n_error_blogs_trigger` trigger as part of the n8n redesign migration." Add to Phase 6 `01-PLAN.md` checklist when `/gsd-plan-phase 6` runs.

### Rollback playbook

Three-tier strategy:
1. **Path 1 — Targeted reverse UPDATE by primary key.** Uses the side artifact `.planning/phases/01-*/01-CRIT-01-affected-ids.txt` captured before applying.
2. **Path 2 — Reverse UPDATE by signature + time window.** If artifact lost; window guards against pre-existing drafts.
3. **Path 3 — `pg_dump` snapshot restore.** If rollback is needed weeks later.

Decision tree in `01-RESEARCH-blog-data.md` § Rollback Playbook. Capture the affected ID list before applying as belt-and-suspenders.

### SEO coordination

| Concern | Disposition | Why |
|---------|-------------|-----|
| HTTP status for old `error-NNN` URLs | **404 (existing `notFound()` path)** | Google docs: 4xx (except 429) treated identically. 410 plumbing adds complexity for zero benefit. |
| Sitemap update | **No code change** — `sitemap.ts:117-123` already filters `status='published'`. ISR regenerates within 24h. | Self-healing |
| RSS feed update | **No code change** — `feed.xml/route.ts:67-72` already filters. | Self-healing |
| Empty state | **No code change** — `BlogEmptyState` already wired at `blog-client.tsx:108-110`. Branded typewriter variant is on-brand. | Already correct |
| Soft-404 audit | **Confirmed real 404.** `notFound()` called from `generateMetadata` AND `Page` before render. No `loading.tsx` in route segment. | Verified by code inspection |
| Indexing API | **DO NOT use.** Google forbids non-`JobPosting`/`BroadcastEvent`. | Out of scope |
| GSC Removals tool | **DO NOT use.** Temporary 6-month relief, not deindex. | Out of scope |
| Hub `lastmod` cascade | **Beneficial side effect.** `blogHubLastModified` derives from most-recent published; flipping rows accelerates Google re-crawl of `/blog`. | Self-healing acceleration |
| Expected deindex timeline | **2–4 weeks.** Most error-pattern URLs out within 2 weeks. | Per Google docs + community convergence |

**Specialist 2 conclusion: ZERO frontend code changes required for the SEO domain.** All four read paths already gate on `status='published'`.

### Phase 6 forward-compat

| Concern | Phase 1 disposition | Phase 6 inheritance |
|---------|---------------------|---------------------|
| Slug collision | None — old slugs are `error-<unix_ms>`; Phase 6 uses semantic slugs | None |
| Drafts retain slugs (block Phase 6 reuse?) | Theoretically yes for any "good slug currently held by a broken row" | Phase 6 hard-deletes those rows rather than renaming (BLOG-01) |
| Featured-image storage cleanup | Out of scope | Phase 6 BLOG-01 owns |
| Re-publish risk (someone flips draft back) | Mitigated — no admin UI for blog status today | Phase 6 BLOG-05 introduces `draft → in-review → published` workflow |
| `reject_n8n_error_blogs` trigger | Lives | **Phase 6 BLOG-03 drops** |

---

## CRIT-03: Max Pricing Placeholder (Definitive Approach)

### 3-surface scope (correcting audit's "4 surfaces" claim)

The audit (and REQUIREMENTS.md CRIT-03 line) describes "4 surfaces": pricing card, comparison table, homepage features grid, JSON-LD. **It's actually 3 surfaces that drift on price**:

| # | Surface | File | Status |
|---|---------|------|--------|
| 1 | Pricing card | `src/components/pricing/pricing-card-standard.tsx:167-168` | **Already shipped "Custom"** — no change |
| 2 | Comparison-table sticky header | `src/components/pricing/pricing-comparison-table.tsx:205` | Currently `$199/mo` — needs change |
| 3 | Pricing-page metadata description + JSON-LD | `src/app/pricing/page.tsx:22-23, 32-40` | Currently includes Max $199 — needs change |
| ~4~ | Homepage features grid | `src/components/sections/features-section.tsx:23-25` | **NOT a price** — `'Max unlimited'` describes the property *limit*, not the price. **Leave alone.** |

See Open Questions Resolved §2 below for the explicit reconciliation.

### Stripe-vs-public divergence pattern (Pattern B-modified)

Pick: **single shared `MAX_PUBLIC_PRICE_DISPLAY = 'Custom'` constant** in `src/config/pricing.ts`, with conditional renders at the divergent surfaces. Existing precedent: `pricing-card-standard.tsx:167-168` already conditionally renders "Custom" on `variant === 'enterprise'`; `kibo-style-pricing.tsx:143-146` independently does `planId === 'max'`. We are propagating the established pattern, not inventing it.

Why not the alternatives:
- **(A) Inline magic strings** — Phase 5 cleanup hunts strings.
- **(C) Add `displayPrice` to `PricingConfig`** — bloats type for one transitional value; only Max needs it; double-write churn.
- **(D) Feature flag** — overkill for a placeholder string; no GrowthBook in codebase.
- **(E) Stripe `metadata.public_price_display`** — adds external surface Phase 5 must reconcile; Stripe-side metadata is wasted work.

Phase 5 cleanup: `grep -r MAX_PUBLIC_PRICE_DISPLAY src/` → delete the constant + 3 call sites.

### JSON-LD change (Specialist 3 Option C — omit Max from offers)

Schema.org `Offer.price` is required by Google's Product Snippet docs to be a numeric string. "Custom" is invalid. Three rejected alternatives (A: price-less Offer; B: Offer with `availability` only; D: `priceRange`; E: AggregateOffer with `lowPrice` only) all either fail validation or trigger Google's "spammy structured markup" policy.

**Pick: omit Max from `offers` array entirely; surface "Custom pricing, contact sales" verbatim in `Product.description` text.**

Industry precedent (Specialist 3 § Competitor Schema Survey): Notion, Slack, RentRedi, AppFolio, Stripe all do exactly this. Zero of the surveyed property-management competitors emit Product/Offer JSON-LD on their pricing page at all — TenantFlow keeping Starter+Growth as Offers is a competitive SEO advantage we should preserve.

`createProductJsonLd` factory in `src/lib/seo/product-schema.ts` accepts any-length `offers` array — **no factory refactor needed**. The change is purely at the call site (`src/app/pricing/page.tsx:32-40`).

### Comparison table change (single-line edit at line 205)

```tsx
// BEFORE  — pricing-comparison-table.tsx:205
<div className="text-xs text-muted-foreground">$199/mo</div>

// AFTER
<div className="text-xs text-muted-foreground">{MAX_PUBLIC_PRICE_DISPLAY}</div>
```

No layout impact (both render at `text-xs` in same grid cell). No CTA in the header (table doesn't have a CTA-cell architecture; symmetry with Starter/Growth maintained). No badge (asymmetry signal). No background change (Max stays `bg-muted/50` — symmetry with Starter, vs Growth's `bg-primary/5`).

### Test impact

- **Factory tests** (`src/lib/seo/__tests__/product-schema.test.ts:31-39, 91-107`) — **stay valid as-is**. `createProductJsonLd` already supports any-length `offers`. Existing 3-offer baseline test data continues to assert the factory's correctness for 3-offer input.
- **Page-level assertion needed** — new test asserting the production call site at `src/app/pricing/page.tsx` emits exactly 2 offers (Starter + Growth, no Max) with correct prices, AND that `Product.description` mentions "Custom pricing, contact sales".
- **Visual regression** — screenshot of comparison-table header in PR review.

### Existing-correct-already corrections

These were flagged in the audit but are NOT bugs:

1. **Annual toggle "Save $158" math.** The badge is **Growth-only**: $79 × 12 − $790 = $158. Correct (audit item #16 challenges it but the math holds). See Open Questions Resolved §3.
2. **Max card CTA label.** Already canonical "Contact Sales" (`pricing-card-standard.tsx:243` + `kibo-style-pricing.tsx:145`). Phase 10 TRUST-03 hunts "Talk to Sales" / "Connect with sales" / "Schedule a walkthrough" — those live elsewhere (`pricing-content.tsx:147, 180`) and are out of CRIT-03 scope.

---

## Cross-Domain Risk Matrix

Combined and prioritized from all four specialists. **P0 = ship-blocker; P1 = ship-with-mitigation; P2 = monitor.**

| Pri | Domain | Risk | Likelihood | Impact | Mitigation |
|-----|--------|------|------------|--------|------------|
| P0 | CRIT-01 | n8n re-bleeds new "Error Processing Blog" rows after the migration | **HIGH** (confirmed active) | MED | **Mandatory: BEFORE-INSERT trigger drops in same migration** (rejects bad-signature rows). Phase 6 BLOG-03 removes trigger. |
| P0 | CRIT-03 | Webspam manual action: JSON-LD `Offer.price=199` while page shows "Custom" violates SD General Guidelines | LOW–MED | HIGH | Ship Option C (omit Max from `offers`) BEFORE any further drift. Schema must agree day 1. |
| P1 | CRIT-01 | Migration filename ↔ prod-assigned timestamp drift | HIGH (per memory) | LOW | Run `mcp__supabase__list_migrations` after `apply_migration`; rename repo file to match. |
| P1 | CRIT-01 | WHERE clause too wide → flips a legit "errors-about" article | LOW | MED | Pre-flight queries (5)+(6) check disjunctive split; non-zero = human eyeball. |
| P1 | CRIT-01 | WHERE clause too narrow → tail bad rows still indexed | MED | LOW | Pre-flight query (4) shows title distribution; widen if needed. |
| P1 | CRIT-01 | Bad-row count outside `[60, 200]` | LOW | LOW | `do $$` block aborts via `raise exception` if `>200`. |
| P1 | CRIT-01 | Soft-404 (200 instead of 404) on broken slugs | LOW | HIGH | Verified by code inspection ✓; belt-and-suspenders post-merge: `curl -sI .../blog/error-1778151609106` → 404. |
| P1 | CRIT-03 | `description` text drifts from visible card copy | LOW | MED | **Locked**: `description` includes "Custom pricing, contact sales" verbatim matching visible Max card. See Cross-Domain Resolution §1. |
| P1 | CRIT-03 | Reviewer worries Stripe was changed | MED | LOW | PR body + plan reference `src/config/pricing.ts:152-159` showing untouched Stripe IDs. |
| P1 | CRIT-03 | Future Phase 5 forgets to re-add Max Offer | LOW | MED | Inline comment at call-site references PRICE-06 explicitly; PRICE-06 plan checklist includes "re-add Max Offer". |
| P2 | CRIT-01 | Sitemap CDN cache serves stale URLs | LOW (24h max) | LOW | ISR `revalidate=86400` self-heals. Acceptable for stop-bleed. |
| P2 | CRIT-01 | Concurrent UPDATE from n8n during migration | LOW | LOW | Trigger guards new inserts; UPDATE row-locks while running. Self-limiting at ~70 rows. |
| P2 | CRIT-01 | GSC Pages report doesn't decline within 14 days | LOW | MED | Investigate sitemap regen, 404 status, GSC reporting lag. Spot-check via URL Inspection on 2-3 URLs. |
| P2 | CRIT-01 | `featured_image` storage cleanup deferred | LOW | LOW | Phase 6 BLOG-01 owns. Phase 1 stays narrow. |
| P2 | CRIT-01 | Slug collision when Phase 6 republishes | NONE | — | Old `error-<unix_ms>` vs Phase 6 semantic slugs — namespaces don't overlap. |
| P2 | CRIT-03 | `product-schema.test.ts` factory test breaks | LOW | LOW | Factory accepts any-length array; 3-offer test data unchanged. New page-level test asserts call-site emits 2 offers. |
| P2 | CRIT-03 | Comparison-table header layout breaks at "Custom" vs "$199/mo" | VERY LOW | LOW | Both render at `text-xs`; CSS doesn't flex on character count. PR screenshot diff. |
| P2 | CRIT-03 | Future agent assumes `MAX_PUBLIC_PRICE_DISPLAY` is permanent | LOW | LOW | JSDoc on constant explicitly says Phase 5 deletes it. |
| P2 | CRIT-03 | Loss of "from $29/mo" SERP snippet | LOW | LOW | Starter at $29 stays the lowest emitted Offer. Zero net effect. |
| P2 | CRIT-03 | Removing Max from JSON-LD reduces SEO surface for "$199 property management" queries | LOW | LOW | Those queries currently match WRONG content — disowning is intentional. |

---

## Open Questions Resolved

These are the four cross-domain coordination items the specialists left open or got wrong. **Resolved here for the planner — do not re-open during `/gsd-plan-phase 1`.**

### 1. n8n re-bleed risk (Specialist 1 left as MED-confidence assumption A2)

**Resolved:** User confirmed mid-research that the n8n content-generation workflow is **still actively pushing rows**. Re-bleed is a real, not theoretical, risk.

**Action:** Same migration that does the bulk-unpublish MUST add a temporary BEFORE-INSERT trigger on `public.blogs` (`reject_n8n_error_blogs()` SECURITY DEFINER function + trigger). The trigger raises exception with errcode `23514` on any insert whose `title='Error Processing Blog'` OR `content LIKE 'Error: Could not extract content. Response keys: %'`.

**Phase 6 dependency:** Phase 6 BLOG-03 plan must include "drop the `reject_n8n_error_blogs_trigger` and `reject_n8n_error_blogs()` function as part of the redesigned n8n migration." This is added to the Phase-6 forward-compat note in this document and must be carried into Phase 6's `01-CONTEXT.md`/`01-PLAN.md` when `/gsd-plan-phase 6` runs.

### 2. Audit "4 surfaces" vs actual 3 surfaces (Specialist 4 caught)

**Resolved:** Audit item #3 (and REQUIREMENTS.md CRIT-03 line) describes 4 surfaces: pricing card, comparison table, homepage features grid, JSON-LD. **Actual count is 3 price-divergent surfaces.** The homepage features-section feature-card description says `'Max unlimited'` which is a **feature limit description, not a price** (`features-section.tsx:23-25`). It is consistent with `pricing-comparison-table.tsx:36` (`max: 'Unlimited'` for properties), which is also a feature limit, not a price.

**Action:** Phase 1 plan does NOT modify `features-section.tsx`. Document in plan as a deliberate scope reduction with reference to this resolution.

**Surfaces actually changed:** comparison-table sticky header (line 205), pricing-page metadata description (lines 22-23), pricing-page JSON-LD `productJsonLd.offers` (lines 32-40). Pricing card (`pricing-card-standard.tsx:167-168`) is **already correct** — no change.

### 3. Audit "Save $158 doesn't match a single-plan calc" (Specialist 4 verified math)

**Resolved:** Audit item #16 challenges the "Save $158" badge math. **Audit is wrong.** Math is correct: Growth $79 × 12 = $948, minus annual price $790 = **$158**. Verified against `src/config/pricing.ts:118-121`. The badge is **Growth-only**, not summing all plans, and the source code at `bento-pricing-section.tsx:47-49` proves it: `growthPlan.price.monthly * 12 - growthPlan.annualTotal`.

**Action:** Phase 1 does NOT touch the annual-toggle math, label, or copy. CONS-10 (Phase 7) owns any future revisit if reviewer challenges. Document in plan as audit-was-wrong correction.

### 4. Authenticated `/billing/plans` UI (Specialist 4 assumption A1)

**Resolved:** CRIT-03 scope is **public marketing surfaces only**. The authenticated billing dashboard at `src/app/(owner)/billing/plans/page.tsx` consumes `getAllPricingPlans()` directly and shows the **Stripe-truth $199** price for Max. This is correct: authenticated users are real subscribers (or trialing toward one) and need to know what they're being billed.

**Action:** Phase 1 does NOT touch authenticated UI. Plan must explicitly state: "Phase 1 leaves authenticated `/billing/plans` unchanged — public marketing surfaces only. Authenticated users see Stripe-truth pricing (correct behavior)."

This decision pairs with the Phase-1 narrative: public divergence between marketing copy and Stripe is intentional during the placeholder window. Phase 5 (PRICE-*) re-aligns both sides at restructure time.

---

## Cross-Domain Resolution: Visible card copy ↔ JSON-LD `description` alignment

**Locked:** Specialist 3 recommends the `Product.description` field include the verbatim phrase "Custom pricing, contact sales". Specialist 4 confirms the visible Max card already shows "Custom" + "Contact Sales" CTA. **They must match exactly day 1.**

Final `description` text emitted at `src/app/pricing/page.tsx`:

> "Professional property management software for landlords with 1–15 rentals. Starter $29/mo (5 properties), Growth $79/mo (20 properties). Max enterprise tier — Custom pricing, contact sales. 14-day free trial, no credit card required."

Phase 5 (PRICE-06) updates this string with final tier numbers + restored Max Offer.

---

## Verification Checklist

The planner SHOULD turn each of these into a concrete plan task. Combined and de-duplicated from all 4 specialists.

### Pre-flight (run BEFORE applying migration)

- [ ] Run Specialist-1 verification queries (1)–(6) via Supabase MCP `mcp__supabase__execute_sql`. Required outcomes:
  - Query (1) bad-row count in `[60, 200]`
  - Query (4) title distribution dominated by `'Error Processing Blog'`
  - Queries (5) and (6) **return zero rows** (no diverging signature pairs)
- [ ] Capture matched row IDs into `.planning/phases/01-*/01-CRIT-01-affected-ids.txt` (rollback Path 1 dependency)
- [ ] Optional belt-and-suspenders: `pg_dump --table=public.blogs --data-only --column-inserts` to `/tmp/blogs_pre_crit01.sql`

### CRIT-01 implementation

- [ ] Migration file added: `supabase/migrations/<TS>_unpublish_broken_blogs.sql` with pre-flight `do $$`, mutation, BEFORE-INSERT trigger function + trigger, post-flight `do $$`
- [ ] `comment on function public.reject_n8n_error_blogs()` documents Phase 6 BLOG-03 removal
- [ ] Apply via Supabase MCP `mcp__supabase__apply_migration`
- [ ] Run `mcp__supabase__list_migrations`; rename repo file to match prod-assigned timestamp; commit rename in same PR

### CRIT-01 post-flight (run AFTER applying)

- [ ] (A) `SELECT count(*) FROM blogs WHERE status='published' AND <bad sig>` returns 0
- [ ] (B) Flipped-to-draft count matches pre-flight query (1)
- [ ] (C) `SELECT count(*) FROM blogs WHERE status='published'` = pre-flight (2) − (1)
- [ ] (D) `curl -sI https://tenantflow.app/blog/error-1778151609106 | head -1` → `HTTP/2 404`
- [ ] (E) `curl https://tenantflow.app/sitemap.xml | grep error- | wc -l` → `0`
- [ ] (F) `curl https://tenantflow.app/feed.xml | grep error- | wc -l` → `0`
- [ ] (G) Visit `/blog` and visually confirm `BlogEmptyState` typewriter renders if zero good rows remain (or confirm reduced post count)
- [ ] (H) Verify `reject_n8n_error_blogs_trigger` exists: `select tgname from pg_trigger where tgrelid='public.blogs'::regclass`
- [ ] (I) Test trigger: insert a row with `title='Error Processing Blog'` → expect errcode `23514`

### CRIT-03 implementation

- [ ] `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` exported from `src/config/pricing.ts` with JSDoc referencing Phase 5 (PRICE-*) deletion
- [ ] `pricing-comparison-table.tsx:205` swapped to `{MAX_PUBLIC_PRICE_DISPLAY}` (import added)
- [ ] `src/app/pricing/page.tsx:22-23` metadata description updated to "Max — Custom pricing, contact sales"
- [ ] `src/app/pricing/page.tsx:32-40` `productJsonLd.offers` reduced to `[{Starter}, {Growth}]`; Max omitted with inline comment referencing PRICE-06
- [ ] `productJsonLd.description` mentions "Custom pricing, contact sales" verbatim matching visible Max card
- [ ] Existing factory test (`product-schema.test.ts`) untouched (factory accepts any-length array)
- [ ] New page-level test asserts the call site emits exactly 2 offers (Starter + Growth) with correct prices AND that description includes "Custom pricing, contact sales"

### CRIT-03 post-flight

- [ ] Manual paste of recommended JSON-LD into [Google Rich Results Test](https://search.google.com/test/rich-results); screenshot the verdict (VALID for Product Snippet expected)
- [ ] Visual diff screenshot of comparison-table sticky header showing "Custom" replacing "$199/mo"
- [ ] Verify pricing card still shows "Custom" + "Contact Sales" CTA at `pricing-card-standard.tsx:167-168, 243` (regression check — no behavior change expected)
- [ ] Verify authenticated `/billing/plans` UI still shows Stripe-truth $199 (regression check — no change expected)

### Cross-cutting

- [ ] No new hex/rgb/`bg-white`/inline-ms tokens introduced (cross-cutting design-token check from REQUIREMENTS.md cross-cutting constraint)
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` green
- [ ] `pnpm test:integration` (RLS) green — blogs RLS unchanged but verify no regression on the SELECT policy
- [ ] Perfect-PR merge gate: two consecutive zero-finding review cycles
- [ ] PR body explicitly states: "Stripe products + prices unchanged. Phase 5 (PRICE-*) restructures Stripe."

### Optional manual validation (post-merge, time-permitting)

- [ ] GSC Sitemaps page → "Resubmit" `/sitemap.xml` to nudge Google re-fetch
- [ ] GSC Pages report check at +7 days: error-pattern URL count declining
- [ ] GSC URL Inspection spot-check on 2-3 worst URLs at +7 days

---

## Confidence Levels

| Recommendation | Confidence | Notes |
|----------------|------------|-------|
| **CRIT-01 identification WHERE: `(title=... OR content LIKE ...)`** | HIGH | Audit confirmed both signatures verbatim; pre-flight queries cross-check |
| **CRIT-01 state transition: `status='draft'`** | HIGH | All 4 read surfaces gate on `status='published'` (verified at 4 file:line refs); RLS aligns; soft-delete idiom matches `properties` |
| **CRIT-01 skip archive-then-delete** | HIGH | Pattern is for retention SLA + recurring cleanup; this is one-shot user-content correction |
| **CRIT-01 one-shot SQL migration via MCP** | HIGH | Matches existing TenantFlow migration discipline |
| **CRIT-01 BEFORE-INSERT trigger as re-bleed guard** | HIGH | User confirmed n8n still active; trigger is the minimal-surface-area block |
| **CRIT-01 rollback playbook (3-tier)** | HIGH | Symmetric reversibility via `status` flip + ID-list defense + `pg_dump` last-resort |
| **CRIT-01 SEO: 404 over 410, no Indexing API, no GSC Removals** | HIGH | Google official docs cited |
| **CRIT-01 sitemap/feed/empty-state: zero code change** | HIGH | All read paths verified by line-by-line inspection |
| **CRIT-01 deindex timeline 2–4 weeks** | MED | Google doesn't publish exact numbers; community convergence + crawl-frequency dependent |
| **CRIT-03 JSON-LD Option C (omit Max from offers)** | HIGH | 4 of 4 surveyable Custom-tier competitors do this; matches Google SD General Guidelines |
| **CRIT-03 stay on `Product` (not `SoftwareApplication`) for `/pricing`** | HIGH | `SoftwareApplication` requires `aggregateRating` OR `review`; we have neither |
| **CRIT-03 single-constant pattern (B-modified)** | HIGH | Codebase precedent at `pricing-card-standard.tsx:167` |
| **CRIT-03 comparison-table single-line edit at :205** | HIGH | Direct read of file confirms |
| **CRIT-03 homepage features-section unchanged** | HIGH | Direct read confirms no `$199` string; "Max unlimited" is a feature limit |
| **CRIT-03 annual toggle math correct as-is** | HIGH | $79 × 12 − $790 = $158 verified |
| **CRIT-03 use existing "Contact Sales" CTA** | HIGH | PROJECT.md line 148 + verified at `pricing-card-standard.tsx:243` |
| **CRIT-03 design-token mapping** | HIGH | Every token verified at cited globals.css line |
| **CRIT-03 Google Rich Results Test "VALID" verdict** | **MEDIUM** | Specialist 3 could not run live test (sandbox restriction). **Recommend post-deploy manual paste into [Rich Results Test](https://search.google.com/test/rich-results); screenshot into PR.** |
| **CRIT-03 authenticated `/billing/plans` out of scope** | HIGH | Public marketing surface scope is explicit; Stripe-truth is correct for authenticated subscribers |

**Overall Phase 1 confidence: HIGH.** Single MEDIUM (Rich Results Test prediction) is mitigated by post-deploy manual verification step in the checklist.

---

## Sources (consolidated from specialist appendices)

### Codebase (HIGH — verified by direct read)
- `src/hooks/api/query-keys/blog-keys.ts` — read-path filters (89, 135, 177, 198)
- `src/app/sitemap.ts` — sitemap query + filter (117-123, 149-154, 157-177)
- `src/app/feed.xml/route.ts` — RSS query + filter (67-72)
- `src/app/blog/blog-client.tsx` — `BlogEmptyState` wiring (108-110)
- `src/app/blog/[slug]/page.tsx` — `notFound()` calls (61, 104)
- `src/components/shared/blog-empty-state.tsx` — branded typewriter empty state
- `src/components/pricing/pricing-card-standard.tsx` — Max "Custom" precedent (63-66, 167-168, 243)
- `src/components/pricing/pricing-comparison-table.tsx` — sticky header (191-207); `$199/mo` literal (205)
- `src/components/pricing/bento-pricing-section.tsx` — annual-savings math (47-49); toggle (75-111)
- `src/components/pricing/kibo-style-pricing.tsx` — second `planId === 'max'` divergence (143-146)
- `src/components/sections/features-section.tsx` — "Max unlimited" feature description (23-25)
- `src/config/pricing.ts` — `PRICING_PLANS.TENANTFLOW_MAX` + Stripe IDs (147-180); `PricingConfig` interface (17-40)
- `src/app/pricing/page.tsx` — metadata description (22-23); JSON-LD call site (32-40)
- `src/app/pricing/pricing-content.tsx` — non-canonical CTAs (147, 180) — Phase 10 territory, not Phase 1
- `src/app/(owner)/billing/plans/page.tsx` — authenticated billing UI (18, 43) — out of Phase 1 scope
- `src/lib/seo/product-schema.ts` — `createProductJsonLd` factory (29-88)
- `src/lib/seo/__tests__/product-schema.test.ts` — factory tests (31-39, 91-107)
- `src/app/globals.css` — token definitions (lines 55, 68, 132, 133, 134, 137, 139, 143, 147, 220)
- `supabase/migrations/20251209120000_create_blogs_table.sql` — schema + CHECK + `update_blogs_updated_at` trigger (11-12, 40-43)
- `supabase/migrations/20251210161000_add_status_enums.sql` — confirms blogs deliberately left as text+CHECK (48, 64, 76)
- `supabase/migrations/20251219210000_add_blogs_rls_policies.sql` — public RLS gates `status='published'` (14-20)
- `supabase/migrations/20251220030000_fix_rls_policy_gaps.sql` — DELETE policy service-role only
- `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` — canonical archive-then-delete pattern (rejected as wrong fit for Phase 1)
- `supabase/migrations/20260307120000_blog_categories_rpc.sql` — RPC gates `status='published'` (18)
- `audit-ui-2026-05-08.md:14` — bad-row signatures
- `.planning/REQUIREMENTS.md:29, 31` — CRIT-01, CRIT-03; line 51 BLOG-01 boundary
- `.planning/PROJECT.md:148, 152` — canonical "Contact Sales"; Phase 1 placeholder strategy
- `.planning/ROADMAP.md` Phase 1 success criteria

### Project memory (HIGH)
- `migration-mcp-prod-drift.md` — reconcile repo migrations with prod after every `apply_migration` MCP call
- CLAUDE.md L182 — soft-delete idiom (`status='inactive'` for properties; soft-flip pattern reused for blogs)

### Web (HIGH for Google official docs)
- [Google Search Central — HTTP status codes & network errors](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) — 4xx (except 429) treated identically
- [Google Search Central — Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — `lastmod` is the freshness signal
- [Google Search Central — Indexing API quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart) — explicit JobPosting/BroadcastEvent restriction
- [Google Search Console — Removals tool](https://support.google.com/webmasters/answer/9689846) — 6mo temporary
- [Google Search Central — Product](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google Search Central — Product Snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) — "if you include `offers`, you must provide a price value"
- [Google Search Central — Software App](https://developers.google.com/search/docs/appearance/structured-data/software-app) — requires `aggregateRating` OR `review`
- [Google Search Central — Structured Data General Guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) — "Don't mark up content that is not visible to readers of the page"
- [Schema.org — Product / Offer / AggregateOffer](https://schema.org/Product)
- [Yoast — AggregateOffer schema piece](https://developer.yoast.com/features/schema/pieces/aggregateoffer/) — `highPrice` required

### Competitor pricing (HIGH — observed 2026-05-08)
- Buildium, AppFolio, DoorLoop, Hemlane, RentRedi (industry default: Custom-tier-with-omitted-Offer pattern), Notion, Slack, Stripe (same pattern)

### Tools referenced (not run live)
- [Google Rich Results Test](https://search.google.com/test/rich-results) — manual post-deploy paste recommended

---

## Appendices

Full specialist research files retained for deeper context. Reference by name when this canonical document doesn't have the depth needed.

| Appendix | File | When to read |
|----------|------|--------------|
| Specialist 1 | `01-RESEARCH-blog-data.md` | Full pre-flight queries, 4-option state-transition trade-off, 3-tier rollback decision tree, full risk + assumptions log |
| Specialist 2 | `01-RESEARCH-blog-seo.md` | Full HTTP-status alternatives matrix, sitemap cache-invalidation accelerators considered, soft-404 streaming analysis, hub `lastmod` cascade |
| Specialist 3 | `01-RESEARCH-pricing-schema.md` | Full A/B/C/D/E JSON-LD options matrix, 7-site competitor schema survey table, Product-vs-SoftwareApplication trade-off, full diff template |
| Specialist 4 | `01-RESEARCH-pricing-ui.md` | Full A/B/C/D/E divergence-pattern selection, design-token mapping with globals.css line cites, R1–R9 UI risk matrix, annual-toggle math derivation |

---

## Metadata

**Synthesizer:** GSD Phase-1 research synthesizer
**Synthesis date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days — Phase 1 ships within this window or research re-verified)
**Downstream consumer:** `/gsd-plan-phase 1`
**Phase 6 dependency carry-forward:** drop `reject_n8n_error_blogs_trigger` + `reject_n8n_error_blogs()` function in BLOG-03 migration
**Phase 5 dependency carry-forward:** delete `MAX_PUBLIC_PRICE_DISPLAY` constant + 3 call sites; re-add Max Offer to `productJsonLd.offers` with PRICE-06 final number
