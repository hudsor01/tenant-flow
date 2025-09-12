import type { Metadata } from 'next/types'
import '../styles/globals.css'
import { AuthStoreProvider } from '@/stores/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import PostHogClientProvider from '@/providers/posthog-provider'
import { GlobalLoadingIndicator } from '@/components/global-loading-indicator'
import { WebVitals } from '@/components/web-vitals'
import PostHogPageView from '@/components/posthog-pageview'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'),
	title: 'TenantFlow - Simplify Property Management | Professional Property Management Software',
	description: 'Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business with TenantFlow\'s enterprise platform.',
	keywords: 'property management software, rental property management, property manager tools, real estate management platform, tenant management system, landlord software, property portfolio management',
	authors: [{ name: 'TenantFlow' }],
	creator: 'TenantFlow',
	publisher: 'TenantFlow',
	robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
	verification: {
		google: 'google-site-verification-code-here',
	},
	category: 'Real Estate Software',
	classification: 'Business Software',
	alternates: {
		canonical: 'https://tenantflow.app',
		languages: {
			'en-US': 'https://tenantflow.app',
		},
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
				type: 'image/jpeg',
			},
			{
				url: '/tenant-flow-logo.png',
				width: 800,
				height: 600,
				alt: 'TenantFlow Logo',
				type: 'image/png',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'TenantFlow - Simplify Property Management',
		description: 'Professional property management software trusted by thousands. Streamline operations and scale your business.',
		creator: '@tenantflow',
		images: ['/assets/images/property-management-og.jpg'],
	},
	applicationName: 'TenantFlow',
	referrer: 'origin-when-cross-origin',
	generator: 'Next.js',
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	icons: {
		icon: [
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
		],
		apple: [
			{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
		],
		other: [
			{ url: '/safari-pinned-tab.svg', rel: 'mask-icon', color: '#2563eb' },
		],
	},
	manifest: '/manifest.json',
}

export default function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content="#2563eb" />
				<meta name="color-scheme" content="light dark" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="TenantFlow" />
				<meta name="application-name" content="TenantFlow" />
				<meta name="msapplication-TileColor" content="#2563eb" />
				<meta name="msapplication-config" content="/browserconfig.xml" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="//fonts.googleapis.com" />
				<link rel="dns-prefetch" href="//fonts.gstatic.com" />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "SoftwareApplication",
							"name": "TenantFlow",
							"applicationCategory": "BusinessApplication",
							"applicationSubCategory": "Property Management Software",
							"operatingSystem": "Web Browser",
							"description": "Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business.",
							"url": "https://tenantflow.app",
							"author": {
								"@type": "Organization",
								"name": "TenantFlow",
								"url": "https://tenantflow.app"
							},
							"offers": {
								"@type": "Offer",
								"category": "SaaS",
								"priceSpecification": {
									"@type": "PriceSpecification",
									"price": "0",
									"priceCurrency": "USD",
									"description": "Free trial available"
								}
							},
							"screenshot": "https://tenantflow.app/assets/images/property-management-og.jpg",
							"featureList": [
								"Property Management",
								"Tenant Management", 
								"Rent Collection",
								"Maintenance Tracking",
								"Financial Reporting",
								"Automated Workflows"
							],
							"aggregateRating": {
								"@type": "AggregateRating",
								"ratingValue": "4.8",
								"reviewCount": "1250"
							}
						})
					}}
				/>
			</head>
			<body>
				<QueryProvider>
					<PostHogClientProvider>
						<AuthStoreProvider>
							{children}
							<GlobalLoadingIndicator variant="bar" position="top" />
						</AuthStoreProvider>
						<PostHogPageView />
					</PostHogClientProvider>
				</QueryProvider>
				<Analytics />
				<SpeedInsights />
				<WebVitals />
			</body>
		</html>
	)
}
