-- Phase 52 perfect-PR streak fix: prune the LIKE-copied archive indexes.
--
-- notifications_archive was created via LIKE ... INCLUDING ALL, copying the
-- live table's index set. Only two are load-bearing on cold storage:
--   - notifications_archive_pkey (serves the cleanup fn's ON CONFLICT (id))
--   - notifications_archive_user_id_created_at_idx1 (user_id, created_at desc)
--     (serves the GDPR cascade's delete ... where user_id = ...)
-- The other three were pure write amplification on the nightly batch inserts:
--   - _user_id_is_read_created_at_idx: copy of the composite already dropped
--     from the live table as redundant (20260720151257)
--   - _user_id_created_at_idx: partial WHERE is_read=false - useless on an
--     archive whose read tier is is_read=true and which serves no user queries
--   - _user_id_idx: strict prefix of _user_id_created_at_idx1
--
-- Applied to prod via MCP 2026-07-20; verified remaining set is exactly
-- {pkey, user_id_created_at_idx1}.

drop index if exists public.notifications_archive_user_id_is_read_created_at_idx;
drop index if exists public.notifications_archive_user_id_created_at_idx;
drop index if exists public.notifications_archive_user_id_idx;
