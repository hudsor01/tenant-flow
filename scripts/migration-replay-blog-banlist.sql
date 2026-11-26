-- Fixture for the migration-replay gate's validate_blog_post banlist assertion.
--
-- Run by .github/workflows/migration-replay.yml against the replayed EMPTY
-- database only (it needs no seeded user):
--
--   docker exec -i supabase_db_tenant-flow psql -U postgres -X -q -t -A \
--     -v ON_ERROR_STOP=1 < scripts/migration-replay-blog-banlist.sql
--
-- It inserts posts into public.blogs AS service_role (n8n-blog-ingest's role,
-- which holds no EXECUTE on the trigger function: a trigger needs none to
-- fire), records each statement's SQLSTATE and message, prints ONE line of
-- JSON, and rolls everything back. scripts/migration-replay-assertions.ts
-- (assertBlogBanlistGate) holds the expected outcome of every case; keep the
-- two in step.
--
-- Every post passes gates 1-7 and 9 (2,100-odd words, five "## " headings,
-- "landlord", a valid slug, a 120-155 character meta description, a 10-60
-- character SEO title (a column default this fixture sets inside its
-- transaction, since 20261126174726 requires one), an 80-200 character
-- excerpt, a listed category, no DocuSeal), so the banlist (gate 8)
-- is the only gate a case can trip, except the two slug cases at the end. The
-- cases:
--   - a persona word in the title, the excerpt and the content, at in-review
--     and at published, each spelled differently: "single-property owner" and
--     "multiproperty owners" (no word start, after a hyphen and after a
--     letter), "Property Owners" (case, plural), "PROPERTY OWNER" as the
--     content's last words (the end of the text is a word end): rejected;
--   - a banlist phrase in each field at both statuses: rejected;
--   - "property ownership" in all three fields, and "property owner_id" /
--     "property owners2" (a word character after the word): accepted;
--   - a clean post at in-review and at published: accepted;
--   - a draft with a persona word: accepted (drafts are not gated);
--   - an UPDATE of a published post that adds a persona word to its title:
--     rejected, because since 20261115173654 an UPDATE of an in-review or
--     published row is gated whenever it changes a field a gate reads;
--   - an UPDATE of an in-review post that adds a banlist phrase to its excerpt:
--     rejected;
--   - an UPDATE of a published post that edits its content and stays clean:
--     accepted;
--   - a published post that predates a gate (written with the trigger off, its
--     title carrying the persona word): an UPDATE of its cover image only is
--     accepted (no gated field changed), an edit of its content, its slug, its
--     meta description or its category is rejected for the title (every gate
--     runs on a gated edit), and an UPDATE to draft is
--     accepted (unpublishing is never gated);
--   - a row with no status (NULL) and the persona word in its title, moved to
--     published: rejected;
--   - an UPDATE of a draft with a persona word in its excerpt to published:
--     rejected;
--   - a clean post published under the slug error-1773361842137: rejected,
--     because since 20261123162023 an error-<digits> slug is a failed
--     generation (gate 4b);
--   - a clean post published under the slug error-proofing-a-lease (only its
--     first word is "error"): accepted.
--
-- The 'trigger' row is read before the fixture switches the trigger off and on,
-- so it reports the state the migrations left.

\set ON_ERROR_STOP on
\set QUIET on

begin;

create temp table replay_blog (label text primary key, payload jsonb not null)
  on commit drop;
grant insert, select on replay_blog to service_role;

-- The trigger as the migrations left it, read BEFORE this fixture switches it
-- off and on below, so a migration that left it disabled still shows here.
insert into replay_blog
select 'trigger', jsonb_build_object(
  'function', t.tgfoid::regprocedure::text,
  'type', t.tgtype,
  'enabled', t.tgenabled::text)
from pg_trigger t
where t.tgrelid = 'public.blogs'::regclass and t.tgname = 'validate_blog_post_trigger';

-- Two posts that predate a gate, written with the trigger off as production's
-- older posts were before the gate existed: one published with the persona
-- word in its title, one with the same title and no status at all
-- (blogs.status is nullable). postgres owns public.blogs, so it can switch the
-- trigger off for these inserts; the rollback at the end undoes both.
-- Every post below gets an SEO title (gate 5c) from this default; the
-- rollback at the end drops it with everything else.
alter table public.blogs alter column seo_title set default 'What landlords check in a lease';
alter table public.blogs disable trigger validate_blog_post_trigger;
insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
select
  'What landlords check in a lease for a property owner',
  'replay-null-status',
  string_agg('## Section ' || n || E'\n' || repeat('A landlord reviews the lease terms here. ', 60), E'\n'),
  'A plain guide for landlords on what to check in a lease before it is signed, one step at a time.',
  'What landlords should check in a lease before signing it, in plain steps: the term, the rent, the deposit, repairs, and how either side can end it.',
  'lease-law',
  null
from generate_series(1, 5) as n;
insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
select
  'What landlords check in a lease for a property owner',
  'replay-legacy-published',
  string_agg('## Section ' || n || E'\n' || repeat('A landlord reviews the lease terms here. ', 60), E'\n'),
  'A plain guide for landlords on what to check in a lease before it is signed, one step at a time.',
  'What landlords should check in a lease before signing it, in plain steps: the term, the rent, the deposit, repairs, and how either side can end it.',
  'lease-law',
  'published'
from generate_series(1, 5) as n;
alter table public.blogs enable trigger validate_blog_post_trigger;

set local role service_role;

do $$
declare
  v_title constant text := 'What landlords check in a lease';
  v_excerpt constant text :=
    'A plain guide for landlords on what to check in a lease before it is signed, one step at a time.';
  v_meta constant text :=
    'What landlords should check in a lease before signing it, in plain steps: the term, the rent, the deposit, repairs, and how either side can end it.';
  v_body text;
  c record;
  v_post_id uuid;
begin
  v_body := (
    select string_agg(
      '## Section ' || n || E'\n' || repeat('A landlord reviews the lease terms here. ', 60),
      E'\n')
    from generate_series(1, 5) as n);

  for c in
    select * from (values
      ('persona-title-in-review', 'in-review', 'title', 'single-property owner'),
      ('persona-excerpt-in-review', 'in-review', 'excerpt', 'Property Owners'),
      ('persona-content-in-review', 'in-review', 'content', 'PROPERTY OWNER'),
      ('persona-title-published', 'published', 'title', 'multiproperty owners'),
      ('persona-excerpt-published', 'published', 'excerpt', 'Property Owners'),
      ('persona-content-published', 'published', 'content', 'PROPERTY OWNER'),
      ('phrase-title-in-review', 'in-review', 'title', 'Rent Collection'),
      ('phrase-excerpt-in-review', 'in-review', 'excerpt', 'autopay'),
      ('phrase-content-in-review', 'in-review', 'content', 'tenant portal'),
      ('phrase-title-published', 'published', 'title', 'Rent Collection'),
      ('phrase-excerpt-published', 'published', 'excerpt', 'autopay'),
      ('phrase-content-published', 'published', 'content', 'tenant portal'),
      ('ownership-every-field', 'published', 'all', 'property ownership'),
      ('word-character-after', 'published', 'split', ''),
      ('clean-in-review', 'in-review', 'none', ''),
      ('clean-published', 'published', 'none', ''),
      ('persona-draft', 'draft', 'title', 'property owner')
    ) as t(label, status, field, phrase)
  loop
    begin
      insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
      values (
        case
          when c.field in ('title', 'all') then v_title || ' for a ' || c.phrase
          when c.field = 'split' then v_title || ' and property owner_id'
          else v_title
        end,
        'replay-' || c.label,
        case
          when c.field in ('content', 'all') then v_body || E'\n' || c.phrase
          when c.field = 'split' then v_body || E'\nproperty owners2'
          else v_body
        end,
        case
          when c.field in ('excerpt', 'all') then v_excerpt || ' For any ' || c.phrase || '.'
          else v_excerpt
        end,
        v_meta,
        'lease-law',
        c.status);
      insert into replay_blog values (c.label, jsonb_build_object('state', '00000', 'message', null));
    exception when others then
      insert into replay_blog
        values (c.label, jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
    end;
  end loop;

  -- An UPDATE of a published post that changes a gated field: gated.
  insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
  values (v_title, 'replay-update-published', v_body, v_excerpt, v_meta, 'lease-law', 'published')
  returning id into v_post_id;
  begin
    update public.blogs set title = v_title || ' for a property owner' where id = v_post_id;
    insert into replay_blog values ('update-published-to-published', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-to-published',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- An UPDATE of an in-review post that changes a gated field: gated.
  insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
  values (v_title, 'replay-update-in-review', v_body, v_excerpt, v_meta, 'lease-law', 'in-review')
  returning id into v_post_id;
  begin
    update public.blogs set excerpt = v_excerpt || ' For any autopay.' where id = v_post_id;
    insert into replay_blog values ('update-in-review-to-in-review', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-in-review-to-in-review',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A clean edit of a published post's content: gated, and it passes.
  insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
  values (v_title, 'replay-update-clean', v_body, v_excerpt, v_meta, 'lease-law', 'published')
  returning id into v_post_id;
  begin
    update public.blogs set content = v_body || E'\nA landlord adds one more note.' where id = v_post_id;
    insert into replay_blog values ('update-published-clean-edit', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-clean-edit',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- The post that predates a gate. A new cover changes no gated field: not gated.
  select id into v_post_id from public.blogs where slug = 'replay-legacy-published';
  begin
    update public.blogs set featured_image = 'https://images.unsplash.com/replay-cover' where id = v_post_id;
    insert into replay_blog values ('update-published-ungated-field', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-ungated-field',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A content edit is gated, so the title's older violation now blocks it.
  begin
    update public.blogs set content = v_body || E'\nA landlord adds one more note.' where id = v_post_id;
    insert into replay_blog values ('update-published-legacy-edit', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-legacy-edit',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A new slug is a gated edit too, so the title's violation blocks it.
  begin
    update public.blogs set slug = 'replay-legacy-renamed' where id = v_post_id;
    insert into replay_blog values ('update-published-legacy-slug', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-legacy-slug',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A new meta description is a gated edit too, so the title's violation blocks it.
  begin
    update public.blogs set meta_description = 'What landlords should check in a lease before signing it, in clear plain steps: the term, the rent, the deposit, repairs, and how either side ends it.' where id = v_post_id;
    insert into replay_blog values ('update-published-legacy-meta', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-legacy-meta',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A new category is a gated edit too, so the title's violation blocks it.
  begin
    update public.blogs set category = 'maintenance' where id = v_post_id;
    insert into replay_blog values ('update-published-legacy-category', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-legacy-category',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- Unpublishing it: never gated.
  begin
    update public.blogs set status = 'draft' where id = v_post_id;
    insert into replay_blog values ('update-published-to-draft', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-published-to-draft',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A row with no status moved to published: gated (a NULL status is another
  -- status), so its title's persona word blocks it.
  select id into v_post_id from public.blogs where slug = 'replay-null-status';
  begin
    update public.blogs set status = 'published' where id = v_post_id;
    insert into replay_blog values ('update-null-status-to-published', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-null-status-to-published',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- An UPDATE of a draft to published: gated.
  insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
  values (v_title, 'replay-update-draft', v_body, v_excerpt || ' For any property owner.', v_meta,
    'lease-law', 'draft')
  returning id into v_post_id;
  begin
    update public.blogs set status = 'published' where id = v_post_id;
    insert into replay_blog values ('update-draft-to-published', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('update-draft-to-published',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- An error-<digits> slug is a failed generation (gate 4b): rejected.
  begin
    insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
    values (v_title, 'error-1773361842137', v_body, v_excerpt, v_meta, 'lease-law', 'published');
    insert into replay_blog values ('error-slug-published', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('error-slug-published',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;

  -- A slug whose first word is "error" is an ordinary post: accepted.
  begin
    insert into public.blogs (title, slug, content, excerpt, meta_description, category, status)
    values (v_title, 'error-proofing-a-lease', v_body, v_excerpt, v_meta, 'lease-law', 'published');
    insert into replay_blog values ('error-word-slug-published', jsonb_build_object('state', '00000', 'message', null));
  exception when others then
    insert into replay_blog values ('error-word-slug-published',
      jsonb_build_object('state', SQLSTATE, 'message', SQLERRM));
  end;
end
$$;

reset role;

insert into replay_blog
select 'privileges', jsonb_build_object(
  'acl', p.proacl::text,
  'volatility', p.provolatile::text,
  'security_definer', p.prosecdef,
  'config', to_jsonb(p.proconfig))
from pg_proc p
where p.oid = 'public.validate_blog_post()'::regprocedure;


select jsonb_object_agg(label, payload)::text from replay_blog;

rollback;
