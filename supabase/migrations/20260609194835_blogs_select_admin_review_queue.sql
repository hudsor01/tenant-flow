-- Phase 12 (BLOG-07b): admins must SELECT non-published blogs so the /admin/blog
-- review queue (status='in-review') is visible. The prior blogs_select_published
-- policy exposed only status='published' to everyone, so the review surface
-- returned zero rows for admins too. Replace it with a single SELECT policy:
-- published rows visible to all, ALL rows visible to admins (is_admin()).
drop policy if exists "blogs_select_published" on public.blogs;

create policy "blogs_select_published_or_admin" on public.blogs
  for select to anon, authenticated
  using (status = 'published'::text or (select public.is_admin()));
