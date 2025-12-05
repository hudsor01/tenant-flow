-- Ensure public.users exists for every auth user and keep Stripe/user_type claims in sync

-- 1) Upsert a stub public.users row for every auth.users insert
CREATE OR REPLACE FUNCTION public.ensure_public_user_for_auth() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  resolved_email text;
  resolved_full_name text;
  resolved_user_type text;
BEGIN
  resolved_email := COALESCE(NULLIF(NEW.email, ''), NEW.raw_user_meta_data ->> 'email', 'unknown@example.com');
  resolved_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    resolved_email,
    'Unknown User'
  );
  resolved_user_type := UPPER(COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'user_type', ''), 'TENANT'));

  INSERT INTO public.users AS u (id, email, full_name, user_type)
  VALUES (NEW.id, resolved_email, resolved_full_name, resolved_user_type)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, u.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), u.full_name),
        user_type = COALESCE(NULLIF(EXCLUDED.user_type, ''), u.user_type),
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_public_user_trigger ON auth.users;

CREATE TRIGGER ensure_public_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_public_user_for_auth();


-- 2) Keep auth.users.raw_app_meta_data and tenants in sync with public.users changes
CREATE OR REPLACE FUNCTION public.sync_user_type_to_auth() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  user_type_changed boolean := FALSE;
  stripe_changed boolean := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    user_type_changed := TRUE;
    stripe_changed := TRUE;
  ELSE
    user_type_changed := NEW.user_type IS DISTINCT FROM OLD.user_type;
    stripe_changed := NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id;
  END IF;

  IF user_type_changed OR stripe_changed THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
      || CASE WHEN user_type_changed THEN jsonb_build_object('user_type', NEW.user_type) ELSE '{}'::jsonb END
      || CASE WHEN stripe_changed THEN jsonb_build_object('stripe_customer_id', NEW.stripe_customer_id) ELSE '{}'::jsonb END
    WHERE id = NEW.id;
  END IF;

  IF stripe_changed THEN
    UPDATE public.tenants
    SET stripe_customer_id = NEW.stripe_customer_id
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_type_trigger ON public.users;

CREATE TRIGGER sync_user_type_trigger
AFTER INSERT OR UPDATE OF user_type, stripe_customer_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_type_to_auth();


-- 3) Prevent duplicate Stripe customers at the tenant layer (users already unique)
CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_customer_id_unique
  ON public.tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;


-- 4) Keep custom_access_token_hook in sync with raw_app_meta_data + public.users
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  claims jsonb;
  auth_user_type text;
  auth_stripe_customer_id text;
  public_user_type text;
  public_stripe_customer_id text;
  final_user_type text;
  final_stripe_customer_id text;
BEGIN
  claims := event -> 'claims';

  SELECT raw_app_meta_data ->> 'user_type',
         raw_app_meta_data ->> 'stripe_customer_id'
  INTO auth_user_type, auth_stripe_customer_id
  FROM auth.users
  WHERE id = (event ->> 'user_id')::uuid;

  SELECT u.user_type, u.stripe_customer_id
  INTO public_user_type, public_stripe_customer_id
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  final_user_type := UPPER(COALESCE(
    auth_user_type,
    public_user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  final_stripe_customer_id := COALESCE(
    auth_stripe_customer_id,
    public_stripe_customer_id,
    event -> 'user' -> 'user_metadata' ->> 'stripe_customer_id'
  );

  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(final_user_type));

  IF final_stripe_customer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(final_stripe_customer_id));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

