'use client'

import { useUserRole } from '#hooks/use-user-role'
import { useCurrentUser } from '#hooks/use-current-user'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '#components/ui/skeleton'

/**
 * Tenant user_type Guard Component
 *
 * Protects tenant routes by validating:
 * 1. User is authenticated
 * 2. User has TENANT user_type
 *
 * Redirects unauthorized users to login page.
 * Shows loading skeleton while checking authentication.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading: authLoading } = useCurrentUser()
	const { role, isLoading: roleLoading } = useUserRole()
	const router = useRouter()

	useEffect(() => {
		if (!authLoading && !roleLoading) {
		if (!isAuthenticated || role !== 'TENANT') {
				router.push('/login')
			}
		}
		}, [isAuthenticated, role, authLoading, roleLoading, router])

	if (authLoading || roleLoading) {
		return (
			<div className="min-h-screen p-[var(--spacing-8)]">
				<div className="space-y-[var(--spacing-4)]">
					<Skeleton className="h-[var(--spacing-8)] w-[var(--spacing-64)]" />
					<Skeleton className="h-[var(--spacing-64)] w-[var(--width-full)]" />
				</div>
			</div>
		)
	}

	if (!isAuthenticated || role !== 'TENANT') {
		return null
	}

	return <>{children}</>
}
