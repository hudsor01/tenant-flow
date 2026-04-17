import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '#lib/supabase/server'
import { createLogger } from '#lib/frontend-logger'
import type { Metadata } from 'next'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createArticleJsonLd } from '#lib/seo/article-schema'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import BlogPostPage from './blog-post-page'

// Cache blog pages for 1 hour via ISR — generateMetadata only runs during
// background revalidation, not on every request (27K+ requests/month)
export const revalidate = 3600

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
		title: `${post.title} | TenantFlow Blog`,
		description,
		openGraph: {
			title: post.title,
			description,
			type: 'article',
			publishedTime: post.published_at ?? undefined,
			section: post.category ?? undefined,
			images: post.featured_image ? [{ url: post.featured_image, width: 1080, height: 607 }] : [],
			siteName: 'TenantFlow',
		},
		twitter: {
			card: 'summary_large_image',
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

	const articleSchema = post
		? createArticleJsonLd({
				title: post.title,
				slug: post.slug,
				datePublished: post.published_at ?? new Date().toISOString(),
				dateModified: post.updated_at ?? post.published_at ?? undefined,
				authorName: 'Richard Hudson',
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
			<BlogPostPage />
		</>
	)
}
