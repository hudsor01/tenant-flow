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
	title: 'TenantFlow - Property Management Platform',
	description:
		'Streamline tenant management, track maintenance, and maximize your real estate investments'
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
