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
-- "landlord", a valid slug, a 50-160 character meta description, an 80-200
-- character excerpt, a listed category, no DocuSeal), so the banlist (gate 8)
-- is the only gate a case can trip. The cases:
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
--     accepted, because an UPDATE of a row already in-review or published is
--     not gated;
--   - an UPDATE of a draft with a persona word in its excerpt to published:
--     rejected.

\set ON_ERROR_STOP on
\set QUIET on

begin;

create temp table replay_blog (label text primary key, payload jsonb not null)
  on commit drop;
grant insert, select on replay_blog to service_role;

set local role service_role;

do $$
declare
  v_title constant text := 'What landlords check in a lease';
  v_excerpt constant text :=
    'A plain guide for landlords on what to check in a lease before it is signed, one step at a time.';
  v_meta constant text :=
    'What landlords should check in a lease before signing it, in plain steps.';
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

  -- An UPDATE of a published post: not gated.
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

insert into replay_blog
select 'trigger', jsonb_build_object(
  'function', t.tgfoid::regprocedure::text,
  'type', t.tgtype,
  'enabled', t.tgenabled::text)
from pg_trigger t
where t.tgrelid = 'public.blogs'::regclass and t.tgname = 'validate_blog_post_trigger';

select jsonb_object_agg(label, payload)::text from replay_blog;

rollback;
