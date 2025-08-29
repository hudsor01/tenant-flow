'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger/logger'

// Deleted unused interfaces - use props inline

// Shared loading component - DRY principle
export function AuthLoadingState({ 
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

// Generic auth guard implementation - DRY principle
export function AuthGuardCore({
	children,
	mode,
	redirectTo,
	fallback,
	redirectingMessage,
	requireAuth = true
}: {
	children: React.ReactNode
	mode: 'protect' | 'reverse'
	redirectTo: string
	fallback: React.ReactNode
	redirectingMessage: string
	requireAuth?: boolean
}) {
	const { loading, initialized, isRedirecting, shouldShowContent } = 
		useAuthGuard(mode, redirectTo)

	// If auth protection is disabled (for ProtectedRouteGuard only)
	if (!requireAuth) {
		return <>{children}</>
	}

	// Show loading state while initializing or during auth check
	if (!initialized || loading) {
		return <>{fallback}</>
	}

	// Show loading state while redirecting
	if (isRedirecting || !shouldShowContent) {
		return <AuthLoadingState message={redirectingMessage} />
	}

	// Render content when conditions are met
	return <>{children}</>
}

// Deleted unnecessary wrapper functions - use AuthGuardCore directly with appropriate mode prop

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
