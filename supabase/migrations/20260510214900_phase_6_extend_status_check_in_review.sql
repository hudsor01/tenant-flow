-- Phase 6 / BLOG-01 + BLOG-05: extend blogs.status CHECK to accept 'in-review'.
-- Existing CHECK is ('draft','published','archived'). Phase 6 adds the editorial-gate
-- intermediate state. Manual flip 'in-review' → 'published' via Supabase Studio.
--
-- No post-flight DO-block probe here — the integration test in Task 3 covers the
-- in-review acceptance case end-to-end (Info-#11). Keeping the migration small means
-- it doesn't depend on Migration 4 (validation triggers) being applied first.

ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_status_check;
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_status_check
  CHECK (status IN ('draft', 'in-review', 'published', 'archived'));
