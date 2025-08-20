// Temporarily disabled for build environments with network restrictions
// import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { CSPNonceMeta } from '@/components/security/csp-nonce-meta'
import {
	generateOrganizationSchema,
	generateWebsiteSchema,
	generateSoftwareApplicationSchema
} from '@/lib/seo/generate-metadata'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

// Temporarily using system fonts for build environments with network restrictions
// TODO: Re-enable Google Fonts once network connectivity is available
// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
//   display: 'swap',
//   preload: true,
// })
// 
// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono', 
//   subsets: ['latin'],
//   display: 'swap',
//   preload: true,
// })


export { viewport, metadata } from './layout.constants'

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
			<head>
				{/* CSP Nonce Meta Tag for Client Access */}
				<CSPNonceMeta />

				{/* Preconnect to critical domains */}
				<link
					rel="preconnect"
					href="https://api.tenantflow.app"
					crossOrigin="anonymous"
				/>
				<link rel="dns-prefetch" href="https://api.tenantflow.app" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>

				{/* Structured data for SEO */}
				<Script
					id="organization-schema"
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(generateOrganizationSchema())
					}}
				/>
				<Script
					id="website-schema"
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(generateWebsiteSchema())
					}}
				/>
				<Script
					id="software-schema"
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(
							generateSoftwareApplicationSchema()
						)
					}}
				/>
			</head>
			<body
				className="font-sans bg-white antialiased dark:bg-gray-950"
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
					<Toaster position="top-right" richColors closeButton />
				</ThemeProvider>

				{/* Web Vitals Monitoring */}
				{/* <WebVitalsReporter /> */}

				{/* PostHog is initialized via the PHProvider in the dashboard layout */}
			</body>
		</html>
	)
}
