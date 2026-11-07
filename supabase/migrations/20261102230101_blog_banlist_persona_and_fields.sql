-- validate_blog_post: the banlist gate (gate 8) checks the title, the excerpt
-- and the content, and bans the persona word "property owner".
--
-- WHAT WAS WRONG. Gate 8 checked NEW.content only, so a banned phrase in a
-- post's title or excerpt published: /blog renders both on every card, and a
-- published excerpt was how "single-property owner" reached the public page
-- that tests/e2e/tests/public/persona-consistency.spec.ts checks. And nothing
-- banned the persona word at all: the spec bans /property owners?\b/i on every
-- public page, and none of the three gate copies carried it.
--
-- WHAT CHANGES. Started from production's body of public.validate_blog_post()
-- (md5 33667bfe24d7566b1e7effaa292c8bcd, the body 20260717202554 wrote, less
-- its comments). Gates 1-7 and 9, the INSERT/UPDATE condition and the RAISE
-- texts are unchanged. Gate 8 now:
--   - checks every field in v_banlist_fields (title, excerpt, content), in that
--     order, read by name from the row;
--   - in each field, the phrases of v_banlist as before (a substring with case
--     ignored: "unpaid rent" carries "paid rent"), then each persona word of
--     v_persona_banlist with the spec's semantics exactly: case ignored, an
--     optional plural "s", then a word end (the end of the text or a character
--     other than an ASCII letter, digit or underscore, which is JavaScript's \b
--     without the u flag), and no word start ("single-property owner" and
--     "multiproperty owners" match; "property ownership" and "property owner_id"
--     do not). A substring test would match "ownership", so the persona word is
--     a pattern, not a phrase. Entries are lowercase letters and spaces only, so
--     each is a literal in the pattern;
--   - names the field in its message: 'banlist hit: <phrase> (... found in
--     <field>)'. The "banlist hit" prefix is what n8n-blog-ingest maps to its
--     banlist gate.
--
-- WHAT IT DOES NOT DO. The gates still run only on an INSERT at in-review or
-- published, or an UPDATE INTO one of those from another status: an UPDATE of a
-- row already in-review or published is not gated (as before), so no existing
-- post is rechecked and none is changed here.
--
-- KEPT IN STEP WITH (src/lib/seo/__tests__/banlist-parity.test.ts compares the
-- phrases, the persona words, the fields and the persona pattern of all three
-- with the spec's regex):
--   - supabase/functions/_shared/blog-banlist.ts (the n8n-blog-ingest gate)
--   - scripts/generate-blog-draft.ts (BANLIST, PERSONA_BANLIST, BANLIST_FIELDS)
--
-- PRIVILEGES. Production's ACL is {postgres=X/postgres}. CREATE OR REPLACE keeps
-- the existing ACL, which 20261102055400 has already made production's on a
-- replay (the chain through 20261005215446 left PUBLIC and service_role with
-- EXECUTE); the REVOKE below leaves it so whatever ran before. A trigger
-- function needs no EXECUTE to fire: scripts/migration-replay-blog-banlist.sql
-- inserts as service_role (the Edge Function's role) and is rejected by it.

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

revoke all on function public.validate_blog_post() from public, anon, authenticated, service_role;
