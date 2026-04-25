-- v2.4 Phase 60 cycle-1 audit fix: repopulate search_vector for any rows
-- the broken backfill in 20260424182557 missed (already applied to prod
-- via MCP at this exact timestamp; this file is the in-repo source of
-- truth so `supabase db diff` and disaster-recovery replays match prod).
--
-- The original backfill said:
--   update public.documents set search_vector = null where search_vector is null;
-- and relied on the new trigger to fire and populate the column. But the
-- trigger fires only on `BEFORE UPDATE OF title, description, tags`, and a
-- SET clause that mentions only `search_vector` does NOT fire it. Result:
-- every pre-existing row stayed NULL until something else updated one of
-- the watched columns — silently breaking the headline /documents/vault
-- search feature for every document uploaded before the migration.
--
-- 20260424182557 was rewritten in cycle-1 to use an inline to_tsvector()
-- backfill (so fresh `db reset` is correct), but prod had already run the
-- broken version. This idempotent follow-up fixes those prod rows. On a
-- fresh DB, the where-clause filters everything (search_vector is already
-- populated by the rewritten 20260424182557), so this is a no-op.

begin;

update public.documents
set search_vector = to_tsvector(
  'english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
)
where search_vector is null;

commit;
