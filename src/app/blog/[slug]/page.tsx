import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '#lib/supabase/server'
import { createLogger } from '#lib/frontend-logger'
import type { Metadata } from 'next'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createArticleJsonLd } from '#lib/seo/article-schema'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import BlogPostPage from './blog-post-page'

// Phase 1 (CRIT-01) follow-up: Next.js 16 + ISR (`revalidate`) + `notFound()`
// returns soft-404 (HTTP 200 + not-found UI), not real HTTP 404. This breaks
// Specialist-2's "real 404 emitted by framework" contract and slows Google
// deindex of the 100 broken blog rows the Phase-1 migration drafted.
//
// Forcing dynamic rendering ensures `notFound()` correctly emits HTTP 404 on
// every miss. Cost is acceptable: every row was drafted by the Phase-1
// migration, so ISR cache hits are zero in the current state.
//
// Phase 6 (BLOG-02 server-rendered rebuild) restores ISR with
// `generateStaticParams` returning the published slug set — at that point
// dynamic params hit the proper 404 path while known slugs serve from cache.
export const dynamic = 'force-dynamic'

const logger = createLogger({ component: 'BlogPost' })

interface Props {
	params: Promise<{ slug: string }>
}

/** Deduplicated blog post query — shared by generateMetadata and Page */
const getBlogPost = cache(async (slug: string) => {
	const supabase = await createClient()

	// Race against 5s timeout to prevent Supabase cold-start hangs (80-398s observed in Sentry)
	let timer: ReturnType<typeof setTimeout> | undefined
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error('Blog post query timed out')), 5000)
	})
	const query = supabase
		.from('blogs')
		.select('title, slug, published_at, updated_at, featured_image, content, reading_time, category, meta_description, excerpt, tags')
		.eq('slug', slug)
		.eq('status', 'published')
		.single()

	const post = await Promise.race([query, timeout])
		.then(({ data, error }) => {
			if (error) {
				logger.error('Blog post query failed', {
					action: 'getBlogPost',
					route: `/blog/${slug}`,
					metadata: { error: error.message }
				})
			}
			return data
		})
		.catch(() => null)
		.finally(() => {
			if (timer) clearTimeout(timer)
		})

	return post
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params
	const post = await getBlogPost(slug)

	if (!post) {
		notFound()
	}

	const description = post.meta_description || post.excerpt

	return {
		// `title.absolute` opts out of the parent layout's `'%s | TenantFlow'`
		// template — without this, the rendered <title> would be
		// "Post Title | TenantFlow Blog | TenantFlow" (template stacking).
		title: { absolute: `${post.title} | TenantFlow Blog` },
		description,
		openGraph: {
			title: post.title,
			description,
			type: 'article',
			publishedTime: post.published_at ?? undefined,
			modifiedTime: post.updated_at ?? post.published_at ?? undefined,
			section: post.category ?? undefined,
			// Min image size for LinkedIn / Slack / Discord cards is 1200x630;
			// downscaling a non-conforming source would lie about the file, so
			// emit dimensions only when the source is a TenantFlow-managed
			// asset that we know is sized correctly. For untrusted external
			// URLs, omit width/height and let the platform sniff.
			images: post.featured_image ? [{ url: post.featured_image }] : [],
			siteName: 'TenantFlow',
		},
		twitter: {
			card: 'summary_large_image',
			site: '@tenantflow',
			creator: '@tenantflow',
			title: post.title,
			description,
			images: post.featured_image ? [post.featured_image] : [],
		},
		alternates: {
			canonical: `/blog/${slug}`,
		},
	}
}

export default async function Page({ params }: Props) {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) notFound()

	const wordCount = post?.content
		? post.content.trim().split(/\s+/).length
		: undefined

	const categorySlug = post?.category
		? post.category.toLowerCase().replace(/\s+/g, '-')
		: ''

	const breadcrumbSchema = post
		? createBreadcrumbJsonLd(
				`/blog/category/${categorySlug}/${slug}`,
				{
					[categorySlug]: post.category ?? categorySlug,
					[slug]: post.title ?? slug
				}
			)
		: null

	// Article schema only emits when we have a real published_at — Google's
	// Article rich-result eligibility requires datePublished, and faking
	// `new Date().toISOString()` produces a misleading freshness signal that
	// will not match what crawlers see on subsequent visits.
	const articleSchema = post && post.published_at
		? createArticleJsonLd({
				title: post.title,
				slug: post.slug,
				datePublished: post.published_at,
				dateModified: post.updated_at ?? post.published_at,
				// Author byline on the rendered page reads "TenantFlow Team", and
				// individual posts are not reliably attributed to a single human.
				// Schema author follows the visible byline so the entity matches —
				// `authorType: 'Organization'` because a team/brand isn't a
				// schema.org `Person`.
				authorName: 'TenantFlow Team',
				authorType: 'Organization',
				image: post.featured_image ?? undefined,
				wordCount,
				keywords: Array.isArray(post.tags) ? post.tags.filter((t): t is string => typeof t === 'string') : undefined,
				description: post.meta_description ?? post.excerpt ?? undefined,
				timeRequired: post.reading_time ? `PT${post.reading_time}M` : undefined
			})
		: null

	return (
		<>
			{breadcrumbSchema && <JsonLdScript schema={breadcrumbSchema} />}
			{articleSchema && <JsonLdScript schema={articleSchema} />}
			<BlogPostPage post={post} slug={slug} />
		</>
	)
}
