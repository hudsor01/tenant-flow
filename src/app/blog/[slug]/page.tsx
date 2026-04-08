import { createClient } from '#lib/supabase/server'
import type { Metadata } from 'next'
import BlogPostPage from './blog-post-page'

// Cache blog pages for 1 hour via ISR — generateMetadata only runs during
// background revalidation, not on every request (27K+ requests/month)
export const revalidate = 3600

interface Props {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params
	const supabase = await createClient()

	// Race against 5s timeout to prevent Supabase cold-start hangs (80-398s observed in Sentry)
	let timer: ReturnType<typeof setTimeout>
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error('Blog metadata query timed out')), 5000)
	})
	const query = supabase
		.from('blogs')
		.select('title, excerpt, meta_description, featured_image, published_at, category')
		.eq('slug', slug)
		.eq('status', 'published')
		.single()

	const post = await Promise.race([query, timeout])
		.then(({ data, error }) => {
			if (error) console.error('Blog metadata query failed:', error.message)
			return data
		})
		.catch(() => null)
		.finally(() => clearTimeout(timer!))

	if (!post) {
		return { title: 'Blog Post Not Found | TenantFlow' }
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

export default function Page() {
	return <BlogPostPage />
}
