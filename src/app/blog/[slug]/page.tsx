import { createClient } from '#lib/supabase/server'
import type { Metadata } from 'next'
import BlogPostPage from './blog-post-page'

interface Props {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params
	const supabase = await createClient()

	const { data: post } = await supabase
		.from('blogs')
		.select('title, excerpt, meta_description, featured_image, published_at, category')
		.eq('slug', slug)
		.eq('status', 'published')
		.single()

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
