import { Providers } from '#components/providers'
import SeoJsonLd from '#components/seo/SeoJsonLd'
import RegisterServiceWorker from '#components/sw/register-sw'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { generateSiteMetadata } from '#lib/generate-metadata'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { JetBrains_Mono, Spline_Sans } from 'next/font/google'
import { Toaster } from '#components/ui/toast'
import './globals.css'

const splineSans = Spline_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	display: 'swap',
	variable: '--font-spline'
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-mono'
})

export async function generateMetadata(): Promise<Metadata> {
	return await generateSiteMetadata()
}

export default async function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content="var(--color-info)" />
				<meta name="color-scheme" content="light dark" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="TenantFlow" />
				<meta name="application-name" content="TenantFlow" />
				<meta name="msapplication-TileColor" content="var(--color-info)" />
				<meta name="msapplication-config" content="/browserconfig.xml" />
				<SeoJsonLd />
			</head>
			<body
				className={`${splineSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
			>
				<Providers>
					<div className="min-h-screen bg-background text-foreground flex flex-col">
						<ErrorBoundary>{children} </ErrorBoundary>
						{/* Register service worker silently for performance/offline */}
						<RegisterServiceWorker />
						<Toaster position="top-right" richColors closeButton />
					</div>
				</Providers>
				{process.env.NODE_ENV === 'production' && (
					<>
						<Analytics />
						<SpeedInsights />
					</>
				)}
			</body>
		</html>
	)
}
