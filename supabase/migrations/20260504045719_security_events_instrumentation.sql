-- F-9: security_events instrumentation.
-- The audit found public.security_events had 0 rows in prod despite a complete
-- schema with event_type and severity CHECK constraints. This migration adds
-- the first instrumentation pass: triggers for property.created/deleted and
-- lease.signed, and an explicit insert in anonymize_deleted_user for user.deleted.
--
-- Conservative scope: only instrument the events for which we have a clear
-- semantic owner and a single firing path. Auth-side events (login/logout) are
-- out of scope because they require a Supabase Auth Hook expansion that is a
-- separate decision. Admin viewing UI is also out of scope — once data exists,
-- a reader RPC can be added without further migrations.

-- ============================================================================
-- 1. property.created — AFTER INSERT trigger on public.properties
-- ============================================================================
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

DROP TRIGGER IF EXISTS trg_security_property_created ON public.properties;
CREATE TRIGGER trg_security_property_created
AFTER INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.log_security_event_property_created();

-- ============================================================================
-- 2. property.deleted — AFTER UPDATE trigger on public.properties (soft-delete)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_security_event_property_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status transitions TO 'inactive' (the soft-delete sentinel).
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

DROP TRIGGER IF EXISTS trg_security_property_deleted ON public.properties;
CREATE TRIGGER trg_security_property_deleted
AFTER UPDATE OF status ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.log_security_event_property_deleted();

-- ============================================================================
-- 3. lease.signed — AFTER UPDATE trigger on public.leases (lease_status -> active)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_security_event_lease_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fires on the canonical activation transition. Source path is irrelevant —
  -- whether activation came from the docuseal-webhook, sign_lease_and_check_activation,
  -- or activate_lease_with_pending_subscription, this captures it once.
  IF NEW.lease_status = 'active'
     AND OLD.lease_status IS DISTINCT FROM 'active' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'lease.signed',
      'info',
      NEW.owner_user_id,
      'Lease activated (all parties signed)',
      'lease',
      NEW.id,
      jsonb_build_object(
        'unit_id',                   NEW.unit_id,
        'previous_status',           OLD.lease_status,
        'docuseal_submission_id',    NEW.docuseal_submission_id,
        'has_signed_document_url',   NEW.docuseal_document_url IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_lease_signed ON public.leases;
CREATE TRIGGER trg_security_lease_signed
AFTER UPDATE OF lease_status ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.log_security_event_lease_signed();

-- ============================================================================
-- 4. user.deleted — recorded via trigger on public.users post-anonymization
-- ============================================================================
-- Detects the anonymization signature applied by anonymize_deleted_user(uuid):
-- full_name is set to '[deleted user]' and email is rewritten to start with
-- '[deleted-'. We intentionally don't edit anonymize_deleted_user — the trigger
-- captures the same event at the same boundary and avoids RPC behavior drift.

CREATE OR REPLACE FUNCTION public.log_security_event_user_anonymized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.full_name = '[deleted user]'
     AND NEW.email LIKE '[deleted-%'
     AND COALESCE(OLD.full_name, '') <> '[deleted user]' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'user.deleted',
      'critical',
      NEW.id,
      'User account anonymized (GDPR)',
      'user',
      NEW.id,
      jsonb_build_object(
        'deletion_requested_at', OLD.deletion_requested_at,
        'anonymized_at',         NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_user_anonymized ON public.users;
CREATE TRIGGER trg_security_user_anonymized
AFTER UPDATE OF full_name, email ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.log_security_event_user_anonymized();

-- Document intent on each function for future maintenance.
COMMENT ON FUNCTION public.log_security_event_property_created()       IS 'F-9: writes property.created to security_events on AFTER INSERT trigger.';
COMMENT ON FUNCTION public.log_security_event_property_deleted()       IS 'F-9: writes property.deleted to security_events when status transitions to inactive.';
COMMENT ON FUNCTION public.log_security_event_lease_signed()           IS 'F-9: writes lease.signed to security_events when lease_status transitions to active.';
COMMENT ON FUNCTION public.log_security_event_user_anonymized()        IS 'F-9: writes user.deleted to security_events when anonymize_deleted_user(uuid) flips full_name to ''[deleted user]''.';
