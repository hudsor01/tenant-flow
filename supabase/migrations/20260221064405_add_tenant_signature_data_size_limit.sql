-- Migration: add_tenant_signature_data_size_limit
-- Purpose: Add a maximum length constraint to tenant_signature_data to prevent
--          unbounded storage of base64-encoded canvas signature images.
--          A raw canvas signature in base64 can exceed 100KB per row without a limit.
-- Affected tables: inspections
-- Approach: 10 000-character limit accommodates a compact signature token or
--           a small base64 preview thumbnail; large image blobs should use Storage.

alter table inspections
  add constraint inspections_tenant_signature_data_length_check
  check (tenant_signature_data is null or length(tenant_signature_data) <= 10000);

comment on constraint inspections_tenant_signature_data_length_check on inspections is
  'Prevents unbounded base64 image storage. Store large signature images in Supabase Storage and save the URL here instead.';
