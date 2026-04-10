/**
 * RelatedArticles — Async Server Component
 *
 * Fetches published blog posts by slug and renders a responsive grid of
 * BlogCard instances. Used on comparison pages, resource pages, and any
 * page that needs a cross-linking section for topical authority clusters.
 *
 * Returns null for empty slug arrays and empty query results — no empty
 * state UI is shown (the caller decides whether to render this section).
 */

import { cn } from '#lib/utils'
import { createClient } from '#lib/supabase/server'
import { BlogCard } from '#components/blog/blog-card'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

interface RelatedArticlesProps {
	slugs: string[]
	title?: string
	className?: string
}

export async function RelatedArticles({
	slugs,
	title = 'Related Articles',
	className,
}: RelatedArticlesProps) {
	if (slugs.length === 0) return null

	const supabase = await createClient()
	const { data } = await supabase
		.from('blogs')
		.select(
			'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'
		)
		.in('slug', slugs)
		.eq('status', 'published')
		.order('published_at', { ascending: false })

	const posts = (data ?? []) as BlogListItem[]
	if (posts.length === 0) return null

	return (
		<section className={cn('section-spacing print:hidden', className)}>
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<h2 className="typography-h2 text-foreground mb-8">{title}</h2>
				<div className="grid md:grid-cols-3 gap-6">
					{posts.map(post => (
						<BlogCard key={post.id} post={post} />
					))}
				</div>
			</div>
		</section>
	)
}
