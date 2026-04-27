-- v2.6 Phase 65 Followups (cycle-1 review fixes)
--
-- C-1: validate_document_category() trigger raised 23514 on every UPDATE
--      that nulled owner_user_id (e.g. an `ON DELETE SET NULL` cascade
--      from auth.users). The slug lookup `where owner_user_id = NULL`
--      always returned no rows, blocking the cascade. Short-circuit on
--      NULL owner_user_id so cascades pass through.
-- M-3: revoke EXECUTE on the remaining SECURITY DEFINER trigger funcs for
--      parity with `seed_default_document_categories` — they're attached as
--      triggers so client code can't call them anyway, but the asymmetry
--      stood out in review.

begin;

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
            using errcode = '23514';
    end if;
    return NEW;
end;
$$;

revoke all on function public.validate_document_category() from public, anon, authenticated;
revoke all on function public.handle_new_user_seed_categories() from public, anon, authenticated;

commit;
