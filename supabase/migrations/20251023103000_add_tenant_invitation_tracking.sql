-- Add tenant invitation tracking columns
-- Purpose: Track invitation status, token, and timestamps for tenant onboarding flow
-- Usage: Called automatically via tenant service when sending invitations

-- Add invitation status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to tenant table
ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS invitation_status invitation_status DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS invitation_token text,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamp with time zone;

-- Add index for invitation token lookups (used during acceptance flow)
CREATE INDEX IF NOT EXISTS idx_tenant_invitation_token ON public.tenant(invitation_token) WHERE invitation_token IS NOT NULL;

-- Add index for invitation status queries
CREATE INDEX IF NOT EXISTS idx_tenant_invitation_status ON public.tenant(invitation_status);

-- Add comment for documentation
COMMENT ON COLUMN public.tenant.invitation_status IS 'Current status of tenant invitation (PENDING, SENT, ACCEPTED, EXPIRED, REVOKED)';
COMMENT ON COLUMN public.tenant.invitation_token IS 'Unique token for accepting invitation (32 chars, expires in 7 days)';
COMMENT ON COLUMN public.tenant.invitation_sent_at IS 'Timestamp when invitation email was sent';
COMMENT ON COLUMN public.tenant.invitation_accepted_at IS 'Timestamp when tenant accepted invitation and created account';
COMMENT ON COLUMN public.tenant.invitation_expires_at IS 'Timestamp when invitation expires (7 days from sent_at)';
