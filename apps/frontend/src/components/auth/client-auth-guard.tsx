'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

interface ClientAuthGuardProps {
	children: React.ReactNode
	redirectTo?: string
	fallback?: React.ReactNode
}

/**
 * Client-side auth guard that checks authentication status
 * and redirects if user is already authenticated
 */
export function ClientAuthGuard({
	children,
	redirectTo = '/dashboard',
	fallback = (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p className="text-muted-foreground mt-2 text-sm">Loading...</p>
			</div>
		</div>
	)
}: ClientAuthGuardProps) {
	const router = useRouter()
	const { user, isAuthenticated, isLoading } = useAuth()

	useEffect(() => {
		if (!isLoading && isAuthenticated && user) {
			logger.info('[ClientAuthGuard] User is authenticated, redirecting', {
				component: 'ClientAuthGuard',
				redirectTo,
				userId: user.id
			})
			router.push(redirectTo)
		}
	}, [isAuthenticated, isLoading, user, router, redirectTo])

	// Show loading state while checking authentication
	if (isLoading) {
		return <>{fallback}</>
	}

	// If user is authenticated, don't render children (redirect will happen)
	if (isAuthenticated && user) {
		return <>{fallback}</>
	}

	// User is not authenticated, render children
	return <>{children}</>
}
