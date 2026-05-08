-- Create lease-documents storage bucket for storing generated lease PDFs
-- File size limit: 512 KB (500 KB with safety margin)
-- Typical PDF size: 25-35 KB, Maximum realistic: 50-60 KB, Safety margin: 10x
--
-- ## Historical edit (2026-05-07, PR #677)
--
-- The original migration created three storage RLS policies on this
-- bucket. All three are gone in prod (cleaned up out-of-band) and the
-- bucket itself is unused — no app code reads or writes
-- `lease-documents` (lease PDFs are generated in-memory by the
-- `generate-pdf` Edge Function and returned to the caller; no Storage
-- saves).
--
-- One of the dropped policies, `Service can manage lease documents
-- FOR ALL TO authenticated`, is the exact shape that the
-- `for-all-audit` migration at 20260304130000 raises an exception
-- against ("Cannot proceed: % authenticated FOR ALL policies found").
-- Leaving the policy in this file meant a fresh `supabase db reset`
-- aborted at step 20260304130000 and never reached the cleanup
-- migration at 20260507191140 — the `db reset` failure described in
-- the cleanup migration's comment was never actually fixed by that
-- migration; this file's policy creation was the only fix that worked.
--
-- The three dropped policies, for the audit trail:
--   * `Property owners can read own lease documents` (FOR SELECT,
--     auth.uid() = (storage.foldername(name))[1])
--   * `Tenants can read their lease documents` (FOR SELECT, matches
--     `auth.uid() = leases.primary_tenant_id`) — became dead when
--     20260418140000_demolish_rent_and_tenant_portal removed the
--     tenant-portal/auth path. `public.tenants` and
--     `leases.primary_tenant_id` still exist, but `auth.uid()` no
--     longer resolves to any tenant identity (tenants are records,
--     not users), so the join can never match.
--   * `Service can manage lease documents` (FOR ALL TO authenticated,
--     auth.uid() = (storage.foldername(name))[1]) — the audit-failing
--     one
--
-- The bucket itself stays in this migration: prod's bucket was deleted
-- but `storage.protect_delete()` blocks `DELETE FROM storage.buckets`
-- so the cleanup migration can't reproduce that. Local devs `db reset`
-- gets the bucket with no policies attached — harmless because no app
-- code uses it.

-- Create the bucket (ignore if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,  -- Private bucket (requires authentication)
  524288,  -- 512 KB = 524,288 bytes (10x safety margin over 50 KB max realistic size)
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;
