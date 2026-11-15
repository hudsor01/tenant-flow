-- validate_blog_post: also gate an edit of a post that is already in review or
-- published.
--
-- Until now the nine gates ran only when a row ENTERED in-review or published
-- (an INSERT at either status, or an UPDATE from another status). An UPDATE of a
-- row already in-review or published skipped every gate, so a live post could
-- be edited to carry a banned phrase, the persona word, a broken heading count,
-- or an out-of-range meta description or excerpt, and nothing in the database
-- caught it. The blog-claims cleanup passes of 2026-11-13/15 had to carry their
-- own checks for exactly that reason.
--
-- Now an UPDATE of an in-review or published row is gated whenever it changes a
-- field a gate reads: title, slug, content, excerpt, meta_description or
-- category. An UPDATE that changes none of them (a cover image, tags, the
-- canonical URL, a status change out of in-review/published) is not gated, so a
-- post that predates a gate can still be unpublished or have its cover
-- replaced. Because gate 1 also stores the validated word count, editing a
-- post's content now refreshes word_count (and the generated reading_time).
--
-- The move-in test also treats a NULL status (blogs.status is nullable) as
-- "another status": `OLD.status NOT IN (...)` is NULL for a NULL status, so the
-- old body let a row with no status move to published without any gate.
--
-- Everything else is production's body as of 20261110123128 (read back with
-- pg_get_functiondef on 2026-11-15): the same gates, banlist, persona list,
-- fields, SECURITY DEFINER and search_path. CREATE OR REPLACE keeps the
-- function's owner and ACL (EXECUTE for postgres only), which the
-- migration-replay assertion checks.

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
  v_banlist_fields text[] := ARRAY['title', 'excerpt', 'content'];
  v_categories text[] := ARRAY['lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault'];
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('in-review', 'published'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('in-review', 'published') AND (
           coalesce(OLD.status, '') NOT IN ('in-review', 'published')
           OR NEW.title IS DISTINCT FROM OLD.title
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
