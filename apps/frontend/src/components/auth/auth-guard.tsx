'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger/logger'
import { AuthLoadingSpinner } from './protected-route-guard'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type UserRole = Database['public']['Enums']['UserRole']

interface UnifiedAuthGuardProps {
	children: React.ReactNode
	requireAuth?: boolean
	requiredRoles?: UserRole[]
	adminOnly?: boolean
	redirectTo?: string
}

/**
 * Unified Auth Guard - matches backend guard functionality
 */
export function UnifiedAuthGuard({
	children,
	requireAuth = true,
	requiredRoles = [],
	adminOnly = false,
	redirectTo = '/auth/login'
}: UnifiedAuthGuardProps) {
	const { user, loading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (loading) {
			return
		}

		// If auth not required, render immediately
		if (!requireAuth) {
			return
		}

		// Check authentication
		if (!user) {
			logger.debug('User not authenticated, redirecting', { redirectTo })
			router.push(redirectTo)
			return
		}

		// Check role requirements
		if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
			logger.warn('User lacks required role', {
				userRole: user.role,
				requiredRoles
			})
			router.push('/unauthorized')
			return
		}

		// Check admin-only requirement
		if (adminOnly && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
			logger.warn('User lacks admin privileges', { userRole: user.role })
			router.push('/unauthorized')
			return
		}
	}, [
		user,
		loading,
		requireAuth,
		requiredRoles,
		adminOnly,
		redirectTo,
		router
	])

	// Show loading while checking auth
	if (loading) {
		return <AuthLoadingSpinner message="Checking authentication..." />
	}

	// If auth not required, render immediately
	if (!requireAuth) {
		return <>{children}</>
	}

	// If no user, don't render (redirect will happen)
	if (!user) {
		return <AuthLoadingSpinner message="Redirecting to login..." />
	}

	// Check role requirements
	if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
		return <AuthLoadingSpinner message="Access denied..." />
	}

	// Check admin requirement
	if (adminOnly && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
		return <AuthLoadingSpinner message="Access denied..." />
	}

	// All checks passed, render children
	return <>{children}</>
}

/**
 * Helper components for specific auth scenarios
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
	return <UnifiedAuthGuard>{children}</UnifiedAuthGuard>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
	return <UnifiedAuthGuard adminOnly>{children}</UnifiedAuthGuard>
}

export function RequireRole({
	role,
	children
}: {
	role: UserRole
	children: React.ReactNode
}) {
	return (
		<UnifiedAuthGuard requiredRoles={[role]}>{children}</UnifiedAuthGuard>
	)
}
