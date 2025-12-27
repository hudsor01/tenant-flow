-- Add helper for resolving current owner user id
-- Keeps RLS policies and SECURITY DEFINER functions consistent with owner_user_id columns.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_owner_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_table text;
BEGIN
  IF to_regclass('public.stripe_connected_accounts') IS NOT NULL THEN
    v_table := 'public.stripe_connected_accounts';
  ELSIF to_regclass('public.property_owners') IS NOT NULL THEN
    v_table := 'public.property_owners';
  ELSE
    RETURN NULL;
  END IF;

  EXECUTE format(
    'SELECT user_id FROM %s WHERE user_id = auth.uid()',
    v_table
  )
  INTO v_user_id;

  RETURN v_user_id;
END;
$function$;

ALTER FUNCTION public.get_current_owner_user_id() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_current_owner_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_owner_user_id() TO authenticated;

COMMIT;
