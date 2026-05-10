import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata = createPageMetadata({
	title: 'Log In to Your Property Management Dashboard',
	description: 'Sign in to TenantFlow to manage rental properties, leases, maintenance requests, and financial reports. Secure landlord login.',
	path: '/login',
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
	return children
}
