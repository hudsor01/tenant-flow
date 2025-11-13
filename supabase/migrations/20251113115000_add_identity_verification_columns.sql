-- Add identity verification audit fields to the users table.
-- These columns store Stripe Identity session metadata so the backend can
-- replay verification status and surface the state to the onboarding UI.
BEGIN;
ALTER TABLE public.users
    ADD COLUMN identity_verification_session_id TEXT,
    ADD COLUMN identity_verification_status TEXT,
    ADD COLUMN identity_verified_at TIMESTAMPTZ,
    ADD COLUMN identity_verification_data JSONB,
    ADD COLUMN identity_verification_error TEXT;
COMMIT;
