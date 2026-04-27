-- v2.6 Phase 65 Followup 2 (cycle-3 review M-2)
--
-- validate_document_category()'s error message previously surfaced
-- only "is not a valid category for owner X" when the slug lookup
-- failed. That's accurate but unhelpful when the caller passed a
-- malformed slug ('TAX' or 'has-dash') — the slug regex on
-- document_categories.slug means a malformed value can NEVER appear
-- there, so the lookup ALWAYS returns no rows. Surface a format hint
-- via DETAIL so the user knows whether to fix the slug shape vs add
-- a custom category to their taxonomy.

create or replace function public.validate_document_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.document_type is null or NEW.owner_user_id is null then
        return NEW;
    end if;
    if not exists (
        select 1 from public.document_categories
        where owner_user_id = NEW.owner_user_id
          and slug = NEW.document_type
    ) then
        raise exception 'document_type % is not a valid category for owner %', NEW.document_type, NEW.owner_user_id
            using
                errcode = '23514',
                detail = 'Slugs must be lowercase-snake_case (matching ^[a-z0-9_]+$, 1-50 chars) AND exist in document_categories for this owner. Add the category via Phase-66 settings, or use one of the seven seeded defaults.';
    end if;
    return NEW;
end;
$$;
