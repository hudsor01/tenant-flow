-- Migration: Deprecate V1 invitation fields (custom token flow)
-- Date: 2025-10-28
-- Purpose: Mark V1 invitation fields as deprecated in favor of Supabase Auth (V2)
--
-- Context:
-- - V1 used custom invitation_token with 7-day expiry
-- - V2 uses Supabase Auth's native invitation system
-- - V1 backend endpoints and service methods have been removed
-- - Frontend now uses only V2 flow (sendInvitationV2)
--
-- Fields being deprecated (kept for data migration/cleanup later):
-- - invitation_token (varchar(255))
-- - invitation_sent_at (timestamptz)
-- - invitation_expires_at (timestamptz)
-- - invitation_accepted_at (timestamptz)
--
-- NOTE: These fields are NOT being dropped yet to allow for:
-- 1. Data migration of any tenants with pending V1 invitations
-- 2. Historical audit trail
-- 3. Gradual rollout and testing of V2
--
-- Future migration will remove these fields entirely once confirmed
-- all tenants have migrated to V2 (auth_user_id is set).

-- Add comments to document deprecation
COMMENT ON COLUMN tenant.invitation_token IS
  'DEPRECATED: Used by V1 custom invitation flow.
   Replaced by Supabase Auth invitation system (V2).
   Will be removed in future migration.';

COMMENT ON COLUMN tenant.invitation_sent_at IS
  'DEPRECATED: Used by V1 custom invitation flow.
   Replaced by Supabase Auth invitation system (V2).
   Will be removed in future migration.';

COMMENT ON COLUMN tenant.invitation_expires_at IS
  'DEPRECATED: Used by V1 custom invitation flow.
   Replaced by Supabase Auth invitation system (V2).
   Will be removed in future migration.';

COMMENT ON COLUMN tenant.invitation_accepted_at IS
  'DEPRECATED: Used by V1 custom invitation flow.
   Replaced by Supabase Auth invitation system (V2).
   Will be removed in future migration.';

-- The invitation_status enum is still used by V2, so it remains active
COMMENT ON COLUMN tenant.invitation_status IS
  'Invitation status: PENDING (not sent), SENT (email sent), ACCEPTED (tenant activated).
   Used by V2 Supabase Auth invitation system.
   Values: PENDING | SENT | ACCEPTED | EXPIRED | REVOKED';

-- The auth_user_id is the primary V2 field
COMMENT ON COLUMN tenant.auth_user_id IS
  'Supabase Auth user ID. Links tenant record to auth.users table.
   Set by V2 invitation flow (sendInvitationV2).
   NULL means tenant has not been invited yet.';
