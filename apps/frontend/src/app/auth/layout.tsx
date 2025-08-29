import type { Metadata } from 'next/types'
import { AuthGuardCore, AuthLoadingState } from '@/components/auth/protected-route-guard'

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
 * Uses AuthGuardCore in reverse mode to redirect already authenticated users to the dashboard.
 * Auth state is managed by the global app store and useAuth hook.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<AuthGuardCore
			mode="reverse"
			redirectTo="/dashboard"
			fallback={<AuthLoadingState message="Loading..." bgColor="bg-white" />}
			redirectingMessage="Redirecting to dashboard..."
			requireAuth={true}
		>
			{children}
		</AuthGuardCore>
	)
}
