-- Phase 50: Supabase security advisor cleanup.
--
-- Three fixes:
--   1. Storage buckets `avatars` + `property-images` had broad `SELECT`
--      policies that allowed authenticated clients to LIST all files
--      (directory enumeration). Public buckets don't need a SELECT policy
--      for object-URL reads, so dropping the policies tightens access
--      without breaking image display.
--   2. Three `stripe.*` functions (set_updated_at, set_updated_at_metadata,
--      check_rate_limit) have mutable `search_path`. Pin to empty string so
--      any search_path manipulation by callers can't hijack resolution.

begin;

-- 1. Drop redundant SELECT policies that enabled listing
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Anyone can view property images" on storage.objects;
drop policy if exists "Public read access for property images" on storage.objects;

-- 2. Lock search_path on stripe schema helper functions
alter function stripe.set_updated_at() set search_path = '';
alter function stripe.set_updated_at_metadata() set search_path = '';
alter function stripe.check_rate_limit(text, integer, integer) set search_path = '';

commit;
