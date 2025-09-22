import type { Metadata } from 'next'

export const siteMetadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'),
	title: 'TenantFlow - Simplify Property Management | Professional Property Management Software',
	description: "Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business with TenantFlow's enterprise platform.",
	keywords: 'property management software, rental property management, property manager tools, real estate management platform, tenant management system, landlord software, property portfolio management',
	authors: [{ name: 'TenantFlow' }],
	creator: 'TenantFlow',
	publisher: 'TenantFlow',
	robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
	verification: { google: 'google-site-verification-code-here' },
	category: 'Real Estate Software',
	classification: 'Business Software',
	alternates: {
		canonical: 'https://tenantflow.app',
		languages: { 'en-US': 'https://tenantflow.app' }
	},
	openGraph: {
		title: 'TenantFlow - Simplify Property Management',
		description: 'Professional property management software trusted by thousands. Streamline operations and scale your business.',
		url: 'https://tenantflow.app',
		siteName: 'TenantFlow',
		type: 'website',
		locale: 'en_US',
		images: [
			{
				url: '/assets/images/property-management-og.jpg',
				width: 1200,
				height: 630,
				alt: 'TenantFlow Property Management Dashboard',
				type: 'image/jpeg'
			},
			{
				url: '/tenant-flow-logo.png',
				width: 800,
				height: 600,
				alt: 'TenantFlow Logo',
				type: 'image/png'
			}
		]
	},
	twitter: {
		card: 'summary_large_image',
		title: 'TenantFlow - Simplify Property Management',
		description: 'Professional property management software trusted by thousands. Streamline operations and scale your business.',
		creator: '@tenantflow',
		images: ['/assets/images/property-management-og.jpg']
	},
	applicationName: 'TenantFlow',
	referrer: 'origin-when-cross-origin',
	generator: 'Next.js',
	formatDetection: { email: false, address: false, telephone: false },
	icons: {
		icon: [
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
		],
		apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
		other: [
			{
				url: '/safari-pinned-tab.svg',
				rel: 'mask-icon',
				color: 'var(--color-system-blue)'
			}
		]
	},
	manifest: '/manifest.json'
}

export const structuredData = {
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: 'TenantFlow',
	applicationCategory: 'BusinessApplication',
	applicationSubCategory: 'Property Management Software',
	operatingSystem: 'Web Browser',
	description: 'Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business.',
	url: 'https://tenantflow.app',
	author: {
		'@type': 'Organization',
		name: 'TenantFlow',
		url: 'https://tenantflow.app'
	},
	offers: {
		'@type': 'Offer',
		category: 'SaaS',
		priceSpecification: {
			'@type': 'PriceSpecification',
			price: '0',
			priceCurrency: 'USD',
			description: 'Free trial available'
		}
	},
	screenshot: 'https://tenantflow.app/assets/images/property-management-og.jpg',
	featureList: [
		'Property Management',
		'Tenant Management',
		'Rent Collection',
		'Maintenance Tracking',
		'Financial Reporting',
		'Automated Workflows'
	],
	aggregateRating: {
		'@type': 'AggregateRating',
		ratingValue: '4.8',
		reviewCount: '1250'
	}
}