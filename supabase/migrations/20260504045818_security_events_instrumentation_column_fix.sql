-- F-9 follow-up: fix bad column references in the F-9 instrumentation
-- functions. The previous migration referenced `NEW.property_name` and
-- `NEW.address`, but the properties table actually has `name` and
-- `address_line1`/`city`/`state`/`postal_code`. Without this fix, every
-- INSERT/UPDATE on public.properties would error.

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
