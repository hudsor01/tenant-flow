-- Phase 6 / BLOG-01 + SEO-04: slug regex CHECK enforcing the slug shape.
-- Pattern: must start with a lowercase letter, then lowercase alnum + single hyphens.
-- Length 3..120 (sane URL bounds).
--
-- CHECK enforces slug shape (must start with a letter, only lowercase alnum + hyphens).
-- The audit-#38 ms-suffix slug pattern (`error-1778151609106`) is NOT closed by this
-- regex alone — the n8n flow MUST NOT generate Date.now()-based fallback slugs. The
-- DB validation triggers gate-9 (DocuSeal mention count) and gate-3 (persona phrase)
-- further reduce the chance of malformed n8n output reaching the DB. The regex's
-- specific mitigation here is rejecting numeric-only slugs (e.g., `1234567890`) and
-- slugs with uppercase / spaces / underscores.

ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_slug_format_check;
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_slug_format_check
  CHECK (slug ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 120);
