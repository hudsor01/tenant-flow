-- =============================================================================
-- Migration: Add vendor_id to maintenance_requests
-- Purpose: Link maintenance requests to a specific vendor/contractor
-- Affected tables: maintenance_requests
-- Special considerations:
--   - ON DELETE SET NULL: deleting a vendor does not delete maintenance requests
--   - Column is nullable - vendor assignment is optional
-- =============================================================================

-- Add vendor_id FK column to maintenance_requests
-- Nullable: not all maintenance requests will have an assigned vendor
alter table public.maintenance_requests
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

comment on column public.maintenance_requests.vendor_id is
  'Optional reference to the vendor/contractor assigned to this maintenance request.';

-- Index for FK performance: queries filtering or joining on vendor_id
create index if not exists maintenance_requests_vendor_id_idx
  on public.maintenance_requests (vendor_id);
