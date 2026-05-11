-- Phase 6 / BLOG-01: drop the Phase-1 BEFORE-INSERT reject trigger.
-- Phase-1 migration `20260508231802_unpublish_broken_blogs.sql` (line 100) installed
-- `reject_n8n_error_blogs_trigger` and left a comment:
-- "Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely."
-- Order: drop trigger before function (Postgres requires this).

DROP TRIGGER IF EXISTS reject_n8n_error_blogs_trigger ON public.blogs;
DROP FUNCTION IF EXISTS public.reject_n8n_error_blogs();

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger
  WHERE tgname = 'reject_n8n_error_blogs_trigger';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Phase-1 reject trigger still present after DROP (count=%)', v_count;
  END IF;
END $$;
