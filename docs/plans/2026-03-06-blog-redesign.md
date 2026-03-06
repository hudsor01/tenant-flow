# Blog Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the blog pages to match the TenantFlow marketing site's design system, with a split hub (Software Comparisons vs Insights), real DB categories, pagination, and functional newsletter subscription.

**Architecture:** Three pages rewritten (`/blog`, `/blog/[slug]`, `/blog/category/[category]`), three new shared components (`BlogCard`, `BlogPagination`, `NewsletterSignup`), data layer updates to `use-blogs.ts` with pagination + category queries, and a new `newsletter-subscribe` Edge Function using Resend Audiences API.

**Tech Stack:** Next.js 16, React 19, TanStack Query, nuqs (URL state), Supabase PostgREST, Resend Audiences API, BlurFade animations, Tailwind 4 design tokens from globals.css.

---

### Task 1: Update `use-blogs.ts` — Paginated queries + categories + related posts

**Files:**
- Modify: `src/hooks/api/use-blogs.ts`

**Step 1: Rewrite the hooks file with pagination, categories, and related posts**

Replace the entire file. Key changes:
- `useBlogs` and `useBlogsByCategory` accept `page` and `limit` params, use `.range()` with `{ count: 'exact' }`
- New `useCategories()` — fetches distinct categories with counts via RPC or raw query
- New `useRelatedPosts(category, excludeSlug, limit)` — 3 same-category posts excluding current
- `useFeaturedComparisons(limit)` — latest Software Comparisons for Zone 1
- `blogKeys` updated with pagination params
- All queries filter `.eq('status', 'published')`

```typescript
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import type { Database } from '#shared/types/supabase'

type Blog = Database['public']['Tables']['blogs']['Row']

type BlogListItem = Pick<
  Blog,
  'id' | 'title' | 'slug' | 'excerpt' | 'published_at' | 'category' | 'reading_time' | 'featured_image' | 'author_user_id' | 'status' | 'tags'
>

type BlogDetail = Pick<
  Blog,
  'id' | 'title' | 'slug' | 'excerpt' | 'content' | 'published_at' | 'category' | 'reading_time' | 'featured_image' | 'author_user_id' | 'status' | 'meta_description' | 'tags' | 'created_at' | 'updated_at'
>

interface BlogCategory {
  category: string
  count: number
}

interface PaginatedBlogs {
  posts: BlogListItem[]
  total: number
}

const BLOG_LIST_COLUMNS =
  'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'

const POSTS_PER_PAGE = 12

export const blogKeys = {
  all: ['blogs'] as const,
  list: (page: number, limit: number) => ['blogs', 'list', page, limit] as const,
  detail: (slug: string) => ['blogs', slug] as const,
  category: (category: string, page: number) => ['blogs', 'category', category, page] as const,
  categories: () => ['blogs', 'categories'] as const,
  comparisons: (limit: number) => ['blogs', 'comparisons', limit] as const,
  related: (category: string, excludeSlug: string) => ['blogs', 'related', category, excludeSlug] as const,
}

export function useBlogs(page: number = 1) {
  return useQuery({
    queryKey: blogKeys.list(page, POSTS_PER_PAGE),
    queryFn: async (): Promise<PaginatedBlogs> => {
      const supabase = createClient()
      const from = (page - 1) * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      const { data, error, count } = await supabase
        .from('blogs')
        .select(BLOG_LIST_COLUMNS, { count: 'exact' })
        .eq('status', 'published')
        .neq('category', 'Software Comparisons')
        .order('published_at', { ascending: false })
        .range(from, to)

      if (error) throw new Error(`Failed to fetch blogs: ${error.message}`)
      return { posts: data ?? [], total: count ?? 0 }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useFeaturedComparisons(limit: number = 6) {
  return useQuery({
    queryKey: blogKeys.comparisons(limit),
    queryFn: async (): Promise<BlogListItem[]> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('blogs')
        .select(BLOG_LIST_COLUMNS)
        .eq('status', 'published')
        .eq('category', 'Software Comparisons')
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(`Failed to fetch comparisons: ${error.message}`)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useBlogBySlug(slug: string) {
  return useQuery({
    queryKey: blogKeys.detail(slug),
    queryFn: async (): Promise<BlogDetail | null> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('blogs')
        .select(
          'id, title, slug, excerpt, content, published_at, category, reading_time, featured_image, author_user_id, status, meta_description, tags, created_at, updated_at'
        )
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(`Failed to fetch blog: ${error.message}`)
      }
      return data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })
}

export function useBlogsByCategory(category: string, page: number = 1) {
  return useQuery({
    queryKey: blogKeys.category(category, page),
    queryFn: async (): Promise<PaginatedBlogs> => {
      const supabase = createClient()
      const from = (page - 1) * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      const { data, error, count } = await supabase
        .from('blogs')
        .select(BLOG_LIST_COLUMNS, { count: 'exact' })
        .eq('category', category)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(from, to)

      if (error) throw new Error(`Failed to fetch blogs by category: ${error.message}`)
      return { posts: data ?? [], total: count ?? 0 }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!category,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: async (): Promise<BlogCategory[]> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .rpc('get_blog_categories')

      if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
      return (data ?? []) as BlogCategory[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useRelatedPosts(category: string, excludeSlug: string, limit: number = 3) {
  return useQuery({
    queryKey: blogKeys.related(category, excludeSlug),
    queryFn: async (): Promise<BlogListItem[]> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('blogs')
        .select(BLOG_LIST_COLUMNS)
        .eq('status', 'published')
        .eq('category', category)
        .neq('slug', excludeSlug)
        .order('published_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(`Failed to fetch related posts: ${error.message}`)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!category && !!excludeSlug,
  })
}

export { type BlogListItem, type BlogDetail, type BlogCategory, type PaginatedBlogs, POSTS_PER_PAGE }
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: May fail on `get_blog_categories` RPC (not yet created). That's OK — Task 2 creates it.

**Step 3: Commit**

```bash
git add src/hooks/api/use-blogs.ts
git commit -m "feat(blog): rewrite hooks with pagination, categories, related posts"
```

---

### Task 2: Create `get_blog_categories` RPC

**Files:**
- Create: `supabase/migrations/20260306120000_blog_categories_rpc.sql`

**Step 1: Write the migration**

```sql
-- Returns distinct blog categories with post counts (published only)
CREATE OR REPLACE FUNCTION get_blog_categories()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.category,
    count(*)::bigint AS count
  FROM blogs b
  WHERE b.status = 'published'
    AND b.category IS NOT NULL
  GROUP BY b.category
  ORDER BY count(*) DESC;
$$;
```

**Step 2: Apply migration locally**

Run: `supabase db push` (or `supabase migration up` if using local)

**Step 3: Regenerate types**

Run: `pnpm db:types`
Expected: `supabase.ts` updated with `get_blog_categories` in the RPC types.

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (hooks now have valid RPC type)

**Step 5: Commit**

```bash
git add supabase/migrations/20260306120000_blog_categories_rpc.sql src/shared/types/supabase.ts
git commit -m "feat(blog): add get_blog_categories RPC"
```

---

### Task 3: Create shared `BlogCard` component

**Files:**
- Create: `src/components/blog/blog-card.tsx`

**Step 1: Write the component**

Reusable card used in hub, category page, and related posts. Uses design system tokens only — no gradients, no custom CSS.

```typescript
import { Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { BlogListItem } from '#hooks/api/use-blogs'

interface BlogCardProps {
  post: BlogListItem
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-card/20 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
    >
      {post.featured_image && (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-6">
        {post.category && (
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            {post.category}
          </span>
        )}
        <h3 className="typography-h4 mt-2 mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
            {post.excerpt}
          </p>
        )}
        <div className="flex-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>{post.reading_time} min read</span>
          </div>
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          )}
        </div>
      </div>
    </Link>
  )
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/blog/blog-card.tsx
git commit -m "feat(blog): add shared BlogCard component"
```

---

### Task 4: Create shared `BlogPagination` component

**Files:**
- Create: `src/components/blog/blog-pagination.tsx`

**Step 1: Write the component**

Uses `nuqs` for URL state (project already uses it for data tables). Design tokens only.

```typescript
'use client'

import { Button } from '#components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQueryState, parseAsInteger } from 'nuqs'
import { POSTS_PER_PAGE } from '#hooks/api/use-blogs'

interface BlogPaginationProps {
  total: number
}

export function BlogPagination({ total }: BlogPaginationProps) {
  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1)
  )

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)

  if (totalPages <= 1) return null

  return (
    <div className="flex-center gap-4 pt-12">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  )
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/blog/blog-pagination.tsx
git commit -m "feat(blog): add shared BlogPagination component with nuqs"
```

---

### Task 5: Create `newsletter-subscribe` Edge Function

**Files:**
- Create: `supabase/functions/newsletter-subscribe/index.ts`

**Step 1: Write the Edge Function**

Follows existing patterns: `getCorsHeaders`, `handleCorsOptions`, `errorResponse`, `validateEnv`, `rateLimit`. Calls Resend Audiences API (POST `/audiences/{id}/contacts`).

```typescript
import * as Sentry from '@sentry/deno'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/errors.ts'
import { validateEnv } from '../_shared/env.ts'
import { rateLimit } from '../_shared/rate-limit.ts'

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN') ?? '' })

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsOptions(req)
  if (corsResponse) return corsResponse

  const rateLimited = await rateLimit(req, {
    maxRequests: 5,
    windowMs: 60_000,
    prefix: 'newsletter',
  })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({
      required: ['RESEND_API_KEY', 'RESEND_AUDIENCE_ID'],
    })

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
        }
      )
    }

    const body = await req.json() as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
        }
      )
    }

    const res = await fetch(
      `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      console.error(`[RESEND_AUDIENCE_ERROR] ${res.status}: ${errText}`)
      return errorResponse(req, 500, new Error(`Resend API error ${res.status}`), {
        resendStatus: res.status,
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { handler: 'newsletter-subscribe' })
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/newsletter-subscribe/index.ts
git commit -m "feat(blog): add newsletter-subscribe Edge Function with Resend Audiences"
```

---

### Task 6: Create shared `NewsletterSignup` component

**Files:**
- Create: `src/components/blog/newsletter-signup.tsx`

**Step 1: Write the component**

Uses `useMutation` from TanStack Query, `toast` from sonner, design system tokens. Calls the Edge Function.

```typescript
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { Mail } from 'lucide-react'
import { createClient } from '#lib/supabase/client'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const mutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/newsletter-subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ email: emailAddress }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, string>
        throw new Error(body.error ?? 'Failed to subscribe')
      }
    },
    onSuccess: () => {
      setSubscribed(true)
      setEmail('')
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address.')
      return
    }
    mutation.mutate(trimmed)
  }

  return (
    <section className="section-spacing">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <BlurFade delay={0.1} inView>
          <div className="bg-card/20 backdrop-blur-sm border border-border/30 rounded-2xl p-8 md:p-12 text-center">
            <Mail className="size-10 text-primary mx-auto mb-4" />
            <h2 className="typography-h2 mb-3">
              Get property management insights weekly
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join 10,000+ property managers who get our weekly strategies on
              automation, cost reduction, and revenue optimization.
            </p>
            {subscribed ? (
              <p className="text-primary font-medium">
                You&apos;re subscribed! Check your inbox.
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  autoComplete="email"
                />
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Free weekly insights. Unsubscribe anytime.
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/blog/newsletter-signup.tsx
git commit -m "feat(blog): add NewsletterSignup component with Resend Audiences"
```

---

### Task 7: Rewrite `/blog` hub page

**Files:**
- Modify: `src/app/blog/page.tsx`

**Step 1: Rewrite the page**

Complete rewrite. Split hub: hero, Zone 1 (comparisons), Zone 2 (insights with category pills + pagination), newsletter CTA. All BlurFade animated. Design tokens only.

```typescript
'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { PageLayout } from '#components/layout/page-layout'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import {
  useBlogs,
  useCategories,
  useFeaturedComparisons,
} from '#hooks/api/use-blogs'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useQueryState, parseAsInteger } from 'nuqs'

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export default function BlogPage() {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const { data: comparisons = [], isLoading: loadingComparisons } =
    useFeaturedComparisons(6)
  const { data, isLoading: loadingPosts } = useBlogs(page)
  const { data: categories = [] } = useCategories()

  const posts = data?.posts ?? []
  const total = data?.total ?? 0

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative flex-1 flex flex-col">
        <div className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-80 text-center">
              <BlurFade delay={0.1} inView>
                <h1 className="text-responsive-display-xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
                  Property Management{' '}
                  <span className="hero-highlight">Knowledge Base</span>
                </h1>
              </BlurFade>
              <BlurFade delay={0.2} inView>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                  Compare tools, learn strategies, and grow your portfolio
                </p>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Zone 1: Compare Tools */}
      <section className="section-spacing">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <BlurFade delay={0.1} inView>
            <div className="flex-between mb-8">
              <h2 className="typography-h2">
                Compare Property Management Software
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/blog/category/software-comparisons">
                  View All
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </BlurFade>

          {loadingComparisons ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-2xl animate-pulse h-[300px]"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {comparisons.map((post, i) => (
                <BlurFade key={post.id} delay={0.1 + i * 0.05} inView>
                  <div className="min-w-[320px] max-w-[360px] snap-start">
                    <BlogCard post={post} />
                  </div>
                </BlurFade>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Zone 2: Insights & Guides */}
      <LazySection
        fallback={<SectionSkeleton height={600} variant="grid" />}
        minHeight={600}
      >
        <section className="section-spacing bg-muted/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <BlurFade delay={0.1} inView>
              <h2 className="typography-h2 mb-8">Insights & Guides</h2>
            </BlurFade>

            {/* Category pills */}
            <BlurFade delay={0.15} inView>
              <div className="flex flex-wrap gap-2 mb-10">
                {categories
                  .filter((c) => c.category !== 'Software Comparisons')
                  .map((cat) => (
                    <Link
                      key={cat.category}
                      href={`/blog/category/${slugify(cat.category)}`}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-border/50 bg-card/20 backdrop-blur-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {cat.category}
                      <span className="ml-1.5 text-xs opacity-60">
                        {cat.count}
                      </span>
                    </Link>
                  ))}
              </div>
            </BlurFade>

            {/* Post grid */}
            {loadingPosts ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 rounded-2xl animate-pulse h-[300px]"
                  />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  No published articles yet. Check back soon!
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post, i) => (
                    <BlurFade key={post.id} delay={0.05 + i * 0.03} inView>
                      <BlogCard post={post} />
                    </BlurFade>
                  ))}
                </div>
                <BlogPagination total={total} />
              </>
            )}
          </div>
        </section>
      </LazySection>

      {/* Newsletter */}
      <NewsletterSignup />
    </PageLayout>
  )
}
```

**Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/blog/page.tsx
git commit -m "feat(blog): rewrite hub page with split zones, real categories, pagination"
```

---

### Task 8: Rewrite `/blog/[slug]` detail page

**Files:**
- Modify: `src/app/blog/[slug]/page.tsx`

**Step 1: Rewrite the page**

Add BlurFade, featured image, related posts, remove gradient CTA. Keep MarkdownContent dynamic import.

```typescript
'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { BlogCard } from '#components/blog/blog-card'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import { PageLayout } from '#components/layout/page-layout'
import { useBlogBySlug, useRelatedPosts } from '#hooks/api/use-blogs'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'

const MarkdownContent = dynamic(() => import('./markdown-content'), {
  ssr: false,
  loading: () => <BlogLoadingSkeleton />,
})

export default function BlogArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const { data: post, isLoading } = useBlogBySlug(slug)
  const { data: relatedPosts = [] } = useRelatedPosts(
    post?.category ?? '',
    slug
  )

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
          <div className="h-4 bg-muted rounded w-32 mb-8 animate-pulse" />
        </div>
        <article className="container mx-auto px-6 pb-16 max-w-4xl">
          <header className="mb-12">
            <div className="h-64 bg-muted rounded-2xl mb-8 animate-pulse" />
            <div className="h-12 bg-muted rounded w-3/4 mb-6 animate-pulse" />
            <div className="h-6 bg-muted rounded w-full mb-2 animate-pulse" />
            <div className="h-6 bg-muted rounded w-2/3 mb-8 animate-pulse" />
          </header>
          <BlogLoadingSkeleton />
        </article>
      </PageLayout>
    )
  }

  if (!post) {
    return (
      <PageLayout>
        <div className="container mx-auto px-6 py-16 max-w-4xl text-center">
          <h1 className="typography-h1 mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The blog post you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button asChild>
            <Link href="/blog">
              <ArrowLeft className="size-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Back to Blog */}
      <div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
        <Link
          href="/blog"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Blog
        </Link>
      </div>

      <article className="container mx-auto px-6 pb-16 max-w-4xl">
        <BlurFade delay={0.1} inView>
          <header className="mb-12">
            {/* Featured Image */}
            {post.featured_image && (
              <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg mb-8">
                <Image
                  src={post.featured_image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            )}

            <h1 className="text-responsive-display-lg font-bold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {post.excerpt}
            </p>

            <div className="flex items-center gap-6 text-muted-foreground border-t border-b border-border py-4">
              <div className="flex items-center gap-2">
                <User className="size-4" />
                <span>TenantFlow Team</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                <span>{post.reading_time} min read</span>
              </div>
              {post.published_at && (
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              )}
            </div>
          </header>
        </BlurFade>

        {/* Article Content */}
        <BlurFade delay={0.2} inView>
          <div
            className="prose prose-lg prose-slate dark:prose-invert max-w-none
              [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mt-12 [&>h1]:mb-6 [&>h1]:text-foreground
              [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-5 [&>h2]:text-foreground
              [&>h3]:text-2xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-4 [&>h3]:text-foreground
              [&>p]:text-lg [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-6
              [&>ul]:text-lg [&>ul]:text-muted-foreground [&>ul]:mb-6 [&>ul]:ml-6
              [&>ol]:text-lg [&>ol]:text-muted-foreground [&>ol]:mb-6 [&>ol]:ml-6
              [&>li]:mb-2
              [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-4 [&>blockquote]:my-8 [&>blockquote]:italic [&>blockquote]:text-foreground [&>blockquote]:bg-primary/5 [&>blockquote]:rounded-r-lg
              [&>pre]:bg-muted [&>pre]:p-6 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:my-8
              [&>code]:bg-muted [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:text-sm [&>code]:text-foreground
              [&>a]:text-primary [&>a]:underline [&>a]:hover:text-primary/80
              [&>img]:rounded-lg [&>img]:my-8 [&>img]:shadow-lg"
          >
            <MarkdownContent content={post.content.trim()} />
          </div>
        </BlurFade>

        {/* CTA Section */}
        <div className="mt-16 p-8 bg-card/20 backdrop-blur-sm border border-border/30 rounded-2xl text-center">
          <h3 className="typography-h3 text-foreground mb-4">
            Ready to transform your property management?
          </h3>
          <p className="text-muted-foreground mb-6">
            Join 10,000+ property managers using TenantFlow
          </p>
          <Button size="lg" className="px-8" asChild>
            <Link href="/pricing">
              Start Free Trial
              <ArrowRight className="size-5 ml-2" />
            </Link>
          </Button>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="section-spacing-compact">
          <div className="container mx-auto px-6 max-w-4xl">
            <BlurFade delay={0.1} inView>
              <h2 className="typography-h3 mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((related, i) => (
                  <BlurFade key={related.id} delay={0.05 + i * 0.05} inView>
                    <BlogCard post={related} />
                  </BlurFade>
                ))}
              </div>
            </BlurFade>
          </div>
        </section>
      )}
    </PageLayout>
  )
}
```

**Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/blog/[slug]/page.tsx
git commit -m "feat(blog): rewrite detail page with BlurFade, featured image, related posts"
```

---

### Task 9: Rewrite `/blog/category/[category]` page

**Files:**
- Modify: `src/app/blog/category/[category]/page.tsx`

**Step 1: Rewrite the page**

Remove hardcoded `categoryConfig`. Dynamic category name from slug. Paginated grid with shared components.

```typescript
'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { PageLayout } from '#components/layout/page-layout'
import { EmptyState } from '#components/shared/empty-state'
import { useBlogsByCategory } from '#hooks/api/use-blogs'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQueryState, parseAsInteger } from 'nuqs'

function deslugify(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function BlogCategoryPage() {
  const params = useParams()
  const categorySlug = params.category as string
  const categoryName = deslugify(categorySlug)

  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const { data, isLoading } = useBlogsByCategory(categoryName, page)

  const posts = data?.posts ?? []
  const total = data?.total ?? 0

  return (
    <PageLayout>
      {/* Back to Blog */}
      <div className="container mx-auto px-6 page-content pb-8 max-w-7xl">
        <Link
          href="/blog"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Blog
        </Link>
      </div>

      {/* Category Header */}
      <section className="container mx-auto px-6 pb-12 max-w-7xl">
        <BlurFade delay={0.1} inView>
          <h1 className="text-responsive-display-lg font-bold text-foreground mb-3">
            {categoryName}
          </h1>
          {!isLoading && (
            <p className="text-xl text-muted-foreground">
              {total} article{total !== 1 ? 's' : ''}
            </p>
          )}
        </BlurFade>
      </section>

      {/* Post Grid */}
      <section className="section-spacing bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-2xl animate-pulse h-[300px]"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No articles yet"
              description="We're working on content for this category. Check back soon!"
              actionLabel="Browse All Articles"
              actionHref="/blog"
            />
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, i) => (
                  <BlurFade key={post.id} delay={0.05 + i * 0.03} inView>
                    <BlogCard post={post} />
                  </BlurFade>
                ))}
              </div>
              <BlogPagination total={total} />
            </>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSignup />
    </PageLayout>
  )
}
```

**Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/blog/category/[category]/page.tsx
git commit -m "feat(blog): rewrite category page with dynamic names, pagination, EmptyState"
```

---

### Task 10: Final verification

**Step 1: Full quality check**

Run: `pnpm validate:quick`
Expected: Types, lint, and unit tests all PASS.

**Step 2: Visual check (manual)**

Start dev server: `pnpm dev`
- Visit `/blog` — hero, comparisons scroll, insights grid, category pills, newsletter
- Visit `/blog/category/software-comparisons` — paginated list
- Visit any `/blog/[slug]` — featured image, content, related posts, CTA links to /pricing
- Test newsletter form — submit, error states

**Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix(blog): address review fixups from visual check"
```

---

Plan complete and saved to `docs/plans/2026-03-06-blog-redesign.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?