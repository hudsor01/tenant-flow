-- MISC-04 (Phase 35): reconcile the repo copy of request_account_deletion to the
-- LIVE definition. The prior repo def (20260311210000_request_deletion_validate_owner.sql)
-- references dropped objects (users.user_type, public.rent_due), so a fresh `db reset`
-- would build a function that runtime-errors on the first owner call. Live is already
-- correct; this CREATE OR REPLACE on the unchanged () signature is an idempotent no-op
-- on prod and preserves existing ACLs (do not re-add grants).
CREATE OR REPLACE FUNCTION public.request_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$function$;
