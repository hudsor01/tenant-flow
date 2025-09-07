import '@/app/globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { StripeProvider } from '@/providers/stripe-provider'
import type { Metadata } from 'next/types'

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
			<body className="min-h-screen bg-white touch-manipulation overscroll-y-contain">
				<QueryProvider>
					<StripeProvider>
						{children}
					</StripeProvider>
				</QueryProvider>
			</body>
		</html>
	)
}
