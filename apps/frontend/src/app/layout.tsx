import type { Metadata } from 'next/types'
import '../styles/globals.css'
import { AuthStoreProvider } from '@/stores/auth-provider'
import { QueryProvider } from '@/providers/query-provider'

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
					<AuthStoreProvider>
						{children}
					</AuthStoreProvider>
				</QueryProvider>
			</body>
		</html>
	)
}
