-- validate_blog_post: gate the SEO fields search results show (2026-11-24 SEO
-- audit PT-3, PT-4; roadmap 8a). Body from the live function
-- (pg_get_functiondef, 2026-11-26) with three changes:
--   - Gate 5: meta_description 120..155 characters (was 50..160), the range
--     a search result shows in full (page-metadata-lengths.test.ts).
--   - Gate 5c (new): seo_title, the post's <title>, is required, 10..60.
--   - Gate 8 scans seo_title and meta_description too: both render in search
--     results. Kept in step with _shared/blog-banlist.ts and
--     scripts/generate-blog-draft.ts (banlist-parity.test.ts).
-- An edit to seo_title re-runs the gates, like the other public fields.
-- Every published post passes all three (checked 2026-11-26).
CREATE OR REPLACE FUNCTION public.validate_blog_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_word_count integer;
  v_h2_count integer;
  v_docuseal_count integer;
  v_banned text;
  v_field text;
  v_text text;
  v_banlist text[] := ARRAY[
    'rent collection', 'online rent', 'autopay', 'auto-pay', 'tenant portal',
    'automated rent', 'collect rent', 'rent processing', 'pay rent online',
    'online payments', 'online rent payment', 'rent collection software',
    'tenants can pay', 'pay rent through',
    'automated workflow', 'rent tracking', 'mobile app access',
    'record rent', 'paid rent', 'pay rent'
  ];
  v_persona_banlist text[] := ARRAY['property owner'];
  v_banlist_fields text[] := ARRAY['title', 'seo_title', 'excerpt', 'meta_description', 'content'];
  v_categories text[] := ARRAY['lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault'];
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('in-review', 'published'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('in-review', 'published') AND (
           coalesce(OLD.status, '') NOT IN ('in-review', 'published')
           OR NEW.title IS DISTINCT FROM OLD.title
           OR NEW.seo_title IS DISTINCT FROM OLD.seo_title
           OR NEW.slug IS DISTINCT FROM OLD.slug
           OR NEW.content IS DISTINCT FROM OLD.content
           OR NEW.excerpt IS DISTINCT FROM OLD.excerpt
           OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
           OR NEW.category IS DISTINCT FROM OLD.category))
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
    IF NEW.slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 120 THEN
      RAISE EXCEPTION 'slug pattern invalid: % (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120)', NEW.slug
        USING ERRCODE = '23514';
    END IF;

    -- Gate 4b: an error-<digits> slug is a failed generation, never a post.
    IF NEW.slug ~ '^error-[0-9]+$' THEN
      RAISE EXCEPTION 'slug pattern invalid: % (error-<digits> is a failed generation, not a post)', NEW.slug
        USING ERRCODE = '23514';
    END IF;

    -- Gate 5: meta_description 120–155 chars
    IF NEW.meta_description IS NULL OR length(NEW.meta_description) < 120 OR length(NEW.meta_description) > 155 THEN
      RAISE EXCEPTION 'meta_description length out of range: % (must be 120..155)',
        coalesce(length(NEW.meta_description)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 5c: seo_title 10–60 chars, required
    IF NEW.seo_title IS NULL OR length(NEW.seo_title) < 10 OR length(NEW.seo_title) > 60 THEN
      RAISE EXCEPTION 'seo_title length out of range: % (must be 10..60)',
        coalesce(length(NEW.seo_title)::text, 'NULL')
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

    -- Gate 8: banlist — no field of v_banlist_fields may contain a banned phrase
    -- (a substring, case ignored) or a persona word (case ignored, an optional
    -- plural "s", then the end of the text or a character other than an ASCII
    -- letter, digit or underscore: persona-consistency.spec.ts's
    -- /property owners?\b/i)
    FOREACH v_field IN ARRAY v_banlist_fields LOOP
      v_text := coalesce(to_jsonb(NEW) ->> v_field, '');
      FOREACH v_banned IN ARRAY v_banlist LOOP
        IF position(lower(v_banned) in lower(v_text)) > 0 THEN
          RAISE EXCEPTION 'banlist hit: % (Phase 4 banlist phrase found in %)', v_banned, v_field
            USING ERRCODE = '23514';
        END IF;
      END LOOP;
      FOREACH v_banned IN ARRAY v_persona_banlist LOOP
        IF v_text ~* (v_banned || 's?($|[^A-Za-z0-9_])') THEN
          RAISE EXCEPTION 'banlist hit: % (persona word found in %)', v_banned, v_field
            USING ERRCODE = '23514';
        END IF;
      END LOOP;
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
$function$;
