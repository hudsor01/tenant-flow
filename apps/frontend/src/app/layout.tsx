import { PostHogPageView } from '@/components/layout/posthog-pageview'
import { WebVitals } from '@/components/layout/web-vitals'
import { ErrorBoundary } from '@/components/magicui/error-boundary'
import { Providers } from '@/components/providers'
import SeoJsonLd from '@/components/seo/SeoJsonLd'
import RegisterServiceWorker from '@/components/sw/register-sw'
import { generateSiteMetadata } from '@/lib/generate-metadata'
import {
	DEFAULT_THEME_MODE,
	THEME_MODE_COOKIE_NAME,
	parseThemeMode
} from '@/lib/theme-utils'
import type { ThemeMode } from '@repo/shared/types/domain'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
	return await generateSiteMetadata()
}

export default async function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	const cookieStore = await cookies()
	const themePreference = parseThemeMode(
		cookieStore.get(THEME_MODE_COOKIE_NAME)?.value
	)
	const initialThemeMode: ThemeMode = themePreference ?? DEFAULT_THEME_MODE
	const resolvedTheme = initialThemeMode === 'dark' ? 'dark' : 'light'

	return (
		<html
			lang="en"
			className={resolvedTheme}
			data-theme={resolvedTheme}
			data-theme-preference={initialThemeMode}
			suppressHydrationWarning
		>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content="var(--color-system-blue)" />
				<meta name="color-scheme" content="light dark" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="TenantFlow" />
				<meta name="application-name" content="TenantFlow" />
				<meta
					name="msapplication-TileColor"
					content="var(--color-system-blue)"
				/>
				<meta name="msapplication-config" content="/browserconfig.xml" />
				<link rel="preconnect" href="https://api.fonts.cofo.sasjs.io" />
				<link
					rel="preconnect"
					href="https://api.fonts.cofo.sasjs.io"
					crossOrigin="anonymous"
				/>
				<link rel="dns-prefetch" href="//api.fonts.cofo.sasjs.io" />
				{/* Inject JSON-LD via a small server component for better separation */}
				<SeoJsonLd />
			</head>
			<body>
				<Providers initialThemeMode={initialThemeMode}>
					<ErrorBoundary>{children}</ErrorBoundary>
					{/* Register service worker silently for performance/offline */}
					<RegisterServiceWorker />
					<Toaster
						position="top-right"
						toastOptions={{
							className: 'sonner-toast',
							duration: 4000
						}}
						richColors
						closeButton
					/>
					<PostHogPageView />
				</Providers>
				<Analytics />
				<SpeedInsights />
				<WebVitals />
			</body>
		</html>
	)
}
