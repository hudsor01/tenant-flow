import type { Metadata, Viewport } from 'next/types'
import '@unocss/reset/tailwind.css'
import './global.css'
import { RootProviders } from '@/providers/root-providers'
import { Poppins } from 'next/font/google'

// Use Google Fonts directly - no abstraction needed
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700']
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <RootProviders>
          {children}
        </RootProviders>
      </body>
    </html>
  )
}
