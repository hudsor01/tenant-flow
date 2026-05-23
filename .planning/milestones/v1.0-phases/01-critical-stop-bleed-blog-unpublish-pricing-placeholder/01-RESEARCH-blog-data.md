# Phase 1 — CRIT-01 Research: Blog Data Cleanup + DB Safety

**Researched:** 2026-05-08
**Domain:** PostgreSQL data mutation, Supabase RLS, archive-then-delete pattern
**Confidence:** HIGH

## Summary

CRIT-01 is a one-shot data fix: bulk-flip the ~70 broken `blogs` rows out of `status='published'` so `/blog`, `/sitemap.xml`, `/feed.xml`, and the category RPC stop surfacing them. The read path already filters `.eq('status', 'published')` everywhere ([blog-keys.ts:89,135,177,198](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts), [sitemap.ts:120](file:///Users/richard/Developer/tenant-flow/src/app/sitemap.ts), [feed.xml/route.ts:70](file:///Users/richard/Developer/tenant-flow/src/app/feed.xml/route.ts), [blog_categories_rpc:18](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql)), so a single `UPDATE` invalidates all four surfaces with no code change.

The full content rebuild + n8n redesign is BLOG-01..06 in Phase 6. Phase 1 is **stop-bleed only**: do the smallest, most reversible mutation that removes the bad rows from the public surface. Hard-delete is out of scope here — Phase 6 (`BLOG-01`) is the categorize-and-delete phase per [REQUIREMENTS.md](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md) line 51.

**Primary recommendation:** Use `UPDATE blogs SET status='draft'` via a one-shot SQL migration applied through Supabase MCP `apply_migration`. Pre-flight verification + post-flight rollback both run as plain `UPDATE` statements. No archive table, no DELETE.

## Identification Rule

### Sources of truth

The audit ([audit-ui-2026-05-08.md:14](file:///Users/richard/Developer/tenant-flow/audit-ui-2026-05-08.md)) gives three independent signatures for bad rows:

1. **`title = 'Error Processing Blog'`** — exact string, no variation observed
2. **`content` starts with `'Error: Could not extract content. Response keys: error'`**
3. **`slug` matches `error-<unix_ms_timestamp>`** — example URL `/blog/error-1778151609106` confirms n8n's millisecond-Date.now() slug generator on the failure path

### Recommended `WHERE` clause (defense in depth — match on TWO of three signatures)

```sql
-- Authoritative match: title is the most stable signal because it is the
-- string n8n hardcodes on the failure path. Content is a second fence-post
-- in case content was sometimes salvaged but title is sometimes not.
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  )
```

**Why both clauses (`OR` not `AND`):**
- Some rows may have a parser-reconstructed title but a placeholder content body, or vice versa. The `OR` catches both halves.
- Adding the `slug LIKE 'error-%'` clause as a third disjunct is redundant when title or content already matches and risks false positives if a future legitimate post coincidentally starts with `error-` (e.g. an article *about* errors). Skip.
- `status = 'published'` gate is mandatory — there's no point flipping rows that are already `draft` or `archived`, and it bounds the blast radius to rows that are actually live.

### Pre-flight verification SQL (planner MUST run this before mutation)

Run via Supabase MCP `mcp__supabase__execute_sql` against project `bshjmbshupiibfiewpxb`:

```sql
-- (1) Total bad-row count
SELECT count(*) AS bad_rows
FROM public.blogs
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  );

-- (2) Total currently-published row count (to compute the "good rows kept" delta)
SELECT count(*) AS total_published FROM public.blogs WHERE status = 'published';

-- (3) Sample of matched rows for human eyeball
SELECT id, slug, title, LEFT(content, 120) AS content_head, published_at
FROM public.blogs
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  )
ORDER BY published_at DESC
LIMIT 20;

-- (4) Title-distribution sanity check: should show "Error Processing Blog" with
--     a count near (1)'s total, and any other titles the WHERE caught.
SELECT title, count(*) AS row_count
FROM public.blogs
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  )
GROUP BY title
ORDER BY row_count DESC;

-- (5) Inverse check: do ANY published rows have title 'Error Processing Blog'
--     but a *salvageable* content body (i.e. NOT starting with the error string)?
--     Expectation: zero. If non-zero, those rows need human review before the
--     bulk flip — they may be legit articles about errors with a misformatted title.
SELECT id, slug, title, LEFT(content, 200) AS content_head
FROM public.blogs
WHERE status = 'published'
  AND title = 'Error Processing Blog'
  AND content NOT LIKE 'Error: Could not extract content. Response keys: %'
LIMIT 20;

-- (6) Inverse check (other direction): any published rows whose content matches
--     the error string but whose title was somehow recovered? Same expectation.
SELECT id, slug, title, LEFT(content, 200) AS content_head
FROM public.blogs
WHERE status = 'published'
  AND content LIKE 'Error: Could not extract content. Response keys: %'
  AND title <> 'Error Processing Blog'
LIMIT 20;
```

Audit cross-check ([audit:14](file:///Users/richard/Developer/tenant-flow/audit-ui-2026-05-08.md)): "the ~70+ blog posts (12 pages of pagination)" — pagination is `limit=9`, so 12 pages = 99–108 rows shown, matching the "~70+" estimate when accounting for the comparison-tag scroll row above. **Expect query (1) to return a count in the range `[60, 110]`**. If it's <50 or >150, stop and reconcile.

[VERIFIED: codebase grep] `published_at` is the canonical sort key on every read path.
[VERIFIED: codebase grep] `status = 'published'` is the canonical visibility gate on every read path.
[ASSUMED] Bad-row count is ~70. Confirm via query (1) before mutation. Researcher could not query prod directly — Supabase MCP tools were not loaded into this session.

## State Transition Recommendation

**RECOMMENDATION: (a) `UPDATE blogs SET status='draft'` — soft hide via existing visibility gate.**

### Why (a) wins

1. **Zero schema change.** `blogs.status` is `text` with CHECK constraint `('draft', 'published', 'archived')` from [create migration:11–12](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql). All three states already accepted. The "active n8n workflow" callout in [add_status_enums:48,64,76,170,184,213](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251210161000_add_status_enums.sql) means `blogs` was deliberately left as a `text`-with-CHECK column when every other table got an enum — Phase 1 must not change that.
2. **Read path already gates on it.** All four public surfaces filter `.eq('status', 'published')` ([blog-keys.ts:89,135,177,198](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts), [sitemap.ts:120](file:///Users/richard/Developer/tenant-flow/src/app/sitemap.ts), [feed.xml/route.ts:70](file:///Users/richard/Developer/tenant-flow/src/app/feed.xml/route.ts), [get_blog_categories rpc:18](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql)). Flipping to `'draft'` removes them everywhere with no code change.
3. **RLS aligns.** The SELECT policy `blogs_select_published` ([add_blogs_rls_policies.sql:14–20](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql)) is `USING (status = 'published')`. Anonymous and authenticated users lose visibility the moment `status` flips. No service-role exposure.
4. **Reversible.** Rollback is symmetric: `UPDATE blogs SET status='published' WHERE id IN (...)`. No data restored from archive table; the data never moved.
5. **Matches existing soft-delete idiom.** Properties soft-delete via `status='inactive'` ([CLAUDE.md L182](file:///Users/richard/Developer/tenant-flow/CLAUDE.md)). Using `status='draft'` for blogs follows the same in-place visibility-flip convention.
6. **Phase 6 (BLOG-01) handles permanent deletion.** [REQUIREMENTS.md:51](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md) explicitly assigns "Hard-delete rows that fail the 'salvageable' test" to BLOG-01. Phase 1 doing it would step on Phase 6's scope.

### Why (b) `archived` loses

- No CHECK update needed — both `draft` and `archived` are accepted today, so this point is neutral.
- BUT `archived` carries semantic weight ("end-of-life, intentionally retired") that doesn't fit. These rows are broken garbage, not intentionally retired posts.
- Using `archived` would also collide with future legitimate use of the state for retiring genuinely good posts later. Don't burn the value on bad data.
- **Verdict:** Neutral on schema, semantically wrong. Pick (a).

### Why (c) hard `DELETE` loses

- Irreversible. If query (1)/(5)/(6) miss an edge case, the data is gone.
- Out of scope per [REQUIREMENTS.md:51](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md) — Phase 6 (BLOG-01) owns the categorize-and-delete decision.
- A future Phase 6 audit may discover that *some* of these rows have a legitimate `featured_image`, `category`, or `tags` worth preserving as metadata while regenerating new content. Hard-deleting now removes that option.
- **Verdict:** Premature. Pick (a).

### Why (d) archive-then-delete loses (here, specifically)

The archive-then-delete pattern from [20260306170000_cleanup_cron_scheduling.sql:1–73](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) (creates `security_events_archive`, `user_errors_archive`, `stripe_webhook_events_archive`) exists for **operational data with a retention SLA** — high-volume tables (security events, error logs, webhook events) where:

1. Volume is large and growing (10k+ rows/day).
2. Retention is policy-driven (90d / 180d) rather than one-shot.
3. Compliance/forensic value justifies a separate cold-storage table.
4. A cron job runs the cleanup repeatedly.

`blogs` matches **none** of these:

1. Volume is ~100 total rows. Archiving 70 of them to a `blogs_archive` table is theatrical.
2. There is no retention policy — the rows are wrong-once, not aging out.
3. Bad-rows have no compliance/forensic value — they are n8n parser failures, not auditable events.
4. This is one-shot, not recurring.

Building `blogs_archive` here would establish a pattern (one-shot archive table for one-shot data fix) that future migrations might cargo-cult. **Soft-flip via existing `status` column is the equivalent of "archive in place" — the row is preserved, just hidden.**

[VERIFIED: codebase grep] No `blogs_archive` table or pattern exists today. Phase 1 should not introduce one.

### Slug-collision risk if Phase 6 rebuilds

Phase 6 BLOG-02 mentions clean URL patterns (drop millisecond-timestamp slugs, [REQUIREMENTS.md:52](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md), [SEO-04](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md#L104)). The bad rows hold slugs like `error-1778151609106`. New posts will use semantic slugs (e.g. `landlord-tax-deductions-2026`). **Collision risk: zero** — the namespaces don't overlap. So leaving the bad rows as drafts (occupying their old `error-*` slugs) does not block Phase 6 from rebuilding with clean slugs.

### What flipping to draft does (and doesn't) trigger

| Surface | Effect of `status='draft'` flip |
|---------|--------------------------------|
| `/blog` index ([blog-keys.ts:89](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts)) | Bad rows disappear on next query (TanStack `staleTime` = `QUERY_CACHE_TIMES.BLOG`). Empty state renders via existing `BlogEmptyState` ([blog-client.tsx:108–110](file:///Users/richard/Developer/tenant-flow/src/app/blog/blog-client.tsx)). |
| `/blog/[slug]` ([blog-keys.ts:135](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts)) | Returns `null` on PGRST116 → 404 page. Stops error pages from being indexable. |
| `/blog/category/[category]` ([blog-keys.ts:177](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts)) | Categories with all-bad rows become empty. `get_blog_categories()` RPC ([20260307120000_blog_categories_rpc.sql:18](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql)) gates on `status='published'`, so empty categories drop out of the navigation pills. |
| `/sitemap.xml` ([sitemap.ts:120](file:///Users/richard/Developer/tenant-flow/src/app/sitemap.ts)) | Bad rows drop out on next regeneration. Next.js `sitemap.ts` regenerates per-request unless cached at edge. Google re-crawl picks up the smaller sitemap on its normal interval. |
| `/feed.xml` ([feed.xml/route.ts:70](file:///Users/richard/Developer/tenant-flow/src/app/feed.xml/route.ts)) | Same — bad items drop out on next request. |
| `robots.ts` | No effect — robots is per-bot allowlist by path, doesn't enumerate posts. |
| Article JSON-LD on each `/blog/[slug]` page | The page itself stops rendering (404), so the schema disappears with it. |

**No code change required.** `BlogEmptyState` already exists ([components/shared/blog-empty-state.tsx](file:///Users/richard/Developer/tenant-flow/src/components/shared/blog-empty-state.tsx)) and the index already renders it on `blogData.data.length === 0` ([blog-client.tsx:108–110](file:///Users/richard/Developer/tenant-flow/src/app/blog/blog-client.tsx)). The audit ask "/blog index renders an honest 'Coming soon' / 'No posts yet' empty state" ([REQUIREMENTS.md:29](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md)) is satisfied automatically.

[VERIFIED: codebase grep] All four read surfaces filter on `status = 'published'`.
[VERIFIED: codebase grep] `BlogEmptyState` is wired into `blog-client.tsx`.
[CITED: [add_blogs_rls_policies.sql:14–20](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql)] Public SELECT policy gates on `status = 'published'`.

## Existing Archive Pattern

The TenantFlow archive-then-delete pattern lives in **[20260306170000_cleanup_cron_scheduling.sql](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql)** (DB-06/07/09).

| Element | File:line | Note |
|---------|-----------|------|
| `security_events_archive` | [L17–34](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | `LIKE public.security_events INCLUDING ALL` — schema mirror |
| `user_errors_archive` | [L37–53](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | Same pattern |
| `stripe_webhook_events_archive` | [L56–72](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | Same pattern |
| Service-role-only RLS, one policy per operation | [L21–32, 41–50, 60–69](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | `select`, `insert`, `delete` — never `FOR ALL` |
| Batch-archive CTE pattern | [L96–119](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | `LIMIT 10000`, `FOR UPDATE SKIP LOCKED`, `ON CONFLICT DO NOTHING`, delete-only-archived guard `id IN (SELECT id FROM archive)` |
| Cron schedule (3 AM UTC, staggered 15 min) | [L291–306](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | Daily, named SECURITY DEFINER functions |
| `check_cron_health()` monitoring | [L316–353](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) | Logs failures to `user_errors`, fires `pg_notify` |

**Verdict for Phase 1:** This pattern is the right tool for **operational data with retention SLA + recurring cleanup**. Phase 1 is one-shot data correction with full reversibility from a single column. Don't apply this pattern here. **Skip.**

If Phase 6 BLOG-01 decides to hard-delete, it can either (a) use the archive pattern then (recommended for hard-delete) or (b) just rely on the prior `status='draft'` flip from Phase 1 plus a snapshot taken via `pg_dump` of the `blogs` table at flip time (kept in `.planning/phases/06-*` for forensic reference).

## Migration vs Runtime

**RECOMMENDATION: (a) one-shot SQL migration applied via Supabase MCP `apply_migration`.**

### Why (a)

1. **Reproducible + reviewable.** Migration file lands in repo, ships in PR, gets caught by review, lives in git history.
2. **Idempotent under re-application.** Wrapped in `WHERE` clause checking the bad-row signature — re-running it after rows are already `draft` matches zero rows and is a no-op.
3. **Audit trail.** Migration filename, commit SHA, PR link all become permanent record. The audit document ([audit-ui-2026-05-08.md:14](file:///Users/richard/Developer/tenant-flow/audit-ui-2026-05-08.md)) becomes traceable to a specific timestamp + diff.
4. **CI gates.** `pnpm db:types` regen check, lefthook pre-commit, branch protection on `main` — all apply.
5. **Drift hazard understood.** [CLAUDE.md memory `migration-mcp-prod-drift.md`] — MCP `apply_migration` assigns prod-side timestamps that may not match the repo filename. **Reconcile via `mcp__supabase__list_migrations` after applying** and update the repo filename to match the prod-assigned timestamp before merging the PR.

### Why other options lose

| Option | Why not |
|--------|---------|
| (b) Edge Function | Massive overkill. Adds infra (function deploy, secrets, rate-limit wrapper, error handler) for a single `UPDATE` statement. Edge Functions are for runtime user-facing logic, not one-shot ops. |
| (c) Manual Supabase SQL editor | Fast. Zero audit trail in repo. Anyone reading the codebase six months from now has no record of *why* 70 rows transitioned states or when. Fails the "every public claim maps to working code" axis from [PROJECT.md L9](file:///Users/richard/Developer/tenant-flow/.planning/PROJECT.md). |
| (d) `supabase/seed/` script | This is for repeatable dev-seeding, not prod data fixes. Misuses the directory's intent. |

### Migration shape

Filename pattern: `supabase/migrations/<YYYYMMDDHHmmss>_unpublish_broken_blogs.sql`
(use a placeholder timestamp pre-merge; reconcile to prod-assigned via `mcp__supabase__list_migrations` post-MCP-apply per [migration-mcp-prod-drift.md memory]).

```sql
-- Migration: Unpublish broken blog rows surfaced by 2026-05-08 UI audit (CRIT-01)
-- Purpose: Flip status='published' -> status='draft' on the ~70 rows whose title
--   or content matches the n8n parser-failure signature. Read path filters on
--   status='published' across blog index, slug page, sitemap, feed, and
--   get_blog_categories RPC, so this single UPDATE removes the bad rows from
--   every public surface with zero code change.
-- Affected: public.blogs (rows where status='published' AND title='Error Processing Blog'
--   OR content matches the parser-error prefix)
-- Requirements: CRIT-01
-- Reversibility: see rollback playbook in 01-RESEARCH-blog-data.md (this phase)
-- Idempotent: WHERE clause includes status='published'; re-running matches zero rows.

-- =============================================================================
-- Pre-flight assertions (fail-loud if the row count is unexpectedly large)
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

  -- Hard upper bound: if more than 200 rows match, something is wrong.
  -- The audit observed ~70 bad rows. >200 = the WHERE clause is broader than expected.
  if v_match_count > 200 then
    raise exception 'CRIT-01 abort: WHERE matched % rows (expected <=200). Investigate before mutating.', v_match_count;
  end if;

  -- Sanity: bad rows shouldn't exceed 95% of total — if they do, the n8n flow
  -- broke catastrophically and we want a human review before flipping.
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
-- Post-flight log row (for forensic trail without an audit table)
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

**Why the `do $$ ... $$` blocks:**
- `raise exception` aborts the migration if pre-flight bounds are violated, leaving the table untouched.
- `raise notice` logs a count to the migration output for human eyeball + audit trail.
- Both blocks are no-ops on re-run because the `WHERE` clause excludes already-flipped rows. Idempotent.

**`updated_at = now()` is included** because the `update_blogs_updated_at` trigger ([create migration:40–43](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql)) fires only on UPDATE statements that don't already set `updated_at`. Setting it explicitly makes intent visible — these rows actually got touched by the migration, not by some other mutation.

[VERIFIED: codebase grep] `update_blogs_updated_at` trigger fires `BEFORE UPDATE ... EXECUTE FUNCTION update_updated_at_column()`, which sets `NEW.updated_at = NOW()`. Setting it explicitly in the migration is a no-op functionally but a clear signal in row history.

### MCP drift reconciliation (per [migration-mcp-prod-drift.md memory])

After `mcp__supabase__apply_migration` runs:

1. Call `mcp__supabase__list_migrations` and capture the prod-assigned timestamp.
2. If repo filename's timestamp differs, **rename the repo file to match prod's assigned timestamp** before pushing the branch. Otherwise repo and prod migrations diverge and future `db:types` runs may behave inconsistently.
3. Commit the rename in the same PR as the migration content.

## Rollback Playbook

### Pre-flight verification (run BEFORE applying the migration)

The 6 SQL queries in [Identification Rule § Pre-flight verification SQL](#identification-rule) above. Required outcomes:

- Query (1) returns count in `[60, 200]`. <50 or >200 → stop and reconcile.
- Query (4) is dominated by `'Error Processing Blog'` (>90% of rows).
- Queries (5) and (6) return **zero rows**. Non-zero on either = a row matched only one of the two signatures, which is unexpected. Human eyeballs the rows; either widen the rollback playbook or narrow the WHERE before applying.

### Snapshot the affected row IDs into a side artifact (defense in depth)

Capture the matched row IDs into a tracked artifact so the rollback statement can target them by primary key even if the title/content signatures somehow shift:

```sql
-- Run via Supabase MCP execute_sql before the migration runs.
-- Save the returned id list into .planning/phases/01-*/01-CRIT-01-affected-ids.txt
-- (gitignored if it leaks anything sensitive; here it shouldn't — these are bad
-- rows with no PII, just placeholder error strings).
SELECT id, slug, title
FROM public.blogs
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  )
ORDER BY id;
```

### Post-mutation verification (run AFTER applying)

```sql
-- (A) Confirm zero bad rows remain published
SELECT count(*) AS still_bad
FROM public.blogs
WHERE status = 'published'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  );
-- Expected: 0

-- (B) Confirm flipped rows are accounted for as drafts
SELECT count(*) AS flipped_to_draft
FROM public.blogs
WHERE status = 'draft'
  AND updated_at > now() - interval '1 hour'
  AND (
    title = 'Error Processing Blog'
    OR content LIKE 'Error: Could not extract content. Response keys: %'
  );
-- Expected: matches the count from pre-flight query (1)

-- (C) Confirm /blog read path returns smaller list
SELECT count(*) AS published_remaining FROM public.blogs WHERE status = 'published';
-- Expected: pre-flight (2) - pre-flight (1)

-- (D) Smoke-check the public surfaces
-- - curl https://tenantflow.app/sitemap.xml | grep '<loc>' | wc -l   (should drop)
-- - curl https://tenantflow.app/feed.xml    | grep '<item>' | wc -l  (should drop)
-- - https://tenantflow.app/blog should render BlogEmptyState if zero good rows remain
```

### Rollback paths (in order of preference)

#### Path 1 — Targeted reverse UPDATE using the captured ID list

If the side artifact `01-CRIT-01-affected-ids.txt` was captured, the safest rollback is by primary key:

```sql
-- Replace the IN list with the IDs from the captured artifact.
update public.blogs
set status = 'published',
    updated_at = now()
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
  -- ... full list from artifact
)
and status = 'draft';  -- defensive: only flip back rows that are currently drafts
```

#### Path 2 — Reverse UPDATE by signature (no ID list required)

```sql
-- Time window guards against flipping back rows that were drafts BEFORE the
-- migration ran. The migration sets updated_at = now() on every flipped row,
-- so a 24-hour window post-migration is safe.
update public.blogs
set status = 'published',
    updated_at = now()
where status = 'draft'
  and (
    title = 'Error Processing Blog'
    or content like 'Error: Could not extract content. Response keys: %'
  )
  and updated_at > '<MIGRATION_RUN_TIMESTAMP_UTC>'::timestamptz - interval '5 minutes'
  and updated_at < '<MIGRATION_RUN_TIMESTAMP_UTC>'::timestamptz + interval '24 hours';
```

#### Path 3 — Restore from a `pg_dump` snapshot

If the rollback is needed weeks later (after re-publishing decisions have made path 1/2 ambiguous), the only safe path is restoring from a pre-mutation `pg_dump` of the `blogs` table:

```bash
# Pre-mutation snapshot (run BEFORE migration as belt-and-suspenders):
pg_dump --table=public.blogs --data-only --column-inserts \
  $DATABASE_URL > /tmp/blogs_pre_crit01.sql

# Restore (manual review required — won't blindly overwrite live state):
# 1. inspect /tmp/blogs_pre_crit01.sql vs current state diff
# 2. surgically restore needed rows via INSERT ... ON CONFLICT (id) DO UPDATE
```

### Rollback decision tree

| Scenario | Use path |
|----------|----------|
| Migration just ran, planner realizes WHERE was too broad | Path 1 (primary key list) |
| ID list lost; mutation < 24 hours old | Path 2 (signature + time window) |
| Mutation > 24 hours old, partial re-publishes have happened, or a Phase 6 commit has touched these rows | Path 3 (`pg_dump` restore + surgical merge) |

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WHERE clause matches a legit post about errors | LOW | MED — one good post wrongly flipped to draft | Pre-flight queries (5)+(6) catch divergence between title and content signatures; if either returns rows, human eyeballs before applying |
| WHERE clause misses some bad rows (e.g. n8n stuffed a different error string in title or content) | MED | LOW — tail bad rows still indexed; cosmetic | Run query (4) in pre-flight; widen WHERE if a non-trivial cluster of other "error-shaped" titles appears |
| Migration runs but `update_updated_at` trigger isn't firing | LOW | LOW — `updated_at` set explicitly in UPDATE anyway | `updated_at = now()` is in the UPDATE statement directly |
| Bad rows have `featured_image` pointing to storage objects that should also be cleaned up | LOW | LOW | Out of scope for Phase 1 (stop-bleed only). Phase 6 BLOG-01 handles asset cleanup at hard-delete time |
| n8n workflow keeps writing new bad rows after the flip | HIGH | MED — repeatedly republishes "Error Processing Blog" | **Coordinate with sister specialist** researching n8n redesign (Phase 6 BLOG-03). For Phase 1, the migration fixes today's bleed; if new bad rows appear, the migration is idempotent and can be re-run. Recommend pausing the n8n workflow OR adding a `BEFORE INSERT` trigger that rejects rows where `title='Error Processing Blog'`. The trigger is **out of Phase 1 scope** unless re-bleed is observed before Phase 6 ships. |
| Sitemap/feed CDN cache serves stale bad URLs after flip | LOW | LOW | Vercel ISR + Next.js `sitemap.ts`/`feed.xml` regenerate on next request. Worst case: 5-min stale. Acceptable for stop-bleed. |
| Migration timestamp drifts from prod-assigned via MCP | HIGH (per memory) | LOW — recoverable | Run `mcp__supabase__list_migrations` after `apply_migration`, rename the repo file to match. [migration-mcp-prod-drift.md memory] |
| RLS blocks the UPDATE | NONE | — | Migration runs as superuser, bypasses RLS. SELECT policy stays public-published-only ([add_blogs_rls_policies.sql:14–20](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql)) |
| Slug collision when Phase 6 republishes | NONE | — | Phase 6 will use clean semantic slugs (per BLOG-02 + SEO-04); old `error-<ms>` slugs don't collide |
| Concurrent UPDATE from n8n workflow during migration | LOW | LOW — UPDATE statement holds row-level locks while running | If observed in practice (unlikely for a one-shot ~70-row UPDATE), wrap in `BEGIN ... LOCK TABLE blogs IN SHARE ROW EXCLUSIVE MODE; ... COMMIT;` — but skip preemptively, the lock contention is self-limiting on this row count. |

## Confidence Levels

| Recommendation | Confidence | Reasoning |
|----------------|------------|-----------|
| Identification WHERE clause `(title=... OR content LIKE ...)` | HIGH | Audit document confirmed both signatures verbatim. n8n's failure path produces deterministic strings. Pre-flight queries cross-check before mutation. |
| State transition: `status='draft'` (option a) | HIGH | All four read surfaces gate on `status='published'` (verified by codebase grep at 4 file:line references). RLS SELECT policy gates on the same. Reversibility is symmetric. Pattern matches existing soft-delete idiom (properties `status='inactive'`). |
| Skip archive-then-delete pattern (option d) | HIGH | Pattern is for retention SLA + recurring cleanup of operational data; this is one-shot user-content correction. Volume mismatch (100 rows vs 10k+/day). |
| One-shot SQL migration via Supabase MCP `apply_migration` (option a) | HIGH | Matches existing TenantFlow migration discipline. Reproducible + reviewable + idempotent. |
| Migration timestamp reconciliation post-MCP | HIGH | Documented in [migration-mcp-prod-drift.md memory] from prior production experience. |
| Bad-row count ~70 | MED | Audit document estimate ("the ~70+ blog posts (12 pages of pagination)"). Researcher could not query prod directly (Supabase MCP not loaded in this session). Pre-flight verification query (1) confirms before mutation. |
| n8n workflow re-bleed risk | MED | Audit document doesn't say whether the workflow is paused or still running. Phase 1 should coordinate with Phase 6 BLOG-03 researcher; if they confirm n8n is still pushing daily, recommend pausing the workflow before applying the migration. |
| Slug-collision risk during Phase 6 rebuild | HIGH | Old slugs are `error-<unix_ms>`; new slugs will be semantic per BLOG-02 + SEO-04. Namespaces don't overlap. |
| `archived` state available without CHECK update | HIGH | [create migration:11–12](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql) — CHECK is `IN ('draft', 'published', 'archived')`. [add_status_enums:48,64,76](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251210161000_add_status_enums.sql) confirms `blogs.status` was deliberately left as `text`-with-CHECK. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bad-row count is ~70 (audit estimate) | Identification Rule | LOW — pre-flight verification query (1) confirms before mutation; `do $$` block in migration aborts if count > 200 |
| A2 | n8n workflow has been paused or no new bad rows are being inserted post-audit | Risk Matrix (n8n re-bleed) | MED — if false, the migration must be re-run periodically until Phase 6 BLOG-03 redesigns the n8n flow. Migration is idempotent, so re-running is safe. **Sister specialist on Phase 6 should confirm n8n workflow state.** |
| A3 | No `featured_image` storage objects need cleanup at Phase 1 time | Risk Matrix | LOW — Phase 6 BLOG-01 explicitly owns asset cleanup |
| A4 | Vercel/Next.js will regenerate sitemap.xml + feed.xml within minutes of the flip | State Transition (table row) | LOW — worst case is short-lived stale URLs; Google won't penalize a 5-minute lag |

## Sources

### Primary (HIGH confidence)
- [audit-ui-2026-05-08.md L14](file:///Users/richard/Developer/tenant-flow/audit-ui-2026-05-08.md) — exact title + content + slug pattern of bad rows
- [supabase/migrations/20251209120000_create_blogs_table.sql](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql) — schema + CHECK constraint defining accepted status values
- [supabase/migrations/20251219210000_add_blogs_rls_policies.sql](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql) — public RLS gates `status='published'`
- [supabase/migrations/20251210161000_add_status_enums.sql L48,64,76](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251210161000_add_status_enums.sql) — confirms blogs deliberately left as text+CHECK
- [supabase/migrations/20251220030000_fix_rls_policy_gaps.sql](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20251220030000_fix_rls_policy_gaps.sql) — DELETE policy is `service_role` only (UPDATE policy from blogs RLS migration is also service-role only)
- [supabase/migrations/20260306170000_cleanup_cron_scheduling.sql](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260306170000_cleanup_cron_scheduling.sql) — canonical archive-then-delete pattern
- [supabase/migrations/20260307120000_blog_categories_rpc.sql L18](file:///Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql) — RPC gates `status='published'`
- [src/hooks/api/query-keys/blog-keys.ts L89,135,177,198](file:///Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts) — read path filters on `status='published'`
- [src/app/sitemap.ts L120](file:///Users/richard/Developer/tenant-flow/src/app/sitemap.ts) — sitemap filters on `status='published'`
- [src/app/feed.xml/route.ts L70](file:///Users/richard/Developer/tenant-flow/src/app/feed.xml/route.ts) — RSS feed filters on `status='published'`
- [src/app/blog/blog-client.tsx L108–110](file:///Users/richard/Developer/tenant-flow/src/app/blog/blog-client.tsx) — `BlogEmptyState` renders when zero good rows
- [.planning/REQUIREMENTS.md L29,51](file:///Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md) — CRIT-01 + BLOG-01 scope boundary
- [CLAUDE.md `migration-mcp-prod-drift.md` memory](file:///Users/richard/.claude/projects/-Users-richard-Developer-tenant-flow/memory/MEMORY.md) — MCP-applied migrations get prod-assigned timestamps; reconcile via `list_migrations`
- [CLAUDE.md L182 — soft-delete idiom](file:///Users/richard/Developer/tenant-flow/CLAUDE.md) — properties soft-delete via `status='inactive'`

### Secondary (MEDIUM confidence)
- None. All claims grounded in source files.

### Tertiary (LOW confidence)
- None. Researcher did not rely on web search.

## Metadata

**Confidence breakdown:**
- Identification rule: HIGH — three independent signatures, audit-confirmed, two-of-three match in WHERE
- State transition: HIGH — read path verified by 4 file:line refs gating on `status='published'`
- Archive pattern decision: HIGH — pattern explicitly designed for retention SLA, not one-shot fix
- Migration vs runtime: HIGH — matches established TenantFlow discipline
- Rollback playbook: HIGH — three-tier strategy with declining preference + decision tree
- Bad-row count: MED — audit estimate; pre-flight query (1) confirms before mutation
- n8n re-bleed risk: MED — depends on whether sister specialist confirms workflow is paused

**Research date:** 2026-05-08
**Valid until:** 2026-05-15 (1 week — n8n workflow state could change; new bad rows could appear)
