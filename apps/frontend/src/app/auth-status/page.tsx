import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Auth System Status | TenantFlow',
	description: 'Real-time health monitoring of authentication systems'
}

/**
 * Public auth status page
 * In production, protect this with authentication or IP restrictions
 */
export default function AuthStatusRoute() {
	// In production, you might want to check for admin access here
	const isDevelopment = process.env.NODE_ENV === 'development'

	if (!isDevelopment && !process.env.ENABLE_PUBLIC_AUTH_STATUS) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="mb-2 text-2xl font-bold">
						Access Restricted
					</h1>
					<p className="text-gray-6">
						This page is only available in development mode.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-2 text-2xl font-bold">
					Authentication Status
				</h1>
				<p className="text-gray-6">Development auth status page</p>
			</div>
		</div>
	)
}
