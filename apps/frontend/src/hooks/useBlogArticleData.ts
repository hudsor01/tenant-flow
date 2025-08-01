import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import type {
	BlogArticleWithDetails,
	BlogFilters,
	BlogPagination,
	BlogSEOData,
	BlogCategory
} from '@tenantflow/shared/types/blog'

// Re-export blog query keys for backward compatibility
export const blogQueryKeys = queryKeys.blog

/**
 * Hook for fetching a single blog article by slug
 * Enhanced with static data for DFW Property Management article
 */
export function useBlogArticle(slug: string) {
	return useQuery({
		queryKey: queryKeys.blog.article(slug),
		queryFn: async (): Promise<BlogArticleWithDetails | null> => {
			// Debug logging
			logger.debug('useBlogArticle called', undefined, { slug, isMatch: slug === 'managing-multiple-properties-dfw-metroplex' })

			// Return DFW article if slug matches
			if (slug === 'managing-multiple-properties-dfw-metroplex') {
				return {
					id: '1',
					title: 'Managing Multiple Properties in the DFW Metroplex: Best Property Management Software & Tools',
					slug: 'managing-multiple-properties-dfw-metroplex',
					description: 'Expert guide to managing multiple properties in Dallas-Fort Worth with the best property management software, apps, and tools for Texas landlords.',
					authorId: '1',
					lastIndexed: new Date('2024-10-15'),
					content: `# Managing Multiple Properties in the DFW Metroplex: Best Property Management Software & Tools

**By TenantFlow Team | October 2024**

---

## Introduction: Managing Multiple Properties in the DFW Metroplex

If you're a single-family home owner in the **Dallas-Fort Worth (DFW) metroplex** who manages **multiple properties**, you know how challenging it can be to stay on top of rent payments, tenant communication, maintenance requests, and compliance requirements. The DFW area is one of the fastest-growing real estate markets in the U.S., with a booming rental demand and a competitive landscape that demands efficiency and precision.

Managing multiple properties manually can be overwhelming, especially when juggling tasks like tracking expenses, scheduling maintenance, and ensuring compliance with **Texas property laws**. That's where **property management software** comes in.

In this blog, we'll explore the **best property management software for Dallas-Fort Worth**, **DFW property management apps**, and **top tools for managing multiple properties in Texas**. We'll also cover **how to manage multiple properties in Texas** effectively, from ion to local compliance, and why **property management software for Texas** is essential for your success.

Whether you're a landlord with three properties or a real estate investor with a portfolio of 10+ units, this guide will help you **streamline your operations**, **save time**, and **maximize your ROI** in the DFW market.

---

## Why Property Management Software is Critical for DFW Homeowners

The DFW metroplex is a unique market with its own set of challenges and opportunities. Here's why **property management software** is a game-changer for homeowners in the area:

### 1. High Demand and Competitive Market
DFW is one of the most desirable places to live in the U.S., with a growing population and a strong economy. This means **high demand for rental properties**, but also **intense competition** among landlords. Property management software helps you **stay ahead of the curve** by ing tasks like tenant screening, rent tracking, and maintenance scheduling.

### 2. Climate and Energy Costs
Texas is known for its extreme weather, including **heatwaves, hail, and hurricanes**, which can lead to frequent property damage and maintenance needs. Property management software can help you **monitor energy usage**, **track utility costs**, and **plan for seasonal repairs** to avoid costly surprises.

### 3. Local Regulations and Compliance
Texas has specific **landlord-tenant laws**, including **property tax requirements**, **rent control regulations**, and **HOA (Homeowners Association) rules**. Property management software ensures you **stay compliant** with local laws and avoid legal issues.

### 4. Time Efficiency for Multi-Property Owners
Managing multiple properties manually is time-consuming. Property management software allows you to **centralize all your tasks** in one place, from **rental agreements** to **tenant communication**, helping you **save hours each week**.

---

## Best Property Management Software for Dallas-Fort Worth Homeowners

When choosing property management software for the DFW metroplex, look for tools that are **user-friendly**, **compliant with Texas laws**, and **tailored to the needs of multi-property owners**. Below are the **top property management software options** that are ideal for DFW homeowners.

### 1. TenantFlow
**Why It's Perfect for DFW Homeowners**:
- **Local Expertise**: Built specifically for Texas property managers with DFW-focused features
- **Comprehensive Features**: Complete property management suite with tenant screening, rent tracking, and maintenance scheduling
- **Compliance Tools**: ed compliance with Texas landlord-tenant laws
- **Multi-Property Dashboard**: Centralized management for all your properties

**Best For**: Homeowners who want a **complete solution** designed specifically for Texas property management.

### 2. Rentec Direct
**Why It's Great for DFW Homeowners**:
- **Texas-Based Platform**: Local expertise with strong DFW presence
- **Customizable Reports**: Generate detailed reports for income, expenses, and property performance
- **Mobile App**: Full mobile access for on-the-go management
- **Tenant Screening**: Built-in screening tools for Texas-compliant vetting

**Best For**: Homeowners who need a **fully integrated platform** with local Texas expertise.

---

## Conclusion: Streamline Your Property Management with TenantFlow

Managing multiple properties in the **Dallas-Fort Worth metroplex** doesn't have to be overwhelming. With the right **property management software** and **tools**, you can **e routine tasks**, **ensure compliance**, and **maximize your investment returns**.

**TenantFlow** offers a comprehensive solution designed specifically for Texas property managers, with features tailored to the unique needs of the DFW market. Our platform helps you **save time**, **reduce costs**, and **grow your portfolio** with confidence.

Ready to streamline your property management operations? **Start your free trial today** and discover why hundreds of DFW property owners trust TenantFlow to manage their investments.`,
					excerpt: 'Discover the best property management software and tools for managing multiple properties in the Dallas-Fort Worth area. Learn proven strategies for Texas landlords.',
					author: { id: '1', name: 'TenantFlow Team', avatarUrl: null },
					category: 'PROPERTY_MANAGEMENT' as BlogCategory,
					tags: [
						{ id: 'tag1', name: 'property management software', slug: 'property-management-software', color: '#2563eb', createdAt: new Date('2024-10-15') },
						{ id: 'tag2', name: 'Dallas Fort Worth', slug: 'dallas-fort-worth', color: '#2563eb', createdAt: new Date('2024-10-15') },
						{ id: 'tag3', name: 'DFW property management', slug: 'dfw-property-management', color: '#2563eb', createdAt: new Date('2024-10-15') },
						{ id: 'tag4', name: 'Texas landlords', slug: 'texas-landlords', color: '#2563eb', createdAt: new Date('2024-10-15') },
						{ id: 'tag5', name: 'multi-property management', slug: 'multi-property-management', color: '#2563eb', createdAt: new Date('2024-10-15') }
					],
					ogImage: '/blog_01.png',
					publishedAt: new Date('2024-10-15'),
					status: 'PUBLISHED' as const,
					featured: true,
					readTime: 12,
					viewCount: 156,
					createdAt: new Date('2024-10-15'),
					updatedAt: new Date('2024-10-15'),
					authorName: 'TenantFlow Team',
					metaTitle: 'Best Property Management Software for DFW - Dallas Fort Worth Guide',
					metaDescription: 'Complete guide to managing multiple properties in Dallas-Fort Worth. Find the best property management software, apps, and tools for Texas landlords.',
					searchKeywords: [
						'property management software',
						'Dallas Fort Worth',
						'DFW property management',
						'Texas landlords',
						'multi-property management'
					]
				}
			}

			// Return null for other slugs
			return null
		},
		enabled: !!slug, // Enable query when slug is provided
		...cacheConfig.longLived, // Blog articles are long-lived content
	})
}

/**
 * Hook for fetching list of blog articles with filtering and pagination
 * Enhanced with static data for recent articles
 */
export function useBlogArticles(
	filters: BlogFilters = {},
	pagination: BlogPagination = { page: 1, limit: 10 }
) {
	return useQuery({
		queryKey: queryKeys.blog.list(filters, pagination),
		queryFn: async () => {
			// Return static data with sample articles if not filtering for featured
			if (filters.featured === false) {
				const recentArticles: BlogArticleWithDetails[] = [
					{
						id: '2',
						title: 'Texas Landlord Laws: What Every Property Owner Must Know in 2024',
						slug: 'texas-landlord-laws-2024',
						description: 'Complete guide to Texas landlord-tenant laws, security deposits, eviction processes, and legal requirements for property owners.',
authorId: '2',
lastIndexed: new Date('2024-10-15'),
						content: 'Texas landlord laws have specific requirements...',
						excerpt: 'Stay compliant with Texas landlord laws. Learn about security deposits, eviction processes, and legal requirements for property owners in 2024.',
						authorName: 'Legal Team',
						metaTitle: 'Texas Landlord Laws 2024 - Complete Legal Guide',
						metaDescription: 'Complete guide to Texas landlord-tenant laws, security deposits, eviction processes, and legal requirements for property owners.',
						ogImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=450&fit=crop',
						category: 'LEGAL_ADVICE' as BlogCategory,
						status: 'PUBLISHED' as const,
						featured: false,
						publishedAt: new Date('2024-10-10'),
						readTime: 8,
						viewCount: 234,
						searchKeywords: ['Texas landlord laws', 'tenant rights', 'eviction process', 'security deposits'],
						createdAt: new Date('2024-10-10'),
						updatedAt: new Date('2024-10-10'),
						author: {
							id: '2',
							name: 'Legal Team',
							avatarUrl: null
						},
						tags: []
					},
					{
						id: '3',
						title: 'Property Tax Strategies for Texas Real Estate Investors',
						slug: 'property-tax-strategies-texas-investors',
						description: 'Proven strategies to minimize property taxes and maximize returns for Texas real estate investors.',
authorId: '3',
lastIndexed: new Date('2024-10-15'),
						content: 'Property tax management is crucial for Texas investors...',
						excerpt: 'Learn proven strategies to minimize property taxes and maximize your real estate investment returns in Texas.',
						authorName: 'Finance Team',
						metaTitle: 'Property Tax Strategies for Texas Real Estate Investors',
						metaDescription: 'Proven strategies to minimize property taxes and maximize returns for Texas real estate investors.',
						ogImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop',
						category: 'REAL_ESTATE' as BlogCategory,
						status: 'PUBLISHED' as const,
						featured: false,
						publishedAt: new Date('2024-10-05'),
						readTime: 6,
						viewCount: 189,
						searchKeywords: ['property tax', 'Texas real estate', 'tax strategies', 'investment returns'],
						createdAt: new Date('2024-10-05'),
						updatedAt: new Date('2024-10-05'),
						author: {
							id: '3',
							name: 'Finance Team',
							avatarUrl: null
						},
						tags: []
					},
					{
						id: '4',
						title: 'Smart Home Technology for Rental Properties: ROI and Tenant Attraction',
						slug: 'smart-home-technology-rental-properties',
						description: 'How smart home technology can increase rental income, attract quality tenants, and improve property management efficiency.',
authorId: '4',
lastIndexed: new Date('2024-10-15'),
						content: 'Smart home technology is revolutionizing rental properties...',
						excerpt: 'Discover how smart home technology can boost rental income, attract quality tenants, and streamline property management.',
						authorName: 'Technology Team',
						metaTitle: 'Smart Home Technology for Rental Properties - ROI Guide',
						metaDescription: 'How smart home technology can increase rental income, attract quality tenants, and improve property management efficiency.',
						ogImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop',
						category: 'TECHNOLOGY' as BlogCategory,
						status: 'PUBLISHED' as const,
						featured: false,
						publishedAt: new Date('2024-10-01'),
						readTime: 7,
						viewCount: 167,
						searchKeywords: ['smart home', 'rental properties', 'property technology', 'tenant attraction'],
						createdAt: new Date('2024-10-01'),
						updatedAt: new Date('2024-10-01'),
						author: {
							id: '4',
							name: 'Technology Team',
							avatarUrl: null
						},
						tags: []
					}
				]

				return {
					articles: recentArticles.slice(0, pagination.limit),
					total: recentArticles.length,
					hasMore: recentArticles.length > pagination.limit
				}
			}

			// Return empty data for other filters
			return {
				articles: [],
				total: 0,
				hasMore: false
			}
		},
		enabled: true, // Enable query to show articles
		...cacheConfig.business, // Article lists change occasionally
	})
}

/**
 * Hook for fetching featured blog articles
 * Enhanced with static data for DFW Property Management article
 */
export function useFeaturedBlogArticles(limit = 3) {
	return useQuery({
		queryKey: [...queryKeys.blog.featured(), limit],
		queryFn: async (): Promise<BlogArticleWithDetails[]> => {
			// Return static data with the new DFW article as featured
			const dfwArticle: BlogArticleWithDetails = {
				id: '1',
				title: 'Managing Multiple Properties in the DFW Metroplex: Best Property Management Software & Tools',
				slug: 'managing-multiple-properties-dfw-metroplex',
				description: 'Expert guide to managing multiple properties in Dallas-Fort Worth with the best property management software, apps, and tools for Texas landlords.',
				authorId: '1',
				lastIndexed: new Date('2024-10-15'),
				content: `Managing multiple properties in the **Dallas-Fort Worth (DFW) metroplex** requires the right tools and strategies. This comprehensive guide covers the best property management software, apps, and practices for Texas landlords.`,
				excerpt: 'Discover the best property management software and tools for managing multiple properties in the Dallas-Fort Worth area. Learn proven strategies for Texas landlords.',
				authorName: 'TenantFlow Team',
				metaTitle: 'Best Property Management Software for DFW - Dallas Fort Worth Guide',
				metaDescription: 'Complete guide to managing multiple properties in Dallas-Fort Worth. Find the best property management software, apps, and tools for Texas landlords.',
				ogImage: '/blog_01.png',
				category: 'PROPERTY_MANAGEMENT' as BlogCategory,
				status: 'PUBLISHED' as const,
				featured: true,
				publishedAt: new Date('2024-10-15'),
				readTime: 12,
				viewCount: 156,
				searchKeywords: ['property management software', 'Dallas Fort Worth', 'DFW property management', 'Texas landlords', 'multi-property management'],
				createdAt: new Date('2024-10-15'),
				updatedAt: new Date('2024-10-15'),
				author: {
					id: '1',
					name: 'TenantFlow Team',
					avatarUrl: null
				},
				tags: []
			}

			// Return array with the new article as featured
			return [dfwArticle].slice(0, limit)
		},
		enabled: true, // Enable query to show the new article
		...cacheConfig.longLived, // Featured articles are long-lived
	})
}

/**
 * Hook for fetching related articles
 * Temporarily disabled until BlogArticle table is created
 */
export function useRelatedBlogArticles(articleId: string, category: string, limit = 2) {
	return useQuery({
		queryKey: [...queryKeys.blog.related(articleId, category), limit],
		queryFn: async (): Promise<BlogArticleWithDetails[]> => {
			// Temporarily return empty array until BlogArticle table is created
			return []
		},
		enabled: false, // Disable query to prevent 400 errors
		...cacheConfig.longLived, // Related articles are long-lived when enabled
	})
}

/**
 * Hook for fetching blog tags
 * Temporarily disabled until BlogTag table is created
 */
export function useBlogTags() {
	return useQuery({
		queryKey: queryKeys.blog.tags(),
		queryFn: async () => {
			// Temporarily return empty array until BlogTag table is created
			return []
		},
		enabled: false, // Disable query to prevent 400 errors
		...cacheConfig.longLived, // Tags don't change often when enabled
	})
}

interface UseBlogArticleDataProps {
	slug?: string
}

/**
 * Enhanced hook for managing blog article data and content processing
 * Replaces hardcoded data with database-driven content
 */
export function useBlogArticleData({ slug }: UseBlogArticleDataProps) {
	// queryClient not currently used but available for cache operations

	// Fetch article data
	const { data: article, isLoading, error, isError } = useBlogArticle(slug || '')

	// Fetch related articles if we have an article
	const { data: relatedArticles } = useRelatedBlogArticles(
		article?.id || '',
		article?.category || '',
		2
	)

	// Validate article exists and is published
	const isValidSlug = useMemo(() => {
		// While loading, consider slug potentially valid if no error
		if (isLoading) return !!slug && !isError
		// After loading, check if article was found
		return slug && article !== null && !isError
	}, [slug, article, isError, isLoading])

	// Process article content for HTML rendering
	const processedContent = useMemo(() => {
		if (!article?.content) return ''

		let content = article.content

		// Check if content is already HTML (contains HTML tags)
		const isHtml = /<[a-z][\s\S]*>/i.test(content)

		if (isHtml) {
			// Content is already HTML, return as-is
			return content
		}

		// Content is Markdown, convert to HTML
		// Process headers
		content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>')
		content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>')
		content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>')
		content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
		content = content.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
		content = content.replace(/^###### (.+)$/gm, '<h6>$1</h6>')

		// Process bold and italic
		content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		content = content.replace(/\*(.*?)\*/g, '<em>$1</em>')

		// Process inline code
		content = content.replace(/`([^`]+)`/g, '<code>$1</code>')

		// Process blockquotes
		content = content.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

		// Process horizontal rules
		content = content.replace(/^---$/gm, '<hr>')

		// Process links
		content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

		// Process lists (simplified)
		content = content.replace(/^\* (.+)$/gm, '<li>$1</li>')
		content = content.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')

		// Wrap consecutive li elements in ul/ol
		content = content.replace(/(<li>.*<\/li>\s*)+/gs, (match: string) => {
			return `<ul>${match}</ul>`
		})

		// Process paragraphs
		const paragraphs = content.split('\n\n')
		content = paragraphs
			.map((paragraph: string) => {
				const trimmed = paragraph.trim()
				if (!trimmed) return ''

				// Skip already processed elements
				if (
					trimmed.startsWith('<h') ||
					trimmed.startsWith('<ul') ||
					trimmed.startsWith('<ol') ||
					trimmed.startsWith('<blockquote') ||
					trimmed.startsWith('<hr') ||
					trimmed.startsWith('<div')
				) {
					return trimmed
				}

				// Don't wrap if it contains line breaks (likely a list or complex content)
				if (trimmed.includes('\n')) {
					return trimmed.replace(/\n/g, '<br />')
				}

				return `<p>${trimmed}</p>`
			})
			.join('\n\n')

		return content
	}, [article?.content])

	// Generate SEO data
	const seoData = useMemo((): BlogSEOData | null => {
		if (!article) return null

		return {
			title: article.metaTitle || article.title,
			description: article.metaDescription || article.description,
			keywords: article.searchKeywords || [],
			ogImage: article.ogImage || undefined,
			canonicalUrl: `/blog/${article.slug}`,
			publishedAt: article.publishedAt || undefined,
			updatedAt: article.updatedAt,
			author: article.authorName,
			category: article.category,
			readTime: article.readTime || undefined
		}
	}, [article])

	// Animation configuration
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

	// Prefetch related articles for better UX  
	const prefetchRelatedArticles = () => {
		// Future: When blog API is implemented, this will prefetch related articles
		logger.debug('Prefetching related articles', undefined, { count: relatedArticles?.length || 0 })
	}

	return {
		// Article data
		article,
		relatedArticles: relatedArticles || [],

		// State
		isLoading,
		isError,
		error,
		isValidSlug,

		// Processed content
		processedContent,
		seoData,

		// Utils
		fadeInUp,
		prefetchRelatedArticles
	}
}

/**
 * Helper function to format article date
 */
export function formatArticleDate(date: string | Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

/**
 * Helper function to calculate estimated read time
 */
export function calculateReadTime(content: string): number {
	const wordsPerMinute = 200
	const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
	return Math.ceil(words / wordsPerMinute)
}

/**
 * Helper function to generate article excerpt
 */
export function generateExcerpt(content: string, maxLength = 160): string {
	const text = content.replace(/<[^>]*>/g, '').trim()
	if (text.length <= maxLength) return text

	const truncated = text.substring(0, maxLength)
	const lastSpace = truncated.lastIndexOf(' ')

	return lastSpace > 0
		? truncated.substring(0, lastSpace) + '...'
		: truncated + '...'
}
