import { getAllBlogPosts } from '#lib/blog-posts'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { MetadataRoute } from 'next'

const logger = createLogger({ component: 'Sitemap' })

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'
	const currentDate = new Date().toISOString()

	// High-priority marketing pages
	const marketingPages: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: currentDate,
			changeFrequency: 'weekly',
			priority: 1.0
		},
		{
			url: `${baseUrl}/features`,
			lastModified: currentDate,
			changeFrequency: 'weekly',
			priority: 0.9
		},
		{
			url: `${baseUrl}/pricing`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.9
		}
	]

	// Content pages
	const contentPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/blog`,
			lastModified: currentDate,
			changeFrequency: 'weekly',
			priority: 0.8
		},
		{
			url: `${baseUrl}/resources`,
			lastModified: currentDate,
			changeFrequency: 'weekly',
			priority: 0.7
		}
	]

	// Company and support pages
	const companyPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/about`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.7
		},
		{
			url: `${baseUrl}/contact`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.7
		},
		{
			url: `${baseUrl}/faq`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.6
		},
		{
			url: `${baseUrl}/help`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.6
		}
	]

	// Legal pages
	const legalPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/terms`,
			lastModified: currentDate,
			changeFrequency: 'yearly',
			priority: 0.3
		},
		{
			url: `${baseUrl}/privacy`,
			lastModified: currentDate,
			changeFrequency: 'yearly',
			priority: 0.3
		}
	]

	// Auth pages (low priority, but indexed for completeness)
	const authPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/login`,
			lastModified: currentDate,
			changeFrequency: 'monthly',
			priority: 0.2
		}
	]

	// Dynamic blog posts
	let blogPages: MetadataRoute.Sitemap = []
	try {
		const blogPosts = getAllBlogPosts()
		logger.info('Generating blog post sitemap entries', {
			action: 'generateBlogSitemap',
			route: '/sitemap.xml',
			metadata: {
				postCount: blogPosts.length
			}
		})

		blogPages = blogPosts.map(post => ({
			url: `${baseUrl}/blog/${post.slug}`,
			lastModified: new Date(post.date).toISOString(),
			changeFrequency: 'monthly' as const,
			priority: 0.7
		}))
	} catch (error) {
		logger.error('Failed to generate blog post sitemap entries', {
			action: 'generateBlogSitemap',
			route: '/sitemap.xml',
			timestamp: new Date().toISOString(),
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			}
		})
		// Return empty array to allow sitemap generation to continue with static pages
	}

	const allPages = [
		...marketingPages,
		...contentPages,
		...companyPages,
		...legalPages,
		...authPages,
		...blogPages
	]

	logger.info('Generated sitemap', {
		action: 'generateSitemap',
		route: '/sitemap.xml',
		metadata: {
			totalEntries: allPages.length,
			staticEntries: allPages.length - blogPages.length,
			blogEntries: blogPages.length
		}
	})

	return allPages
}
