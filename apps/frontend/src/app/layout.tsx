import type { ReactNode } from 'react'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Providers } from '#components/providers'
import SeoJsonLd from '#components/seo/seo-json-ld'
import RegisterServiceWorker from '#components/sw/register-sw'
import { Toaster } from '#components/ui/toast'
import { generateSiteMetadata } from '#lib/generate-metadata'

import './globals.css'

// Inter - the industry-standard SaaS font (used by Linear, Notion, Figma)
const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-sans'
})

export async function generateMetadata(): Promise<Metadata> {
	return await generateSiteMetadata()
}

export default async function RootLayout({
	children
}: {
	children: ReactNode
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
				className={`${inter.variable} ${GeistMono.variable} font-sans antialiased`}
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
