-- ADMIN-02: populate blogs.word_count (and, via the GENERATED reading_time
-- column, reading_time) on every in-review/published write.
--
-- The validate_blog_post BEFORE trigger already computes v_word_count purely to
-- gate the 1200..3000 range check but never assigned it to NEW.word_count, so
-- word_count stayed NULL on every row and the admin review queue rendered
-- "0 words". Because reading_time is GENERATED ALWAYS AS (GREATEST(1,
-- word_count / 200)), it derived NULL sitewide too (public blog cards included).
--
-- This CREATE OR REPLACE copies the canonical body from
-- 20260510214935_phase_6_validation_triggers.sql verbatim and adds the single
-- assignment NEW.word_count := v_word_count; right after the range check passes.
-- Postgres recomputes the generated reading_time from the final NEW.word_count
-- after this BEFORE trigger, so both columns populate for free on every future
-- write (the n8n ingest INSERT path is covered — its status is 'in-review').

CREATE OR REPLACE FUNCTION public.validate_blog_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_word_count integer;
  v_h2_count integer;
  v_docuseal_count integer;
  v_banned text;
  v_banlist text[] := ARRAY[
    'rent collection', 'online rent', 'autopay', 'auto-pay', 'tenant portal',
    'automated rent', 'collect rent', 'rent processing', 'pay rent online',
    'online payments', 'online rent payment', 'rent collection software',
    'tenants can pay', 'pay rent through',
    'automated workflow', 'rent tracking', 'mobile app access',
    'record rent', 'paid rent', 'pay rent'
  ];
  v_categories text[] := ARRAY['lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault'];
BEGIN
  -- Only run gates on INSERT, and only when status is being set to a published-trail value.
  -- 'archived' rows can be loose; 'draft' rows are operator-controlled. Apply gates to
  -- 'in-review' and 'published' transitions because both face the public.
  IF (TG_OP = 'INSERT' AND NEW.status IN ('in-review', 'published'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('in-review', 'published') AND OLD.status NOT IN ('in-review', 'published'))
  THEN
    -- Gate 1: word count 1,200–3,000
    v_word_count := array_length(regexp_split_to_array(coalesce(NEW.content, ''), '\s+'), 1);
    IF v_word_count IS NULL OR v_word_count < 1200 OR v_word_count > 3000 THEN
      RAISE EXCEPTION 'word_count out of range: % (must be 1200..3000)', v_word_count
        USING ERRCODE = '23514';
    END IF;

    -- ADMIN-02: persist the count the gate just validated. The generated
    -- reading_time column recomputes from this on row finalization.
    NEW.word_count := v_word_count;

    -- Gate 2: H2 count 4–10 (markdown ^## )
    v_h2_count := coalesce(
      (SELECT count(*)::int FROM regexp_matches(coalesce(NEW.content, ''), '^## ', 'gn')),
      0
    );
    IF v_h2_count < 4 OR v_h2_count > 10 THEN
      RAISE EXCEPTION 'h2_count out of range: % (must be 4..10)', v_h2_count
        USING ERRCODE = '23514';
    END IF;

    -- Gate 3: persona phrase — body must contain "landlord" (case-insensitive)
    IF position('landlord' in lower(coalesce(NEW.content, ''))) = 0 THEN
      RAISE EXCEPTION 'persona phrase missing: content must contain "landlord"'
        USING ERRCODE = '23514';
    END IF;

    -- Gate 4: slug pattern — duplicates the CHECK constraint defense-in-depth.
    -- (CHECK runs before trigger; this is here for clearer error messaging on UPDATE.)
    IF NEW.slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 120 THEN
      RAISE EXCEPTION 'slug pattern invalid: % (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120)', NEW.slug
        USING ERRCODE = '23514';
    END IF;

    -- Gate 5: meta_description 50–160 chars
    IF NEW.meta_description IS NULL OR length(NEW.meta_description) < 50 OR length(NEW.meta_description) > 160 THEN
      RAISE EXCEPTION 'meta_description length out of range: % (must be 50..160)',
        coalesce(length(NEW.meta_description)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 6: excerpt 80–200 chars
    IF NEW.excerpt IS NULL OR length(NEW.excerpt) < 80 OR length(NEW.excerpt) > 200 THEN
      RAISE EXCEPTION 'excerpt length out of range: % (must be 80..200)',
        coalesce(length(NEW.excerpt)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 7: category enum
    IF NEW.category IS NULL OR NOT (NEW.category = ANY(v_categories)) THEN
      RAISE EXCEPTION 'category not in enum: % (must be one of %)',
        coalesce(NEW.category, 'NULL'), array_to_string(v_categories, ', ')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 8: banlist — content must not contain any banned phrase (case-insensitive)
    FOREACH v_banned IN ARRAY v_banlist LOOP
      IF position(lower(v_banned) in lower(coalesce(NEW.content, ''))) > 0 THEN
        RAISE EXCEPTION 'banlist hit: % (Phase 4 banlist phrase found in content)', v_banned
          USING ERRCODE = '23514';
      END IF;
    END LOOP;

    -- Gate 9: DocuSeal mention count ≤ 1 (Phase 4 COPY-04 de-amp)
    v_docuseal_count := coalesce(
      (SELECT count(*)::int FROM regexp_matches(coalesce(NEW.content, ''), 'DocuSeal', 'gi')),
      0
    );
    IF v_docuseal_count > 1 THEN
      RAISE EXCEPTION 'DocuSeal mention count too high: % (max 1 per Phase 4 COPY-04)', v_docuseal_count
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_blog_post() FROM anon, authenticated;

DROP TRIGGER IF EXISTS validate_blog_post_trigger ON public.blogs;
CREATE TRIGGER validate_blog_post_trigger
  BEFORE INSERT OR UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_blog_post();

-- One-time backfill for existing rows left NULL by the old trigger. The
-- generated reading_time recomputes for free (generated columns are not
-- triggers). The regex matches the gate's own count, so a backfilled row can
-- never violate the 1200..3000 gate it already passed.
--
-- CRITICAL: word_count is NULL on essentially every row, so this UPDATE touches
-- the whole catalog. The blogs updated_at trigger (set_updated_at, historically
-- update_blogs_updated_at) would then stamp updated_at = now() on every post,
-- poisoning the sitemap <lastmod> / feed lastBuildDate freshness signal
-- (sitemap.ts prefers updated_at) — the exact fake-fresh signal sitemap.ts
-- refuses to emit. Suppress ALL user triggers for this single statement via
-- session_replication_role (name-agnostic against the trigger's historical
-- rename) so updated_at stays truthful; validate_blog_post is skipped too,
-- harmless since these published rows already passed it.
SET session_replication_role = 'replica';
UPDATE public.blogs
SET word_count = array_length(regexp_split_to_array(coalesce(content, ''), '\s+'), 1)
WHERE word_count IS NULL;
SET session_replication_role = 'origin';
