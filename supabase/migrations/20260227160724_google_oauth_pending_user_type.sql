-- migration: google_oauth_pending_user_type
-- purpose: change default user_type for Google OAuth signups from 'TENANT' to 'PENDING'
-- affected: ensure_public_user_for_auth trigger function, users table CHECK constraint
-- rationale: first-time Google OAuth users need to choose their role (owner vs tenant)
--            before being routed to a dashboard. 'PENDING' signals that role selection
--            is required. existing behavior for email signups with explicit user_type
--            metadata (e.g. accept-invite flow) is preserved.

-- step 1: update the CHECK constraint on users.user_type to allow 'PENDING'
-- the existing constraint (if any) needs to include the new value
alter table public.users drop constraint if exists users_user_type_check;
alter table public.users add constraint users_user_type_check
  check (user_type in ('OWNER', 'MANAGER', 'TENANT', 'ADMIN', 'PENDING'));

-- step 2: update the trigger function to set PENDING for Google OAuth users
-- when no explicit user_type is provided in metadata
create or replace function public.ensure_public_user_for_auth() returns trigger
    language plpgsql
    security definer
    set search_path to ''
as $$
declare
  resolved_email text;
  resolved_full_name text;
  resolved_user_type text;
  explicit_user_type text;
  provider text;
begin
  resolved_email := coalesce(nullif(new.email, ''), new.raw_user_meta_data ->> 'email', 'unknown@example.com');
  resolved_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    resolved_email,
    'Unknown User'
  );

  -- check if user_type was explicitly set in signup metadata
  explicit_user_type := new.raw_user_meta_data ->> 'user_type';

  -- determine the auth provider from app_metadata
  provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');

  if explicit_user_type is not null and explicit_user_type <> '' then
    -- explicit user_type provided (e.g. accept-invite sets 'TENANT')
    resolved_user_type := upper(explicit_user_type);
  elsif provider = 'google' then
    -- google oauth without explicit user_type: set to PENDING for role selection
    resolved_user_type := 'PENDING';
  else
    -- email signup without explicit user_type: default to OWNER
    -- (owners sign up via pricing/checkout flow which doesn't set user_type in metadata)
    resolved_user_type := 'OWNER';
  end if;

  insert into public.users as u (id, email, full_name, user_type)
  values (new.id, resolved_email, resolved_full_name, resolved_user_type)
  on conflict (id) do update
    set email = coalesce(excluded.email, u.email),
        full_name = coalesce(nullif(excluded.full_name, ''), u.full_name),
        user_type = coalesce(nullif(excluded.user_type, ''), u.user_type),
        updated_at = now();

  return new;
end;
$$;

-- step 3: update custom_access_token_hook to handle PENDING user_type
-- when user_type is PENDING, include it in the JWT so the frontend can detect it
-- and redirect to the role selection page
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
    language plpgsql
    stable security definer
    set search_path to ''
as $$
declare
  claims jsonb;
  auth_user_type text;
  auth_stripe_customer_id text;
  public_user_type text;
  public_stripe_customer_id text;
  final_user_type text;
  final_stripe_customer_id text;
begin
  claims := event -> 'claims';

  select raw_app_meta_data ->> 'user_type',
         raw_app_meta_data ->> 'stripe_customer_id'
  into auth_user_type, auth_stripe_customer_id
  from auth.users
  where id = (event ->> 'user_id')::uuid;

  select u.user_type, u.stripe_customer_id
  into public_user_type, public_stripe_customer_id
  from public.users u
  where u.id = (event ->> 'user_id')::uuid;

  -- priority: auth.users.raw_app_meta_data > public.users > event user_metadata > default
  -- PENDING is a valid user_type that signals role selection is needed
  final_user_type := upper(coalesce(
    auth_user_type,
    public_user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  final_stripe_customer_id := coalesce(
    auth_stripe_customer_id,
    public_stripe_customer_id,
    event -> 'user' -> 'user_metadata' ->> 'stripe_customer_id'
  );

  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(final_user_type));

  if final_stripe_customer_id is not null then
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(final_stripe_customer_id));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Custom access token hook that reads user_type from auth.users.raw_app_meta_data (primary, server-only editable) with fallback to public.users. Adds user_type and stripe_customer_id to JWT claims. PENDING user_type indicates role selection is needed.';
