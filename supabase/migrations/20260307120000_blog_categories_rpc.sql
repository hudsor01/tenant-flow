-- migration: create get_blog_categories rpc function
-- purpose: returns distinct blog categories with post counts and computed slugs
-- used by: blog category navigation, category pages, hub page
-- security: security invoker (public read access via existing rls policies)

create or replace function get_blog_categories()
returns table(name text, slug text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.category as name,
    lower(replace(b.category, ' ', '-')) as slug,
    count(*)::bigint as post_count
  from blogs b
  where b.status = 'published'
    and b.category is not null
  group by b.category
  order by count(*) desc;
$$;

-- grant execute to both anon and authenticated roles
-- blogs are public marketing content accessible to all visitors
grant execute on function get_blog_categories() to anon;
grant execute on function get_blog_categories() to authenticated;
