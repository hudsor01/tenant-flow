-- CRITICAL SECURITY FIX: Prevent privilege escalation in auth_sync_user_with_database
--
-- VULNERABILITY: The function allowed any authenticated user to:
-- 1. Create arbitrary OWNER accounts
-- 2. Overwrite other users' records
-- 3. Escalate their own privileges
--
-- FIX: Validate that p_supabase_id matches auth.uid() unless called by service_role

CREATE OR REPLACE FUNCTION auth_sync_user_with_database(
    p_supabase_id UUID,
    p_email TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_user_record users%ROWTYPE;
    v_caller_role TEXT;
BEGIN
    -- CRITICAL SECURITY CHECK: Ensure the caller can only sync their own account
    -- This prevents privilege escalation and unauthorized user manipulation
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the caller's role for service_role check
    v_caller_role := current_setting('request.jwt.claim.role', true);

    -- Only allow users to sync their own account, unless service_role
    IF p_supabase_id != auth.uid() THEN
        IF v_caller_role != 'service_role' THEN
            RAISE EXCEPTION 'Security violation: Unauthorized attempt to modify user % by user %',
                p_supabase_id, auth.uid();
        END IF;
    END IF;

    -- Validate email format
    IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- SECURITY: When users sync themselves, ALWAYS use TENANT role
    -- Only service_role can set other roles (for admin operations)
    INSERT INTO users (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        p_supabase_id,
        p_email,
        split_part(p_email, '@', 1), -- Default name from email
        CASE
            WHEN v_caller_role = 'service_role' THEN
                -- Service role can set initial OWNER for first user
                CASE
                    WHEN NOT EXISTS (SELECT 1 FROM users WHERE role = 'OWNER') THEN 'OWNER'
                    ELSE 'TENANT'
                END
            ELSE 'TENANT' -- Regular users ALWAYS get TENANT role
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
        -- Note: role is NOT updated on conflict to prevent privilege escalation
    RETURNING * INTO v_user_record;

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'user', row_to_json(v_user_record)::jsonb
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log security violations
        IF SQLERRM LIKE '%Security violation%' THEN
            RAISE WARNING 'Security violation detected: %', SQLERRM;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Update function comment
COMMENT ON FUNCTION auth_sync_user_with_database IS
'Securely syncs a user with the database. Users can only sync their own account unless called with service_role privileges. Regular users always get TENANT role to prevent privilege escalation.';

-- Add audit log for this security fix
INSERT INTO security_audit_log (
    event_type,
    severity,
    description,
    metadata
) VALUES (
    'security_fix',
    'critical',
    'Fixed privilege escalation vulnerability in auth_sync_user_with_database',
    jsonb_build_object(
        'vulnerability', 'Any authenticated user could create OWNER accounts or modify other users',
        'fix', 'Added auth.uid() validation and role restrictions',
        'migration', '20250918_fix_auth_sync_privilege_escalation.sql'
    )
) ON CONFLICT DO NOTHING;