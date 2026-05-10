-- Phase 6 / BLOG-04 (Blocker-#1 fix): add nullable canonical_url column.
-- Allows per-post canonical override. Default behavior is "no override" (NULL); the
-- post page generateMetadata() in Plan 06-02 only emits alternates.canonical when the
-- column is non-null. The n8n-blog-ingest payload (Plan 06-03) accepts an optional
-- canonical_url field and threads it into INSERT.
--
-- No CHECK constraint: the column is a relative URL or absolute URL string; we don't
-- attempt to validate path shape at the DB boundary. The Edge Function's preflight
-- can sanity-check (e.g., starts with '/' or 'https://') if needed.

ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS canonical_url text NULL;

COMMENT ON COLUMN public.blogs.canonical_url IS
  'Optional per-post canonical override. When non-null, the post page metadata emits <link rel="canonical" href="{canonical_url}"> in <head>. Use to redirect SEO authority away from a blog post toward a more authoritative page (e.g., post tenantflow-vs-buildium → /compare/buildium).';
