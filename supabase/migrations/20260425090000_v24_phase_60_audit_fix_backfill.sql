-- v2.4 Phase 60 cycle-1 audit fix: repopulate search_vector for any rows
-- the broken backfill in 20260424180000 missed.
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
-- This follow-up populates search_vector directly. Idempotent — a no-op
-- on rows already populated.

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
