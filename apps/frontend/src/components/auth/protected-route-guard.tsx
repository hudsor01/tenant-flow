'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger/logger'

interface ProtectedRouteGuardProps {
	children: React.ReactNode
	redirectTo?: string
	fallback?: React.ReactNode
	requireAuth?: boolean
}

/**
 * Client-side protected route guard
 *
 * This component handles client-side auth protection and provides
 * loading states during auth checks. It's designed to work alongside
 * server-side protection for a seamless user experience.
 */
export function ProtectedRouteGuard({
	children,
	redirectTo = '/auth/login',
	requireAuth = true,
	fallback = (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="text-center">
				<i className="i-lucide-loader-2 inline-block text-primary mx-auto h-8 w-8 animate-spin"  />
				<p className="text-muted-foreground mt-2 text-sm">
					Checking authentication...
				</p>
			</div>
		</div>
	)
}: ProtectedRouteGuardProps) {
	const { user, loading, initialized } = useAuth()
	const router = useRouter()
	const [isRedirecting, setIsRedirecting] = useState(false)

	useEffect(() => {
		// Don't do anything until auth is initialized
		if (!initialized) {
			return
		}

		// Don't check auth if protection is disabled
		if (!requireAuth) {
			return
		}

		// If not loading and no user, redirect
		if (!loading && !user && !isRedirecting) {
			logger.debug(
				'ProtectedRouteGuard: Redirecting unauthenticated user',
				{
					component: 'ProtectedRouteGuard',
					redirectTo,
					currentPath: window.location.pathname
				}
			)

			setIsRedirecting(true)
			router.push(redirectTo)
		}
	}, [
		user,
		loading,
		initialized,
		requireAuth,
		redirectTo,
		router,
		isRedirecting
	])

	// If auth protection is disabled, render children immediately
	if (!requireAuth) {
		return <>{children}</>
	}

	// Show loading state while initializing or during auth check
	if (!initialized || loading) {
		return <>{fallback}</>
	}

	// Show loading state while redirecting
	if (isRedirecting || !user) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-center">
					<i className="i-lucide-loader-2 inline-block text-primary mx-auto h-8 w-8 animate-spin"  />
					<p className="text-muted-foreground mt-2 text-sm">
						Redirecting to login...
					</p>
				</div>
			</div>
		)
	}

	// User is authenticated, render protected content
	return <>{children}</>
}

/**
 * Client-side reverse auth guard
 *
 * Redirects authenticated users away from auth pages to improve UX
 */
export function ReverseAuthGuard({
	children,
	redirectTo = '/dashboard',
	fallback = (
		<div className="flex min-h-screen items-center justify-center bg-white">
			<div className="text-center">
				<i className="i-lucide-loader-2 inline-block text-primary mx-auto h-8 w-8 animate-spin"  />
				<p className="text-muted-foreground mt-2 text-sm">Loading...</p>
			</div>
		</div>
	)
}: Omit<ProtectedRouteGuardProps, 'requireAuth'>) {
	const { user, loading, initialized } = useAuth()
	const router = useRouter()
	const [isRedirecting, setIsRedirecting] = useState(false)

	useEffect(() => {
		// Don't do anything until auth is initialized
		if (!initialized) {
			return
		}

		// If not loading and user exists, redirect
		if (!loading && user && !isRedirecting) {
			logger.debug('ReverseAuthGuard: Redirecting authenticated user', {
				component: 'ReverseAuthGuard',
				_userId: user.id,
				redirectTo,
				currentPath: window.location.pathname
			})

			setIsRedirecting(true)
			router.push(redirectTo)
		}
	}, [user, loading, initialized, redirectTo, router, isRedirecting])

	// Show loading state while initializing or during auth check
	if (!initialized || loading) {
		return <>{fallback}</>
	}

	// Show loading state while redirecting authenticated users
	if (isRedirecting || user) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-white">
				<div className="text-center">
					<i className="i-lucide-loader-2 inline-block text-primary mx-auto h-8 w-8 animate-spin"  />
					<p className="text-muted-foreground mt-2 text-sm">
						Redirecting to dashboard...
					</p>
				</div>
			</div>
		)
	}

	// User is not authenticated, show auth content
	return <>{children}</>
}

/**
 * Simple loading component for auth states
 */
export function AuthLoadingSpinner({
	message = 'Loading...'
}: {
	message?: string
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="text-center">
				<i className="i-lucide-loader-2 inline-block text-primary mx-auto h-8 w-8 animate-spin"  />
				<p className="text-muted-foreground mt-2 text-sm">{message}</p>
			</div>
		</div>
	)
}
