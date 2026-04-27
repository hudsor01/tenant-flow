-- v2.6 Phase 65: Custom Categories — Schema + Read Path
--
-- Replaces the compile-time DOCUMENT_CATEGORIES tuple (Phase 61 CHECK
-- constraint) with a per-owner `document_categories` table. Existing
-- users get the seven v2.5 categories seeded as is_default=true so
-- the read path stays a no-op for landlords who never customize.
-- documents.document_type becomes a soft FK (text column referencing
-- document_categories.slug, owner-scoped) validated by a BEFORE
-- INSERT/UPDATE trigger that replaces the dropped CHECK.

-- 1. Table + constraints
create table public.document_categories (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references public.users(id) on delete cascade,
    slug text not null,
    label text not null,
    sort_order integer not null default 0,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint document_categories_owner_slug_key unique (owner_user_id, slug),
    constraint document_categories_slug_format check (slug ~ '^[a-z0-9_]+$' and length(slug) between 1 and 50),
    constraint document_categories_label_length check (length(trim(label)) between 1 and 80)
);

create index document_categories_owner_idx on public.document_categories (owner_user_id, sort_order);

-- 2. RLS — owner-scoped, one policy per operation
alter table public.document_categories enable row level security;

create policy "owners select own categories"
    on public.document_categories for select to authenticated
    using (owner_user_id = (select auth.uid()));

create policy "owners insert own categories"
    on public.document_categories for insert to authenticated
    with check (owner_user_id = (select auth.uid()));

create policy "owners update own categories"
    on public.document_categories for update to authenticated
    using (owner_user_id = (select auth.uid()))
    with check (owner_user_id = (select auth.uid()));

create policy "owners delete own categories"
    on public.document_categories for delete to authenticated
    using (owner_user_id = (select auth.uid()));

-- 3. updated_at trigger (canonical helper from earlier consolidation migration)
create trigger set_updated_at_document_categories
    before update on public.document_categories
    for each row execute function public.set_updated_at();

-- 4. Idempotent seed function — ON CONFLICT DO NOTHING preserves any user-edited
-- labels for an owner who's already been seeded once.
create or replace function public.seed_default_document_categories(p_owner_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.document_categories (owner_user_id, slug, label, sort_order, is_default)
    values
        (p_owner_user_id, 'lease', 'Lease', 10, true),
        (p_owner_user_id, 'receipt', 'Receipt', 20, true),
        (p_owner_user_id, 'tax_return', 'Tax return', 30, true),
        (p_owner_user_id, 'inspection_report', 'Inspection report', 40, true),
        (p_owner_user_id, 'maintenance_invoice', 'Maintenance invoice', 50, true),
        (p_owner_user_id, 'insurance', 'Insurance', 60, true),
        (p_owner_user_id, 'other', 'Other', 70, true)
    on conflict (owner_user_id, slug) do nothing;
end;
$$;

revoke all on function public.seed_default_document_categories(uuid) from public, anon, authenticated;

-- 5. Backfill every existing user so the read path returns the seven defaults
-- on Day 1, BEFORE the CHECK constraint drop below loses the DB-level guard.
do $$
declare
    u record;
begin
    for u in select id from public.users loop
        perform public.seed_default_document_categories(u.id);
    end loop;
end;
$$;

-- 6. Auto-seed for new users created via the existing auth/users sync trigger.
create or replace function public.handle_new_user_seed_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.seed_default_document_categories(NEW.id);
    return NEW;
end;
$$;

create trigger seed_default_categories_on_user_insert
    after insert on public.users
    for each row execute function public.handle_new_user_seed_categories();

-- 7. Slug validation trigger — replaces the dropped CHECK constraint with a
-- per-owner taxonomy lookup. Validates BEFORE INSERT and BEFORE UPDATE of
-- the slug-bearing columns. SECURITY DEFINER so the lookup isn't blocked
-- by document_categories' RLS on cross-owner edge cases (admin tooling).
create or replace function public.validate_document_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.document_type is null then
        return NEW;
    end if;
    if not exists (
        select 1 from public.document_categories
        where owner_user_id = NEW.owner_user_id
          and slug = NEW.document_type
    ) then
        raise exception 'document_type % is not a valid category for owner %', NEW.document_type, NEW.owner_user_id
            using errcode = '23514';
    end if;
    return NEW;
end;
$$;

create trigger documents_validate_document_category
    before insert or update of document_type, owner_user_id on public.documents
    for each row execute function public.validate_document_category();

-- 8. Drop the old CHECK constraint — superseded by the validation trigger.
alter table public.documents drop constraint if exists documents_document_type_check;

comment on table public.document_categories is
    'Per-owner document taxonomy. Phase 65 replaces the compile-time DOCUMENT_CATEGORIES tuple with this table; documents.document_type is a soft FK (slug lookup, validated by trigger).';
