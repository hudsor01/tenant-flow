-- Phase 12 (BLOG-07b): admins must SELECT non-published blogs so the /admin/blog
-- review queue (status='in-review') is visible. The prior blogs_select_published
-- policy exposed only status='published' to everyone, so the review surface
-- returned zero rows for admins too.
--
-- Use TWO permissive SELECT policies (they OR together), NOT one combined
-- `status='published' OR is_admin()` policy: anon does NOT have EXECUTE on
-- public.is_admin() (revoked in the security-definer lockdown), so a policy that
-- makes anon reference it raises `42501: permission denied for function is_admin`
-- on EVERY anonymous blog read (breaks /blog, sitemap, feed, crawlers). Keeping
-- the published predicate in its own anon-facing policy avoids the function call.
--   - blogs_select_published: published rows visible to anon + authenticated
--   - blogs_select_admin: ALL rows visible to authenticated admins (is_admin())
drop policy if exists "blogs_select_published" on public.blogs;

create policy "blogs_select_published" on public.blogs
  for select to anon, authenticated
  using (status = 'published'::text);

create policy "blogs_select_admin" on public.blogs
  for select to authenticated
  using ((select public.is_admin()));
