import type { Metadata, Viewport } from 'next/types'
import { Inter } from 'next/font/google'
import './global.css'

// Configure Inter font
const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-inter'
})

export const metadata: Metadata = {
	title: {
		template: '%s | TenantFlow',
		default: 'TenantFlow - Property Management Made Simple'
	},
	description:
		'Modern property management software for landlords and property managers.',
	robots: { index: true, follow: true },
	icons: {
		icon: '/favicon.ico',
		shortcut: '/favicon-16x16.png',
		apple: '/apple-touch-icon.png'
	}
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: 'white' },
		{ media: '(prefers-color-scheme: dark)', color: '#0f0f23' }
	]
}

interface RootLayoutProps {
	children: React.ReactNode
}

/**
 * Root layout for the entire application
 * 
 * This is the main layout that wraps all pages in the app.
 * It includes:
 * - Global CSS and UnoCSS imports
 * - Font configuration
 * - HTML document structure
 * - Global providers will be added by specific route groups as needed
 */
export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<head />
			<body className="font-sans antialiased">
				{children}
			</body>
		</html>
	)
}
