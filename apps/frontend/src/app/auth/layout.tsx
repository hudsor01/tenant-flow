import type { Metadata } from '@/types/next.d'
import { AuthProvider } from '@/providers/auth-provider'
import { ReverseAuthGuard } from '@/components/auth/protected-route-guard'

export const metadata: Metadata = {
	title: {
		template: '%s | Auth - TenantFlow',
		default: 'Sign In - TenantFlow'
	},
	description:
		'Sign in to your TenantFlow account to manage your properties.',
	robots: { index: false, follow: false } // Auth pages should not be indexed
}

interface AuthLayoutProps {
	children: React.ReactNode
}

/**
 * Layout for authentication pages
 *
 * This layout provides AuthProvider and uses ReverseAuthGuard to redirect
 * already authenticated users to the dashboard, preventing confusion.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<AuthProvider>
			<ReverseAuthGuard>{children}</ReverseAuthGuard>
		</AuthProvider>
	)
}
