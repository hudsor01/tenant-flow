-- migration: backfill_public_users
-- purpose: ensure every auth.users row has a matching public.users row
-- context: public.users was found empty in production, causing FK violations
--          on properties.owner_user_id_fkey when creating properties.
--          The ensure_public_user_for_auth trigger only fires on INSERT,
--          so existing auth users that predate the trigger (or survived a
--          table truncation) need to be backfilled.

INSERT INTO public.users (id, email, full_name, user_type)
SELECT
  a.id,
  coalesce(nullif(a.email, ''), a.raw_user_meta_data ->> 'email', 'unknown@example.com'),
  coalesce(
    nullif(a.raw_user_meta_data ->> 'full_name', ''),
    nullif(a.raw_user_meta_data ->> 'name', ''),
    a.email,
    'Unknown User'
  ),
  upper(coalesce(
    nullif(a.raw_app_meta_data ->> 'user_type', ''),
    CASE
      WHEN coalesce(a.raw_app_meta_data ->> 'provider', 'email') = 'google' THEN 'PENDING'
      ELSE 'OWNER'
    END
  ))
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;
