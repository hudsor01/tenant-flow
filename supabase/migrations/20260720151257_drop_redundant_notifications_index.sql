-- Phase 52 perfect-PR streak fix: drop the redundant composite index.
--
-- notifications_user_unread_created_idx (user_id, is_read, created_at desc)
-- duplicated two never-dropped predecessors that serve every live query path
-- at least as well:
--   - idx_notifications_user_unread (user_id, created_at desc) WHERE is_read=false
--     (20251223200000) - exactly fits the unread HEAD count and mark-all-read
--     predicates (user_id + is_read=false).
--   - idx_notifications_user_created (user_id, created_at desc) (20260303160000)
--     - exactly fits the inbox list (user_id + order by created_at desc); the
--     composite's middle is_read column blocks a direct ordered scan.
-- Keeping it was pure write amplification on every trigger/cron insert,
-- contradicting the index-consolidation doctrine (20260301065605/20260303160000).
--
-- Applied to prod via MCP 2026-07-20.

drop index if exists public.notifications_user_unread_created_idx;
