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
	title: 'TenantFlow - Simplify Property Management | Professional Property Management Software',
	description: 'Professional property management software trusted by thousands. Streamline operations, automate workflows, and scale your business with TenantFlow\'s enterprise platform.',
	keywords: 'property management software, rental property management, property manager tools, real estate management platform, tenant management system',
	authors: [{ name: 'TenantFlow' }],
	creator: 'TenantFlow',
	publisher: 'TenantFlow',
	robots: 'index, follow',
	openGraph: {
		title: 'TenantFlow - Simplify Property Management',
		description: 'Professional property management software trusted by thousands. Streamline operations and scale your business.',
		url: 'https://tenantflow.app',
		siteName: 'TenantFlow',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'TenantFlow - Simplify Property Management',
		description: 'Professional property management software trusted by thousands. Streamline operations and scale your business.',
		creator: '@tenantflow',
	},
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
