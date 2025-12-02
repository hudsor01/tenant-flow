import Head from 'next/head'

interface SEOHeadProps {
	title?: string
	description?: string
	keywords?: string[]
	ogImage?: string
	canonicalUrl?: string
	articleData?: {
		author?: string
		publishedTime?: string
		modifiedTime?: string
		section?: string
		tags?: string[]
	}
	productData?: {
		price?: string
		currency?: string
		availability?: string
		rating?: number
		reviewCount?: number
	}
}

export function SEOHead({
	title = 'TenantFlow - Simplify Property Management',
	description = 'Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business.',
	keywords = [
		'property management software',
		'rental property management',
		'property manager tools',
		'real estate management platform',
		'tenant management system',
		'property owner software'
	],
	ogImage = '/images/property-management-og.jpg',
	canonicalUrl,
	articleData,
	productData
}: SEOHeadProps) {
	const fullTitle = title.includes('TenantFlow')
		? title
		: `${title} | TenantFlow`
	const keywordString = Array.isArray(keywords) ? keywords.join(', ') : ''

	return (
		<Head>
			{/* Basic Meta Tags */}
			<title>{fullTitle}</title>
			<meta name="description" content={description} />
			<meta name="keywords" content={keywordString} />
			<meta name="robots" content="index, follow, max-image-preview:large" />

			{/* Canonical URL */}
			{canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

			{/* Open Graph Meta Tags */}
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:image" content={`https://tenantflow.app${ogImage}`} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta property="og:image:alt" content={`${title} - TenantFlow`} />
			<meta
				property="og:url"
				content={canonicalUrl || 'https://tenantflow.app'}
			/>
			<meta property="og:type" content={articleData ? 'article' : 'website'} />
			<meta property="og:site_name" content="TenantFlow" />
			<meta property="og:locale" content="en_US" />

			{/* Article-specific OG tags */}
			{articleData && (
				<>
					{articleData.author && (
						<meta property="article:author" content={articleData.author} />
					)}
					{articleData.publishedTime && (
						<meta
							property="article:published_time"
							content={articleData.publishedTime}
						/>
					)}
					{articleData.modifiedTime && (
						<meta
							property="article:modified_time"
							content={articleData.modifiedTime}
						/>
					)}
					{articleData.section && (
						<meta property="article:section" content={articleData.section} />
					)}
					{articleData.tags?.map(tag => (
						<meta key={tag} property="article:tag" content={tag} />
					))}
				</>
			)}

			{/* Twitter Meta Tags */}
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:site" content="@tenantflow" />
			<meta name="twitter:creator" content="@tenantflow" />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:description" content={description} />
			<meta name="twitter:image" content={`https://tenantflow.app${ogImage}`} />
			<meta name="twitter:image:alt" content={`${title} - TenantFlow`} />

			{/* Additional SEO Meta Tags */}
			<meta name="author" content="TenantFlow" />
			<meta name="publisher" content="TenantFlow" />
			<meta
				name="copyright"
				content="© 2025 TenantFlow. All rights reserved."
			/>
			<meta name="language" content="EN" />
			<meta name="distribution" content="global" />
			<meta name="rating" content="general" />
			<meta name="revisit-after" content="7 days" />

			{/* Structured Data for Software */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'SoftwareApplication',
						name: 'TenantFlow',
						applicationCategory: 'BusinessApplication',
						applicationSubCategory: 'Property Management Software',
						operatingSystem: 'Web Browser',
						description: description,
						url: canonicalUrl || 'https://tenantflow.app',
						screenshot: `https://tenantflow.app${ogImage}`,
						author: {
							'@type': 'Organization',
							'@id': 'https://tenantflow.app/#organization',
							name: 'TenantFlow',
							url: 'https://tenantflow.app',
							logo: 'https://tenantflow.app/tenant-flow-logo.png'
						},
						provider: {
							'@type': 'Organization',
							'@id': 'https://tenantflow.app/#organization'
						},
						offers: productData
							? {
									'@type': 'Offer',
									price: productData.price || '0',
									priceCurrency: productData.currency || 'USD',
									availability: `https://schema.org/${productData.availability || 'InStock'}`,
									priceSpecification: {
										'@type': 'PriceSpecification',
										price: productData.price || '0',
										priceCurrency: productData.currency || 'USD'
									}
								}
							: {
									'@type': 'Offer',
									price: '0',
									priceCurrency: 'USD',
									availability: 'https://schema.org/InStock'
								},
						aggregateRating: productData?.rating
							? {
									'@type': 'AggregateRating',
									ratingValue: productData.rating,
									reviewCount: productData.reviewCount || 100,
									bestRating: 5,
									worstRating: 1
								}
							: {
									'@type': 'AggregateRating',
									ratingValue: 4.8,
									reviewCount: 1250,
									bestRating: 5,
									worstRating: 1
								},
						featureList: [
							'Property Management',
							'Tenant Management',
							'Rent Collection',
							'Maintenance Tracking',
							'Financial Reporting',
							'Automated Workflows',
							'Real-time Analytics',
							'Mobile Applications'
						]
					})
				}}
			/>

			{/* Organization Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Organization',
						'@id': 'https://tenantflow.app/#organization',
						name: 'TenantFlow',
						url: 'https://tenantflow.app',
						logo: {
							'@type': 'ImageObject',
							url: 'https://tenantflow.app/tenant-flow-logo.png',
							width: 800,
							height: 600
						},
						sameAs: [
							'https://twitter.com/tenantflow',
							'https://linkedin.com/company/tenantflow'
						],
						contactPoint: {
							'@type': 'ContactPoint',
							contactType: 'customer service',
							url: 'https://tenantflow.app/contact'
						}
					})
				}}
			/>
		</Head>
	)
}
