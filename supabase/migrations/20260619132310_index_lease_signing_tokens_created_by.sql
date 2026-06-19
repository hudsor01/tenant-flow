-- Covering index for the lease_signing_tokens.created_by foreign key.
-- Flagged by the Supabase performance advisor (unindexed_foreign_keys 0001):
-- without it, a delete/update on public.users must sequentially scan
-- lease_signing_tokens to enforce the FK. Cheap insurance on a low-volume table.
create index if not exists idx_lease_signing_tokens_created_by
  on public.lease_signing_tokens (created_by);
