-- F-9 follow-up: redundant since the parent migration 20260504045719 was
-- corrected in place to use the right column names. This file is preserved
-- because it was applied to prod via Supabase MCP (recorded in pg_migrations);
-- removing the local file would diverge the repo from the live migration
-- history. Its CREATE OR REPLACE statements are now no-ops — they overwrite
-- the (already-correct) function bodies with the same content.
--
-- For fresh `db reset` runs: 20260504045719 now installs the correct
-- functions on the first pass, and this file's CREATE OR REPLACE on the
-- second pass produces no observable change. Both orderings end identically.
--
-- Original rationale (kept for context): the parent migration referenced
-- `NEW.property_name` and `NEW.address`, but the properties table actually
-- has `name` and `address_line1`/`city`/`state`/`postal_code`. Discovered
-- during a test INSERT immediately after applying 20260504045719 — the
-- INSERT errored at trigger fire time (`record "new" has no field
-- "property_name"`).

CREATE OR REPLACE FUNCTION public.log_security_event_property_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, message, resource_type, resource_id, metadata
  )
  VALUES (
    'property.created',
    'info',
    NEW.owner_user_id,
    'Property created',
    'property',
    NEW.id,
    jsonb_build_object(
      'name',          NEW.name,
      'property_type', NEW.property_type,
      'address_line1', NEW.address_line1,
      'city',          NEW.city,
      'state',         NEW.state
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event_property_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'inactive' AND OLD.status IS DISTINCT FROM 'inactive' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'property.deleted',
      'warning',
      NEW.owner_user_id,
      'Property soft-deleted',
      'property',
      NEW.id,
      jsonb_build_object(
        'name',            NEW.name,
        'previous_status', OLD.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
