-- Migration: Separate Tenant Invitation from Lease Creation
--
-- This migration implements the new architecture where:
-- 1. Tenant invitation is independent of lease creation
-- 2. Leases go through a signature workflow before becoming active
-- 3. Stripe billing only activates after both parties sign
--
-- New lease lifecycle: draft -> pending_signature -> active -> ended/terminated

BEGIN;

-- ============================================================================
-- STEP 1: Update lease_status constraint to support new workflow states
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.leases
  DROP CONSTRAINT IF EXISTS leases_lease_status_check;

-- Add new constraint with expanded states
ALTER TABLE public.leases
  ADD CONSTRAINT leases_lease_status_check
  CHECK (lease_status IN (
    'draft',              -- Owner creating/editing terms (no tenant visibility yet)
    'pending_signature',  -- Sent to tenant for review and signing
    'active',             -- Both parties signed, billing active
    'ended',              -- Natural end of lease term
    'terminated'          -- Early termination
  ));

COMMENT ON CONSTRAINT leases_lease_status_check ON public.leases IS
  'Lease workflow states: draft (owner editing) -> pending_signature (awaiting signatures) -> active (signed, billing on) -> ended/terminated';

-- ============================================================================
-- STEP 2: Add signature tracking columns to leases table
-- ============================================================================

-- Owner signature tracking
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_signature_ip TEXT;

-- Tenant signature tracking
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_signature_ip TEXT;

-- DocuSeal integration (for future e-signature integration)
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS docuseal_submission_id TEXT;

-- Track when lease was sent for signature
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS sent_for_signature_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.leases.owner_signed_at IS 'Timestamp when property owner signed the lease';
COMMENT ON COLUMN public.leases.owner_signature_ip IS 'IP address of owner at time of signing (for audit trail)';
COMMENT ON COLUMN public.leases.tenant_signed_at IS 'Timestamp when tenant signed the lease';
COMMENT ON COLUMN public.leases.tenant_signature_ip IS 'IP address of tenant at time of signing (for audit trail)';
COMMENT ON COLUMN public.leases.docuseal_submission_id IS 'DocuSeal submission ID for e-signature tracking';
COMMENT ON COLUMN public.leases.sent_for_signature_at IS 'Timestamp when lease was sent to tenant for signing';

-- ============================================================================
-- STEP 3: Make tenant_invitations.unit_id optional
-- Invitations can now exist without a lease/unit context
-- ============================================================================

ALTER TABLE public.tenant_invitations
  ALTER COLUMN unit_id DROP NOT NULL;

-- Add optional property_id for context (can invite to property without specific unit)
ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

-- Add lease_id to link invitation to specific lease (optional)
ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id);

COMMENT ON COLUMN public.tenant_invitations.unit_id IS 'Optional: specific unit for the invitation (NULL if inviting to platform only)';
COMMENT ON COLUMN public.tenant_invitations.property_id IS 'Optional: property context for the invitation';
COMMENT ON COLUMN public.tenant_invitations.lease_id IS 'Optional: specific lease this invitation is for (for lease signing invitations)';

-- ============================================================================
-- STEP 4: Update tenant_invitations status constraint
-- ============================================================================

ALTER TABLE public.tenant_invitations
  DROP CONSTRAINT IF EXISTS tenant_invitations_status_check;

ALTER TABLE public.tenant_invitations
  ADD CONSTRAINT tenant_invitations_status_check
  CHECK (status IN (
    'pending',    -- Created but not yet sent
    'sent',       -- Email sent to tenant
    'accepted',   -- Tenant accepted and created account
    'expired',    -- Invitation expired (past expires_at)
    'cancelled'   -- Owner cancelled the invitation
  ));

COMMENT ON CONSTRAINT tenant_invitations_status_check ON public.tenant_invitations IS
  'Invitation workflow: pending -> sent -> accepted/expired/cancelled';

-- ============================================================================
-- STEP 5: Add invitation_type to distinguish invitation purposes
-- ============================================================================

-- Create enum type for invitation purposes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_type') THEN
    CREATE TYPE invitation_type AS ENUM (
      'platform_access',   -- Just inviting to create account on platform
      'lease_signing'      -- Inviting to sign a specific lease
    );
  END IF;
END $$;

ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'platform_access';

-- Add constraint for type values
ALTER TABLE public.tenant_invitations
  ADD CONSTRAINT tenant_invitations_type_check
  CHECK (type IN ('platform_access', 'lease_signing'));

COMMENT ON COLUMN public.tenant_invitations.type IS 'Purpose of invitation: platform_access (join system) or lease_signing (sign specific lease)';

-- ============================================================================
-- STEP 6: Create index for common queries
-- ============================================================================

-- Index for finding leases by signature status
CREATE INDEX IF NOT EXISTS idx_leases_pending_signature
  ON public.leases(lease_status)
  WHERE lease_status = 'pending_signature';

CREATE INDEX IF NOT EXISTS idx_leases_draft
  ON public.leases(lease_status)
  WHERE lease_status = 'draft';

-- Index for finding invitations by type
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_type
  ON public.tenant_invitations(type);

-- Index for finding lease-related invitations
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_lease_id
  ON public.tenant_invitations(lease_id)
  WHERE lease_id IS NOT NULL;

-- ============================================================================
-- STEP 7: Update existing data to use new status values
-- ============================================================================

-- Migrate any 'pending' leases to 'draft' (they were never truly pending signature)
UPDATE public.leases
  SET lease_status = 'draft'
  WHERE lease_status = 'pending';

-- Ensure all existing 'active' leases have signature timestamps (backfill)
-- Set to created_at as a reasonable default for pre-existing leases
UPDATE public.leases
  SET
    owner_signed_at = COALESCE(owner_signed_at, created_at),
    tenant_signed_at = COALESCE(tenant_signed_at, created_at)
  WHERE lease_status = 'active'
    AND (owner_signed_at IS NULL OR tenant_signed_at IS NULL);

-- Set existing invitations to 'platform_access' type
UPDATE public.tenant_invitations
  SET type = 'platform_access'
  WHERE type IS NULL;

COMMIT;
