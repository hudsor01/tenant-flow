-- Phase 6 / BLOG-01: hard-DELETE the 100 broken Phase-1 draft rows.
-- Phase-1 left them as status='draft' for safety; Phase 6 is the cleanup window.
-- The 30-day grace has elapsed by Phase-6 ship time.

DO $$
DECLARE v_before integer; v_after integer;
BEGIN
  SELECT count(*) INTO v_before
  FROM public.blogs
  WHERE status = 'draft' AND created_at < '2026-05-09';

  DELETE FROM public.blogs
  WHERE status = 'draft' AND created_at < '2026-05-09';

  SELECT count(*) INTO v_after
  FROM public.blogs
  WHERE status = 'draft' AND created_at < '2026-05-09';

  RAISE NOTICE 'Phase-1 broken-draft cleanup: deleted % rows (before=%, after=%)',
    v_before - v_after, v_before, v_after;

  IF v_after <> 0 THEN
    RAISE EXCEPTION 'Phase-1 broken-draft DELETE post-flight failed: % rows remain', v_after;
  END IF;
END $$;
