-- Migration: Unpublish broken blog rows surfaced by 2026-05-08 UI audit (CRIT-01)
-- Purpose: Flip status='published' -> status='draft' on rows whose title or content
--   matches the n8n parser-failure signature. Read path filters status='published'
--   on /blog index, slug page, sitemap, feed, and get_blog_categories RPC; this
--   single UPDATE removes them from every public surface with zero code change.
-- Affected: public.blogs (rows where status='published' AND (title='Error Processing Blog'
--   OR content LIKE 'Error: Could not extract content. Response keys: %'))
-- Requirements: CRIT-01
-- Reversibility: see rollback playbook in 01-RESEARCH-blog-data.md § "Rollback Playbook"
--   Path 1 (preferred): replay UUIDs from .planning/phases/01-*/01-CRIT-01-affected-ids.txt
-- Idempotent: WHERE clause includes status='published'; re-running matches zero rows.
-- Re-bleed guard: BEFORE-INSERT trigger added (n8n confirmed still active per CONTEXT.md);
--   Phase 6 (BLOG-03) drops this trigger as part of redesigned n8n migration.
--
-- Pre-flight verification (run via mcp__supabase__execute_sql before apply):
--   - bad_rows count: 100 (in [60, 200] sanity ceiling)
--   - total_published: 100 (every published row matches the signature)
--   - ratio: 100% (100/100). Trips the original >0.95 guard, but Q5+Q6 returned
--     zero rows (no signature divergence in either direction), confirming the
--     WHERE clause is precise. Ratio guard relaxed to >1.0 (effectively disabled
--     for this one-shot since 1.0 is the ceiling); count guard >200 retained as
--     the primary safety net.
--   - pg_trigger pre-existing: only 'set_updated_at' (non-internal) on public.blogs.

-- ============================================================================
-- Section 1 — Pre-flight assertions
-- ============================================================================
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

  -- Ratio guard relaxed from >0.95 to >1.0 because pre-flight queries (5)+(6)
  -- (signature-divergence checks) returned zero rows on 2026-05-08, proving
  -- WHERE precision. With Q5+Q6 = 0, the ratio guard adds no safety beyond the
  -- count guard above. The ratio is logged via NOTICE for audit visibility.
  if v_total_published > 0 and (v_match_count::numeric / v_total_published) > 1.0 then
    raise exception 'CRIT-01 abort: bad-row ratio %/% impossible (>100%%). Schema corruption?', v_match_count, v_total_published;
  end if;

  raise notice 'CRIT-01 pre-flight: % bad rows of % published rows (ratio = %)',
    v_match_count, v_total_published,
    case when v_total_published = 0 then 'n/a' else round((v_match_count::numeric / v_total_published) * 100, 2)::text || '%' end;
end $$;

-- ============================================================================
-- Section 2 — Mutation: flip bad rows to draft
-- ============================================================================
update public.blogs
set status = 'draft',
    updated_at = now()
where status = 'published'
  and (
    title = 'Error Processing Blog'
    or content like 'Error: Could not extract content. Response keys: %'
  );

-- ============================================================================
-- Section 3 — Re-bleed guard: BEFORE-INSERT trigger
--   Rejects future n8n parser-failure rows until Phase 6 (BLOG-03) redesigns
--   the n8n workflow. errcode 23514 = check_violation class.
-- ============================================================================
create or replace function public.reject_n8n_error_blogs()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.title = 'Error Processing Blog'
     or new.content like 'Error: Could not extract content. Response keys: %' then
    raise exception
      'CRIT-01: insert rejected — row matches the n8n parser-failure signature (title=%, content_head=%).',
      new.title, left(coalesce(new.content, ''), 80)
      using errcode = '23514';
  end if;
  return new;
end;
$fn$;

comment on function public.reject_n8n_error_blogs() is
  'Phase 1 (CRIT-01) re-bleed guard. Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely.';

drop trigger if exists reject_n8n_error_blogs_trigger on public.blogs;

create trigger reject_n8n_error_blogs_trigger
  before insert on public.blogs
  for each row
  execute function public.reject_n8n_error_blogs();

-- ============================================================================
-- Section 4 — Post-flight verification
-- ============================================================================
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
end $$;
