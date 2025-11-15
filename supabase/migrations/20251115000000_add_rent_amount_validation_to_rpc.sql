-- Migration: Add rent amount validation to create_tenant_with_lease RPC
-- Description: Validates rent amount is positive before inserting lease record
-- Prevents check constraint violations on rent_amount_positive

CREATE OR REPLACE FUNCTION public.create_tenant_with_lease(
  -- Owner parameters
  p_owner_id uuid,

  -- Tenant parameters
  p_tenant_email text,
  p_tenant_first_name text,
  p_tenant_last_name text,

  -- Lease parameters
  p_property_id uuid,
  p_rent_amount integer, -- In cents
  p_security_deposit integer, -- In cents
  p_start_date date,
  p_end_date date,

  -- Optional parameters (MUST be last)
  p_tenant_phone text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
  v_tenant_record record;
  v_lease_record record;
  v_result json;
BEGIN
  -- Validate rent amount is positive (prevent constraint violation)
  IF p_rent_amount IS NULL OR p_rent_amount <= 0 THEN
    RAISE EXCEPTION 'Rent amount must be greater than zero';
  END IF;

  -- Validate security deposit is non-negative
  IF p_security_deposit IS NOT NULL AND p_security_deposit < 0 THEN
    RAISE EXCEPTION 'Security deposit cannot be negative';
  END IF;

  -- Validate owner exists and owns the property
  IF NOT EXISTS (
    SELECT 1 FROM public.property
    WHERE id = p_property_id
    AND "userId" = p_owner_id
  ) THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;

  -- Validate unit belongs to property (if unit specified)
  IF p_unit_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.unit
      WHERE id = p_unit_id
      AND "propertyId" = p_property_id
    ) THEN
      RAISE EXCEPTION 'Unit not found or does not belong to property';
    END IF;
  END IF;

  -- Validate email uniqueness (check existing tenants for this owner)
  IF EXISTS (
    SELECT 1 FROM public.tenant
    WHERE email = LOWER(p_tenant_email)
    AND "userId" = p_owner_id
  ) THEN
    RAISE EXCEPTION 'Tenant with this email already exists';
  END IF;

  -- Create tenant record
  INSERT INTO public.tenant (
    email,
    "firstName",
    "lastName",
    phone,
    "userId",
    status,
    invitation_status,
    created_at,
    updated_at
  )
  VALUES (
    LOWER(p_tenant_email),
    p_tenant_first_name,
    p_tenant_last_name,
    p_tenant_phone,
    p_owner_id,
    'PENDING'::"TenantStatus",
    'PENDING'::invitation_status,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_tenant_record;

  -- Create lease record
  INSERT INTO public.lease (
    "tenantId",
    "propertyId",
    "unitId",
    "rentAmount",
    "securityDeposit",
    "startDate",
    "endDate",
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_tenant_record.id,
    p_property_id,
    p_unit_id,
    p_rent_amount,
    p_security_deposit,
    p_start_date,
    p_end_date,
    'DRAFT'::"LeaseStatus",
    NOW(),
    NOW()
  )
  RETURNING * INTO v_lease_record;

  -- Build JSON result
  v_result := json_build_object(
    'tenant', row_to_json(v_tenant_record),
    'lease', row_to_json(v_lease_record)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE EXCEPTION 'Failed to create tenant with lease: %', SQLERRM;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION public.create_tenant_with_lease IS
'Atomically creates a tenant and associated lease record in a single transaction.
Validates rent amount is positive to prevent constraint violations.
Used by simplified tenant invitation workflow to replace multi-step saga pattern.';
