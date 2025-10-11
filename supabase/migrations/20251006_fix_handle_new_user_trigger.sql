-- Fix handle_new_user trigger to match actual User table schema
-- The trigger was using wrong field names causing "Database error creating new user"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Insert into profiles table (legacy, keep for backward compatibility)
    -- Note: profiles.updatedAt uses camelCase, not updated_at
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
    -- Required fields: id, supabaseId, email, role
    -- Optional fields: firstName, lastName, phone, bio, avatarUrl
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
        new.id,                    -- Use auth.users.id as supabaseId
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

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
