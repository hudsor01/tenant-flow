<<<<<<< HEAD
import type { Metadata } from 'next/types'
=======
import type { Metadata } from '@/types/next.d'
>>>>>>> origin/main
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
 * Uses ReverseAuthGuard to redirect already authenticated users to the dashboard.
 * Auth state is managed by the global app store and useAuth hook.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
	return <ReverseAuthGuard>{children}</ReverseAuthGuard>
}
