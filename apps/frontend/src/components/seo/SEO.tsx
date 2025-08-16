'use client'

import { useEffect } from 'react'
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateLocalBusinessSchema,
  generateProductSchema,
} from '@/lib/seo/generate-metadata'

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQ {
  question: string
  answer: string
}

interface SEOProps {
	title?: string
	description?: string
	keywords?: string
	image?: string
	url?: string
	type?: 'website' | 'article' | 'product'
	noIndex?: boolean
	canonical?: string
	structuredData?: Record<string, unknown>
	breadcrumb?: BreadcrumbItem[]
	// Enhanced SEO features
	faqs?: FAQ[]
	includeLocalBusiness?: boolean
	includeProduct?: boolean
	customSchema?: Record<string, unknown>[]
}

const DEFAULT_SEO = {
	title: 'TenantFlow - Modern Property Management Software',
	description:
		'Streamline your property management with TenantFlow. Manage tenants, properties, maintenance requests, and finances all in one powerful platform.',
	keywords:
		'property management, tenant management, rental properties, maintenance tracking, property software, real estate management',
	image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=630&fit=crop&crop=edges',
	type: 'website' as const
}

export function SEO({
	title,
	description = DEFAULT_SEO.description,
	keywords = DEFAULT_SEO.keywords,
	image = DEFAULT_SEO.image,
	url,
	type = DEFAULT_SEO.type,
	noIndex = false,
	canonical,
	structuredData,
	breadcrumb,
	// Enhanced SEO features
	faqs,
	includeLocalBusiness = false,
	includeProduct = false,
	customSchema = [],
}: SEOProps) {
	const siteTitle = title ? `${title} | TenantFlow` : DEFAULT_SEO.title

	const fullImageUrl = image?.startsWith('http')
		? image
		: `${window.location.origin}${image}`

	const fullUrl = url || window.location.href

	useEffect(() => {
		// Update document title
		document.title = siteTitle

		// Helper function to update or create meta tags
		const updateMetaTag = (
			property: string,
			content: string,
			useProperty = false
		) => {
			const selector = useProperty
				? `meta[property="${property}"]`
				: `meta[name="${property}"]`
			let tag = document.querySelector(selector) as HTMLMetaElement

			if (!tag) {
				tag = document.createElement('meta')
				if (useProperty) {
					tag.setAttribute('property', property)
				} else {
					tag.setAttribute('name', property)
				}
				document.head.appendChild(tag)
			}
			tag.setAttribute('content', content)
		}

		// Update basic meta tags
		updateMetaTag('description', description)
		updateMetaTag('keywords', keywords)
		updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow')
		updateMetaTag('author', 'TenantFlow')

		// Search engine verification meta tags (replace with actual verification codes)
		updateMetaTag(
			'google-site-verification',
			'YOUR_GOOGLE_VERIFICATION_CODE_HERE'
		)
		updateMetaTag('msvalidate.01', 'YOUR_BING_VERIFICATION_CODE_HERE')
		updateMetaTag(
			'yandex-verification',
			'YOUR_YANDEX_VERIFICATION_CODE_HERE'
		)

		// Update Open Graph tags
		updateMetaTag('og:type', type, true)
		updateMetaTag('og:title', siteTitle, true)
		updateMetaTag('og:description', description, true)
		updateMetaTag('og:image', fullImageUrl, true)
		updateMetaTag('og:image:width', '1200', true)
		updateMetaTag('og:image:height', '630', true)
		updateMetaTag(
			'og:image:alt',
			`${siteTitle} - Property Management Software`,
			true
		)
		updateMetaTag('og:url', fullUrl, true)
		updateMetaTag('og:site_name', 'TenantFlow', true)
		updateMetaTag('og:locale', 'en_US', true)

		// Update Twitter Card tags
		updateMetaTag('twitter:card', 'summary_large_image')
		updateMetaTag('twitter:title', siteTitle)
		updateMetaTag('twitter:description', description)
		updateMetaTag('twitter:image', fullImageUrl)
		updateMetaTag(
			'twitter:image:alt',
			`${siteTitle} - Property Management Software`
		)

		// Facebook-specific meta tags for better scraping
		updateMetaTag('fb:app_id', 'YOUR_FACEBOOK_APP_ID') // Replace with actual Facebook App ID if you have one
		updateMetaTag('og:image:type', 'image/jpeg', true)
		updateMetaTag('og:image:secure_url', fullImageUrl, true)

		// Update canonical link
		if (canonical) {
			let canonicalLink = document.querySelector(
				'link[rel="canonical"]'
			) as HTMLLinkElement
			if (!canonicalLink) {
				canonicalLink = document.createElement('link')
				canonicalLink.setAttribute('rel', 'canonical')
				document.head.appendChild(canonicalLink)
			}
			canonicalLink.setAttribute('href', canonical)
		}

		// Add structured data (JSON-LD)
		const addStructuredData = (data: Record<string, unknown>) => {
			// Remove existing structured data script
			const existingScript = document.querySelector(
				'script[type="application/ld+json"][data-seo]'
			)
			if (existingScript) {
				existingScript.remove()
			}

			// Create new structured data script
			const script = document.createElement('script')
			script.type = 'application/ld+json'
			script.setAttribute('data-seo', 'true')
			script.textContent = JSON.stringify(data)
			document.head.appendChild(script)
		}

		// Default structured data for the website
		const defaultStructuredData = {
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: 'TenantFlow',
			applicationCategory: 'BusinessApplication',
			description:
				'Modern property management software for landlords and property managers',
			url: 'https://tenantflow.app',
			operatingSystem: 'Web Browser',
			offers: {
				'@type': 'Offer',
				price: '49',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31'
			},
			publisher: {
				'@type': 'Organization',
				name: 'TenantFlow',
				url: 'https://tenantflow.app'
			}
		}

		// Use custom structured data or default
		const finalStructuredData = structuredData || defaultStructuredData
		addStructuredData(finalStructuredData)

		// Enhanced schema generation
		const schemas = []

		// Add breadcrumb schema
		if (breadcrumb && breadcrumb.length > 0) {
			schemas.push(generateBreadcrumbSchema(breadcrumb))
		}

		// Add FAQ schema
		if (faqs && faqs.length > 0) {
			schemas.push(generateFAQSchema(faqs))
		}

		// Add local business schema
		if (includeLocalBusiness) {
			schemas.push(generateLocalBusinessSchema())
		}

		// Add product schema
		if (includeProduct) {
			schemas.push(generateProductSchema())
		}

		// Add custom schemas
		if (customSchema.length > 0) {
			schemas.push(...customSchema)
		}

		// Add all enhanced schemas to the page
		schemas.forEach((schema, index) => {
			const script = document.createElement('script')
			script.type = 'application/ld+json'
			script.setAttribute('data-enhanced-seo', `true-${index}`)
			script.textContent = JSON.stringify(schema)
			document.head.appendChild(script)
		})

		// Cleanup function to reset title and remove structured data when component unmounts
		return () => {
			document.title = DEFAULT_SEO.title
			const structuredDataScript = document.querySelector(
				'script[type="application/ld+json"][data-seo]'
			)
			if (structuredDataScript) {
				structuredDataScript.remove()
			}
			// Remove all enhanced SEO scripts
			const enhancedScripts = document.querySelectorAll(
				'script[type="application/ld+json"][data-enhanced-seo]'
			)
			enhancedScripts.forEach(script => script.remove())
		}
	}, [
		siteTitle,
		description,
		keywords,
		fullImageUrl,
		fullUrl,
		type,
		noIndex,
		canonical,
		structuredData,
		breadcrumb,
		faqs,
		includeLocalBusiness,
		includeProduct,
		customSchema,
	])

	return null // This component doesn't render anything visually
}
