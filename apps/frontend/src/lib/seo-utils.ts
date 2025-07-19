/**
 * SEO utilities for optimized meta data and structured data
 */

export interface SEOData {
	title: string
	description: string
	keywords: string
	canonical?: string
	image?: string
	structuredData?: Record<string, unknown>
	breadcrumb?: { name: string; url: string }[]
}

/**
 * High-converting title templates optimized for click-through rates
 */
export const titleTemplates = {
	guide: (state: string) =>
		`Free ${state} Lease Agreement Template 2025 - Download PDF`,
	generator: (state: string) =>
		`${state} Lease Generator - Create Legal Rental Agreements Instantly`,
	comparison:
		'Best Property Management Software 2025 - Compare Top 10 Platforms',
	pricing: 'TenantFlow Pricing - Simple Plans for Every Property Portfolio',
	blog: (title: string) => `${title} - TenantFlow Property Management Guide`
}

/**
 * High-converting meta descriptions optimized for search intent
 */
export const descriptionTemplates = {
	guide: (state: string) =>
		`Download a free, legally compliant ${state} lease agreement template. State-specific clauses, PDF format, ready to use. Trusted by 10,000+ landlords.`,
	generator: (state: string) =>
		`Create  ${state} lease agreements in minutes. State-specific templates, legal compliance built-in, instant PDF download. Start free today.`,
	comparison:
		'Compare the top 10 property management software platforms of 2025. Features, pricing, pros & cons. Find the perfect solution for your rental portfolio.',
	pricing:
		'Simple, transparent pricing for modern property management. Start free, upgrade as you grow. Trusted by landlords managing 50,000+ units nationwide.',
	blog: (excerpt: string) => excerpt
}

/**
 * Generate state-specific SEO data
 */
export function generateStateSEO(state: string, isGenerator = false): SEOData {
	const stateFormatted = state
		.replace(/-/g, ' ')
		.replace(/\b\w/g, l => l.toUpperCase())

	const template = isGenerator ? 'generator' : 'guide'

	return {
		title: titleTemplates[template](stateFormatted),
		description: descriptionTemplates[template](stateFormatted),
		keywords: `${state} lease agreement, ${state} rental contract, ${state} lease template, ${state} landlord forms, ${state} tenant agreement, property management ${state}`,
		canonical: `https://tenantflow.app/lease-generator/${state}`,
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: titleTemplates[template](stateFormatted),
			description: descriptionTemplates[template](stateFormatted),
			url: `https://tenantflow.app/lease-generator/${state}`,
			mainEntity: {
				'@type': 'SoftwareApplication',
				name: `${stateFormatted} Lease Generator`,
				applicationCategory: 'BusinessApplication',
				description: `Generate legally compliant lease agreements for ${stateFormatted}`,
				operatingSystem: 'Web Browser',
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
					availability: 'https://schema.org/InStock'
				}
			}
		},
		breadcrumb: [
			{ name: 'Lease Generator', url: '/lease-generator' },
			{ name: 'States', url: '/lease-generator/states' },
			{ name: stateFormatted, url: `/lease-generator/${state}` }
		]
	}
}

/**
 * Generate blog article SEO data
 */
export function generateBlogSEO(
	article: {
		title: string
		description: string
		publishedAt: string
		author: string
		category: string
		tags: string[]
		image?: string
	} | null,
	slug: string
): SEOData {
	// Handle null article case (loading state)
	if (!article) {
		return {
			title: 'Loading Article... | TenantFlow Blog',
			description: 'Loading blog article...',
			keywords: '',
			canonical: `https://tenantflow.app/blog/${slug}`,
			structuredData: undefined,
			breadcrumb: [
				{ name: 'Home', url: '/' },
				{ name: 'Blog', url: '/blog' },
				{ name: 'Loading...', url: `/blog/${slug}` }
			]
		}
	}
	return {
		title: titleTemplates.blog(article.title),
		description: article.description,
		keywords: article.tags.join(', '),
		canonical: `https://tenantflow.app/blog/${slug}`,
		image: article.image,
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: article.title,
			description: article.description,
			author: {
				'@type': 'Organization',
				name: article.author
			},
			publisher: {
				'@type': 'Organization',
				name: 'TenantFlow',
				logo: {
					'@type': 'ImageObject',
					url: 'https://tenantflow.app/logo.png'
				}
			},
			datePublished: article.publishedAt,
			dateModified: article.publishedAt,
			mainEntityOfPage: {
				'@type': 'WebPage',
				'@id': `https://tenantflow.app/blog/${slug}`
			},
			keywords: article.tags.join(', '),
			articleSection: article.category,
			...(article.image && {
				image: {
					'@type': 'ImageObject',
					url: article.image,
					width: 1200,
					height: 630
				}
			})
		},
		breadcrumb: [
			{ name: 'Blog', url: '/blog' },
			{
				name: article.category,
				url: `/blog?category=${article.category.toLowerCase()}`
			},
			{ name: article.title, url: `/blog/${slug}` }
		]
	}
}

/**
 * Generate pricing page SEO data
 */
export function generatePricingSEO(): SEOData {
	return {
		title: titleTemplates.pricing,
		description: descriptionTemplates.pricing,
		keywords:
			'property management pricing, rental software cost, landlord software pricing, property management fees, TenantFlow pricing',
		canonical: 'https://tenantflow.app/pricing',
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'TenantFlow Property Management Software',
			description:
				'Modern property management software for landlords and property managers',
			brand: {
				'@type': 'Brand',
				name: 'TenantFlow'
			},
			offers: [
				{
					'@type': 'Offer',
					name: 'Starter Plan',
					price: '49',
					priceCurrency: 'USD',
					priceValidUntil: '2025-12-31',
					availability: 'https://schema.org/InStock',
					seller: {
						'@type': 'Organization',
						name: 'TenantFlow'
					}
				},
				{
					'@type': 'Offer',
					name: 'Growth Plan',
					price: '149',
					priceCurrency: 'USD',
					priceValidUntil: '2025-12-31',
					availability: 'https://schema.org/InStock',
					seller: {
						'@type': 'Organization',
						name: 'TenantFlow'
					}
				},
				{
					'@type': 'Offer',
					name: 'Enterprise Plan',
					price: '399',
					priceCurrency: 'USD',
					priceValidUntil: '2025-12-31',
					availability: 'https://schema.org/InStock',
					seller: {
						'@type': 'Organization',
						name: 'TenantFlow'
					}
				}
			]
		},
		breadcrumb: [{ name: 'Pricing', url: '/pricing' }]
	}
}

/**
 * Generate FAQ structured data for higher search visibility
 */
export function generateFAQStructuredData(
	faqs: { question: string; answer: string }[]
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer
			}
		}))
	}
}

/**
 * Generate How-To structured data for tutorial content
 */
export function generateHowToStructuredData(
	title: string,
	steps: { name: string; text: string }[]
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'HowTo',
		name: title,
		description: `Learn how to ${title.toLowerCase()}`,
		step: steps.map((step, index) => ({
			'@type': 'HowToStep',
			position: index + 1,
			name: step.name,
			text: step.text
		}))
	}
}

/**
 * Generate Organization structured data for better brand recognition
 */
export function generateOrganizationStructuredData() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'TenantFlow',
		url: 'https://tenantflow.app',
		logo: 'https://tenantflow.app/logo.png',
		description:
			'Modern property management software for landlords and property managers',
		foundingDate: '2024',
		sameAs: [
			'https://twitter.com/tenantflow',
			'https://linkedin.com/company/tenantflow'
		],
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			email: 'support@tenantflow.app',
			url: 'https://tenantflow.app/contact'
		}
	}
}
