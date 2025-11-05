'use client'

import { useUserRole } from '#hooks/use-user-role'
import { useCurrentUser } from '#hooks/use-current-user'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '#components/ui/skeleton'

/**
 * Tenant Role Guard Component
 *
 * Protects tenant routes by validating:
 * 1. User is authenticated
 * 2. User has TENANT role
 *
 * Redirects unauthorized users to login page.
 * Shows loading skeleton while checking authentication.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading: authLoading } = useCurrentUser()
	const { canAccessTenantFeatures, isLoading: roleLoading } = useUserRole()
	const router = useRouter()

	useEffect(() => {
		if (!authLoading && !roleLoading) {
			if (!isAuthenticated || !canAccessTenantFeatures) {
				router.push('/login')
			}
		}
	}, [isAuthenticated, canAccessTenantFeatures, authLoading, roleLoading, router])

	if (authLoading || roleLoading) {
		return (
			<div className="min-h-screen p-8">
				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		)
	}

	if (!isAuthenticated || !canAccessTenantFeatures) {
		return null
	}

	return <>{children}</>
}
