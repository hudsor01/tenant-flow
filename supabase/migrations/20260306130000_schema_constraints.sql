-- =============================================================================
-- migration: schema_constraints
-- purpose: DB-01, DB-10, DB-11 -- add missing constraints and columns
-- affected tables: activity, inspection_photos, blogs
-- description:
--   DB-01: activity.user_id NOT NULL + ON DELETE CASCADE FK
--   DB-10: inspection_photos gets updated_at column with set_updated_at trigger
--   DB-11: blogs gets author_user_id column with FK to auth.users + index
-- =============================================================================

-- -------------------------------------------------------------------------
-- DB-01: activity.user_id NOT NULL + FK fix
-- -------------------------------------------------------------------------
-- activity records are per-user audit trail. ON DELETE CASCADE is correct
-- because activity is meaningless without its user. GDPR anonymization
-- (DB-04) will handle data cleanup before user deletion.

-- step 1: delete orphaned activity rows where user_id IS NULL
-- these were created by ON DELETE SET NULL when users were deleted
delete from public.activity where user_id is null;

-- step 2: drop the existing FK constraint on activity.user_id
-- the current FK uses ON DELETE SET NULL which we are replacing with CASCADE
do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name into v_constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  where tc.table_name = 'activity'
    and tc.table_schema = 'public'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id';

  if v_constraint_name is not null then
    execute format('alter table public.activity drop constraint %I', v_constraint_name);
    raise notice 'dropped FK constraint: %', v_constraint_name;
  else
    raise notice 'no FK constraint found on activity.user_id -- skipping drop';
  end if;
end;
$$;

-- step 3: add new FK with ON DELETE CASCADE
alter table public.activity
  add constraint activity_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- step 4: add NOT NULL constraint (safe now that orphaned rows are deleted)
alter table public.activity
  alter column user_id set not null;

-- -------------------------------------------------------------------------
-- DB-10: inspection_photos updated_at column + trigger
-- -------------------------------------------------------------------------
-- inspection_photos has created_at but no updated_at. Adding updated_at
-- with the canonical set_updated_at() trigger for consistency.

alter table public.inspection_photos
  add column if not exists updated_at timestamptz default now() not null;

-- add trigger using the canonical set_updated_at() function (consolidated in DB-12)
-- drop first in case it already exists (idempotent)
drop trigger if exists set_updated_at on public.inspection_photos;
create trigger set_updated_at
  before update on public.inspection_photos
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- DB-11: blogs author_user_id column
-- -------------------------------------------------------------------------
-- audit trail column for blog authorship. ON DELETE SET NULL is correct
-- because blog content should survive author account deletion.
-- NOT NULL is not added since existing rows have no author.

alter table public.blogs
  add column if not exists author_user_id uuid
  references auth.users(id) on delete set null;

-- index for efficient lookups by author
create index if not exists idx_blogs_author_user_id
  on public.blogs(author_user_id);

-- =============================================================================
-- verification queries (run manually to confirm):
--
-- DB-01 verify:
--   select count(*) from public.activity where user_id is null;
--   expected: 0
--   select conname, confdeltype from pg_constraint where conrelid = 'public.activity'::regclass and conname = 'activity_user_id_fkey';
--   expected: confdeltype = 'c' (cascade)
--
-- DB-10 verify:
--   select column_name, data_type from information_schema.columns where table_name = 'inspection_photos' and column_name = 'updated_at';
--   expected: 1 row
--
-- DB-11 verify:
--   select column_name, data_type from information_schema.columns where table_name = 'blogs' and column_name = 'author_user_id';
--   expected: 1 row
--   select indexname from pg_indexes where tablename = 'blogs' and indexname = 'idx_blogs_author_user_id';
--   expected: 1 row
-- =============================================================================
