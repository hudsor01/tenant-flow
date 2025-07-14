/**
 * Internal linking strategy for improved SEO and user engagement
 * Automatically suggests relevant internal links based on content
 */

export interface InternalLink {
	text: string
	url: string
	title: string
	relevanceScore: number
}

export interface ContentKeywords {
	primary: string[]
	secondary: string[]
	location?: string
}

/**
 * Core internal link opportunities mapped to target pages
 */
const INTERNAL_LINK_MAP: Record<string, InternalLink[]> = {
	// Property management related keywords
	'property management': [
		{
			text: 'property management software',
			url: '/',
			title: 'TenantFlow Property Management Platform',
			relevanceScore: 1.0
		},
		{
			text: 'pricing plans',
			url: '/pricing',
			title: 'TenantFlow Pricing Plans',
			relevanceScore: 0.9
		}
	],

	// Lease agreement keywords
	'lease agreement': [
		{
			text: 'lease generator',
			url: '/tools/lease-generator',
			title: 'Free Lease Agreement Generator',
			relevanceScore: 1.0
		},
		{
			text: 'state-specific lease templates',
			url: '/lease-generator/states',
			title: 'State-Specific Lease Templates',
			relevanceScore: 0.9
		}
	],

	// Landlord specific keywords
	landlord: [
		{
			text: 'landlord tools',
			url: '/',
			title: 'Essential Landlord Management Tools',
			relevanceScore: 0.9
		},
		{
			text: 'tenant screening guide',
			url: '/blog/tenant-screening-process',
			title: 'Complete Tenant Screening Process Guide',
			relevanceScore: 0.8
		}
	],

	// Legal and compliance keywords
	'tenant rights': [
		{
			text: 'California landlord guide',
			url: '/blog/california-landlord-guide-2025',
			title: 'California Landlord Legal Requirements 2025',
			relevanceScore: 0.9
		}
	],

	// Software comparison keywords
	'software comparison': [
		{
			text: 'property management software comparison',
			url: '/blog/property-management-software-comparison-2025',
			title: 'Property Management Software Comparison 2025',
			relevanceScore: 1.0
		}
	],

	// State-specific keywords
	california: [
		{
			text: 'California lease generator',
			url: '/lease-generator/california',
			title: 'California Lease Agreement Generator',
			relevanceScore: 1.0
		},
		{
			text: 'California landlord laws',
			url: '/blog/california-landlord-guide-2025',
			title: 'California Landlord Legal Guide 2025',
			relevanceScore: 0.9
		}
	],

	'new york': [
		{
			text: 'New York lease generator',
			url: '/lease-generator/new-york',
			title: 'New York Lease Agreement Generator',
			relevanceScore: 1.0
		}
	],

	texas: [
		{
			text: 'Texas lease generator',
			url: '/lease-generator/texas',
			title: 'Texas Lease Agreement Generator',
			relevanceScore: 1.0
		}
	]
}

/**
 * High-value linking opportunities for specific page types
 */
const PAGE_SPECIFIC_LINKS: Record<string, InternalLink[]> = {
	// Blog article internal linking
	blog: [
		{
			text: 'create a lease agreement',
			url: '/tools/lease-generator',
			title: 'Generate Professional Lease Agreements',
			relevanceScore: 0.9
		},
		{
			text: 'property management dashboard',
			url: '/dashboard',
			title: 'TenantFlow Property Management Dashboard',
			relevanceScore: 0.8
		},
		{
			text: 'start your free trial',
			url: '/auth/signup',
			title: 'Start Your Free TenantFlow Trial',
			relevanceScore: 0.7
		}
	],

	// State lease generator cross-linking
	'lease-generator': [
		{
			text: 'property management software',
			url: '/',
			title: 'Complete Property Management Solution',
			relevanceScore: 0.8
		},
		{
			text: 'tenant screening process',
			url: '/blog/tenant-screening-process',
			title: 'Comprehensive Tenant Screening Guide',
			relevanceScore: 0.7
		}
	],

	// Pricing page internal links
	pricing: [
		{
			text: 'lease generator',
			url: '/tools/lease-generator',
			title: 'Free Lease Agreement Generator',
			relevanceScore: 0.9
		},
		{
			text: 'property management features',
			url: '/',
			title: 'TenantFlow Features and Benefits',
			relevanceScore: 0.8
		}
	]
}

/**
 * Generate contextual internal links based on content keywords
 */
export function generateInternalLinks(
	keywords: ContentKeywords,
	currentPath: string,
	maxLinks = 3
): InternalLink[] {
	const suggestions: InternalLink[] = []
	const usedUrls = new Set<string>()

	// Add current path to avoid self-linking
	usedUrls.add(currentPath)

	// Process primary keywords first (higher relevance)
	for (const keyword of keywords.primary) {
		const links = INTERNAL_LINK_MAP[keyword.toLowerCase()]
		if (links) {
			for (const link of links) {
				if (!usedUrls.has(link.url) && suggestions.length < maxLinks) {
					suggestions.push({
						...link,
						relevanceScore: link.relevanceScore * 1.2 // Boost primary keyword relevance
					})
					usedUrls.add(link.url)
				}
			}
		}
	}

	// Process secondary keywords
	for (const keyword of keywords.secondary) {
		const links = INTERNAL_LINK_MAP[keyword.toLowerCase()]
		if (links) {
			for (const link of links) {
				if (!usedUrls.has(link.url) && suggestions.length < maxLinks) {
					suggestions.push(link)
					usedUrls.add(link.url)
				}
			}
		}
	}

	// Add page-specific contextual links
	const pageType = getPageType(currentPath)
	const pageLinks = PAGE_SPECIFIC_LINKS[pageType]
	if (pageLinks) {
		for (const link of pageLinks) {
			if (!usedUrls.has(link.url) && suggestions.length < maxLinks) {
				suggestions.push(link)
				usedUrls.add(link.url)
			}
		}
	}

	// Sort by relevance score and return top suggestions
	return suggestions
		.sort((a, b) => b.relevanceScore - a.relevanceScore)
		.slice(0, maxLinks)
}

/**
 * Determine page type from URL path for contextual linking
 */
function getPageType(path: string): string {
	if (path.startsWith('/blog')) return 'blog'
	if (path.startsWith('/lease-generator')) return 'lease-generator'
	if (path.includes('/pricing')) return 'pricing'
	return 'general'
}

/**
 * State-specific internal linking for lease generators
 */
export function generateStateSpecificLinks(stateName: string): InternalLink[] {
	const stateKey = stateName.toLowerCase().replace(/\s+/g, '-')

	return [
		{
			text: `${stateName} lease template`,
			url: `/lease-generator/${stateKey}`,
			title: `Free ${stateName} Lease Agreement Template`,
			relevanceScore: 1.0
		},
		{
			text: 'other state templates',
			url: '/lease-generator/states',
			title: 'All State Lease Agreement Templates',
			relevanceScore: 0.8
		},
		{
			text: 'property management software',
			url: '/',
			title: 'Complete Property Management Solution',
			relevanceScore: 0.7
		}
	]
}

/**
 * Blog category cross-linking
 */
export const BLOG_CATEGORY_LINKS: Record<string, InternalLink[]> = {
	Legal: [
		{
			text: 'tenant screening guide',
			url: '/blog/tenant-screening-process',
			title: 'Legal Tenant Screening Process',
			relevanceScore: 0.9
		},
		{
			text: 'California landlord laws',
			url: '/blog/california-landlord-guide-2025',
			title: 'California Landlord Legal Requirements',
			relevanceScore: 0.8
		}
	],

	Technology: [
		{
			text: 'software comparison guide',
			url: '/blog/property-management-software-comparison-2025',
			title: 'Property Management Software Comparison 2025',
			relevanceScore: 1.0
		}
	],

	'Property Management': [
		{
			text: 'lease generator tool',
			url: '/tools/lease-generator',
			title: 'Professional Lease Agreement Generator',
			relevanceScore: 0.9
		}
	]
}

/**
 * Generate related article suggestions for blog sidebar
 */
export function generateRelatedArticles(
	currentCategory: string,
	currentSlug: string,
	maxArticles = 3
): InternalLink[] {
	const categoryLinks = BLOG_CATEGORY_LINKS[currentCategory] || []

	return categoryLinks
		.filter(link => !link.url.includes(currentSlug))
		.slice(0, maxArticles)
}
