-- Prevent self-signup: require invites for tenant onboarding
--
-- This migration adds a BEFORE INSERT trigger on auth.users that rejects
-- any unauthorised creation of auth users from the anon/regular client.
-- Only requests executed with service_role (backend/admin) or users created
-- that include an 'invited_by' entry in their raw_user_meta_data are allowed.
-- This enforces the invite-only tenant onboarding policy: tenants must be
-- created by an OWNER via the admin/service role (admin.createUser) which
-- sets user_metadata.invited_by, or else the insert is rejected.

-- NOTE: This is intentionally conservative. Service role operations (the
-- backend) may create users (invitations). Regular client signups without
-- invitation metadata will be blocked.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_auth_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_invited_by TEXT;
BEGIN
    -- Determine caller role from JWT claims. This will be 'service_role' for
    -- admin/server-side operations performed with the service key.
    v_caller_role := current_setting('request.jwt.claim.role', true);

    -- Extract invited_by from incoming user metadata if present
    IF NEW.raw_user_meta_data IS NOT NULL THEN
        BEGIN
            v_invited_by := (NEW.raw_user_meta_data->>'invited_by');
        EXCEPTION WHEN OTHERS THEN
            v_invited_by := NULL;
        END;
    ELSE
        v_invited_by := NULL;
    END IF;

    -- Allow creation when performed by the service role (admin/backend)
    IF v_caller_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Disallow unauthorised creations from anon/authenticated clients
    -- unless the user was explicitly invited (invited_by present).
    IF v_invited_by IS NULL OR v_invited_by = '' THEN
        RAISE EXCEPTION 'Self-signup disabled: accounts must be invited by an OWNER';
    END IF;

    RETURN NEW;
END;
$$;

-- Install trigger on auth.users
DROP TRIGGER IF EXISTS prevent_unauthorized_user_creation ON auth.users;
CREATE TRIGGER prevent_unauthorized_user_creation
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_auth_user_creation();
