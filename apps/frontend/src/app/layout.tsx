import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: {
		template: '%s | TenantFlow',
		default: 'TenantFlow - Property_ Management Made Simple'
	},
	description:
		'Modern property management software for landlords and property managers.',
	robots: { index: true, follow: true } // Public pages should be indexed
}

interface PublicLayoutProps {
	children: React.ReactNode
}

/**
 * Layout for public pages (marketing, auth, etc.)
 *
 * Auth state is now handled globally by the app store and useAuth hook.
 * No need for a separate AuthProvider wrapper.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
	return <>{children}</>
}
