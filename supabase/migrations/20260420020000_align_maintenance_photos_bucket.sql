-- Phase 54b follow-up (#3): align maintenance-photos bucket config with
-- frontend validation.
--
-- Audit uncovered three mismatches vs the PhotosCard upload code:
--   1. Bucket's allowed_mime_types list only has image types — MP4/MOV
--      would be rejected by Supabase Storage even though the UI accepts
--      them. Users would hit a silent 415.
--   2. Bucket's file_size_limit is 10 MB but the UI validates up to 25 MB.
--      Files between 10–25 MB would upload from the UI perspective but
--      fail at storage.
--   3. The initial 54b migration used `on conflict do nothing` which
--      didn't patch the pre-existing bucket created in 2026-03. So the
--      bucket still has the old restrictive config.
--
-- This migration UPDATE-s the bucket in place so the settings match the
-- landlord-only intent: images + short videos up to 25 MB, private, with
-- path-based RLS already in place from migration 20260420010000.

begin;

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]::text[],
  file_size_limit = 26214400 -- 25 MB, matches MAX_FILE_SIZE_BYTES in photos-card.tsx
where id = 'maintenance-photos';

commit;
