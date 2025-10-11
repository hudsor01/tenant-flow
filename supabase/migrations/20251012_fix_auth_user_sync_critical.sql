-- ============================================================================
-- CRITICAL AUTH FIX: Apply handle_new_user trigger and sync existing users
-- ============================================================================
-- ISSUE: handle_new_user trigger was never applied, causing 72 auth.users
--        to NOT be synced to public.users table
--
-- This migration:
-- 1. Creates/updates handle_new_user() function
-- 2. Attaches trigger to auth.users
-- 3. Backfills 72 missing users to public.users
-- 4. Ensures future auth.users automatically sync
-- ============================================================================

-- 1. CREATE OR REPLACE THE HANDLE_NEW_USER FUNCTION
-- This function syncs auth.users → public.users and public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Insert into profiles table (legacy, keep for backward compatibility)
    INSERT INTO public.profiles (id, email, full_name, company, "updatedAt")
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
        new.raw_user_meta_data->>'company',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        company = COALESCE(EXCLUDED.company, profiles.company),
        "updatedAt" = NOW();

    -- Sync with users table using correct schema
    INSERT INTO users (
        id,
        "supabaseId",
        email,
        role,
        "firstName",
        "lastName",
        "createdAt",
        "updatedAt"
    )
    VALUES (
        gen_random_uuid()::text,  -- Generate new UUID for users.id
        new.id::text,              -- Use auth.users.id as supabaseId (cast to text)
        new.email,
        'OWNER',                   -- Default role
        new.raw_user_meta_data->>'firstName',
        new.raw_user_meta_data->>'lastName',
        NOW(),
        NOW()
    )
    ON CONFLICT ("supabaseId") DO UPDATE SET
        email = EXCLUDED.email,
        "firstName" = COALESCE(EXCLUDED."firstName", users."firstName"),
        "lastName" = COALESCE(EXCLUDED."lastName", users."lastName"),
        "updatedAt" = NOW();

    RETURN new;
END;
$$;

-- 2. ATTACH TRIGGER TO AUTH.USERS TABLE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 3. BACKFILL EXISTING AUTH USERS TO PUBLIC.USERS
-- This syncs the 72 users that were created before the trigger existed
DO $$
DECLARE
    missing_user RECORD;
    users_synced INTEGER := 0;
BEGIN
    -- Loop through all auth.users not in public.users
    FOR missing_user IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id::text = pu."supabaseId"
        WHERE pu."supabaseId" IS NULL
    LOOP
        -- Insert into profiles (legacy)
        INSERT INTO public.profiles (id, email, full_name, company, "updatedAt")
        VALUES (
            missing_user.id,
            missing_user.email,
            COALESCE(
                missing_user.raw_user_meta_data->>'full_name',
                missing_user.raw_user_meta_data->>'name'
            ),
            missing_user.raw_user_meta_data->>'company',
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        -- Insert into users table
        -- Use ON CONFLICT (email) to handle existing users created manually
        INSERT INTO public.users (
            id,
            "supabaseId",
            email,
            role,
            "firstName",
            "lastName",
            "createdAt",
            "updatedAt"
        )
        VALUES (
            gen_random_uuid()::text,
            missing_user.id::text,
            missing_user.email,
            'OWNER',
            missing_user.raw_user_meta_data->>'firstName',
            missing_user.raw_user_meta_data->>'lastName',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            "supabaseId" = EXCLUDED."supabaseId",
            "firstName" = COALESCE(EXCLUDED."firstName", users."firstName"),
            "lastName" = COALESCE(EXCLUDED."lastName", users."lastName"),
            "updatedAt" = NOW();

        users_synced := users_synced + 1;
    END LOOP;

    RAISE NOTICE 'Backfilled % users from auth.users to public.users', users_synced;
END $$;

-- 4. VERIFY SYNC IS COMPLETE
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    missing_count INTEGER;
BEGIN
    SELECT count(*) INTO auth_count FROM auth.users;
    SELECT count(*) INTO public_count FROM public.users;

    SELECT count(*) INTO missing_count
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id::text = pu."supabaseId"
    WHERE pu."supabaseId" IS NULL;

    RAISE NOTICE 'Auth Users: %, Public Users: %, Missing: %',
        auth_count, public_count, missing_count;

    IF missing_count > 0 THEN
        RAISE WARNING 'Still have % users not synced! Manual investigation needed.', missing_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All auth.users are now synced to public.users!';
    END IF;
END $$;

-- 5. LOG TO AUDIT TABLE
-- Note: Audit logging removed as table structure needs verification
