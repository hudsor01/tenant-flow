'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger/logger'

interface BaseAuthGuardProps {
	children: React.ReactNode
	redirectTo?: string
	fallback?: React.ReactNode
}

interface ProtectedRouteGuardProps extends BaseAuthGuardProps {
	requireAuth?: boolean
}

// Shared loading component - DRY principle
function AuthLoadingState({ 
	message, 
	bgColor = 'bg-gray-1' 
}: { 
	message: string
	bgColor?: string 
}) {
	return (
		<div className={`flex min-h-screen items-center justify-center ${bgColor}`}>
			<div className="text-center">
				<i className="i-lucide-loader-2 text-primary mx-auto h-8 w-8 animate-spin" />
				<p className="text-muted-foreground mt-2 text-sm">{message}</p>
			</div>
		</div>
	)
}

// Unified auth guard logic - DRY principle
function useAuthGuard(mode: 'protect' | 'reverse', redirectTo: string) {
	const { user, loading, initialized } = useAuth()
	const router = useRouter()
	const [isRedirecting, setIsRedirecting] = useState(false)

	useEffect(() => {
		if (!initialized || isRedirecting) return

		const shouldRedirect = mode === 'protect' 
			? (!loading && !user)  // Protect: redirect if no user
			: (!loading && user)   // Reverse: redirect if user exists

		if (shouldRedirect) {
			const action = mode === 'protect' ? 'Redirecting unauthenticated user' : 'Redirecting authenticated user'
			logger.debug(`${action}`, {
				component: mode === 'protect' ? 'ProtectedRouteGuard' : 'ReverseAuthGuard',
				redirectTo,
				currentPath: window.location.pathname,
				...(mode === 'reverse' && user ? { _userId: user.id } : {})
			})

			setIsRedirecting(true)
			router.push(redirectTo)
		}
	}, [user, loading, initialized, redirectTo, router, isRedirecting, mode])

	return {
		user,
		loading,
		initialized,
		isRedirecting,
		shouldShowContent: mode === 'protect' ? !!user : !user
	}
}

/**
 * AUTHENTICATED-ONLY Route Guard
 * 
 * PURPOSE: Requires user authentication - blocks anonymous users
 * BEHAVIOR: Redirects unauthenticated users to login
 * USE CASE: Dashboard pages, user settings, private content
 *
 * This component handles client-side auth protection and provides
 * loading states during auth checks. It's designed to work alongside
 * server-side protection for a seamless user experience.
 */
export function ProtectedRouteGuard({
	children,
	redirectTo = '/auth/login',
	requireAuth = true,
	fallback = <AuthLoadingState message="Checking authentication..." />
}: ProtectedRouteGuardProps) {
	const { loading, initialized, isRedirecting, shouldShowContent } = 
		useAuthGuard('protect', redirectTo)

	// If auth protection is disabled, render children immediately
	if (!requireAuth) {
		return <>{children}</>
	}

	// Show loading state while initializing or during auth check
	if (!initialized || loading) {
		return <>{fallback}</>
	}

	// Show loading state while redirecting
	if (isRedirecting || !shouldShowContent) {
		return <AuthLoadingState message="Redirecting to login..." />
	}

	// User is authenticated, render protected content
	return <>{children}</>
}

/**
 * ANONYMOUS-ONLY Route Guard (Reverse Auth)
 * 
 * PURPOSE: Requires user to be NOT authenticated - blocks logged-in users  
 * BEHAVIOR: Redirects authenticated users to dashboard
 * USE CASE: Login pages, signup pages, public landing with auth CTA
 * 
 * OPPOSITE of ProtectedRouteGuard - prevents logged-in users from seeing
 * auth forms or marketing pages intended for anonymous visitors.
 */
export function ReverseAuthGuard({
	children,
	redirectTo = '/dashboard',
	fallback = <AuthLoadingState message="Loading..." bgColor="bg-white" />
}: Omit<ProtectedRouteGuardProps, 'requireAuth'>) {
	const { loading, initialized, isRedirecting, shouldShowContent } = 
		useAuthGuard('reverse', redirectTo)

	// Show loading state while initializing or during auth check
	if (!initialized || loading) {
		return <>{fallback}</>
	}

	// Show loading state while redirecting authenticated users
	if (isRedirecting || !shouldShowContent) {
		return <AuthLoadingState message="Redirecting to dashboard..." bgColor="bg-white" />
	}

	// User is not authenticated, show auth content
	return <>{children}</>
}

/**
 * Simple loading component for auth states (alias for compatibility)
 */
export function AuthLoadingSpinner({
	message = 'Loading...'
}: {
	message?: string
}) {
	return <AuthLoadingState message={message} />
}
