'use client'

import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
=======
import { logger } from '@/lib/logger'
>>>>>>> origin/main
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { User } from '@supabase/supabase-js'

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
<<<<<<< HEAD
				<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
=======
				<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
>>>>>>> origin/main
				<p className="text-muted-foreground mt-2 text-sm">Loading...</p>
			</div>
		</div>
	)
}: ClientAuthGuardProps) {
	const router = useRouter()
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const currentUser = await getCurrentUser()
				setUser(currentUser)

				if (currentUser) {
					router.push(redirectTo)
					return
				}
			} catch (error) {
				// User is not authenticated, continue to show children
				logger.debug('User not authenticated:', {
					component: 'components_auth_client_auth_guard.tsx',
					data: error
				})
			} finally {
				setIsLoading(false)
			}
		}

<<<<<<< HEAD
		void checkAuth()
=======
		checkAuth()
>>>>>>> origin/main
	}, [router, redirectTo])

	if (isLoading) {
		return <>{fallback}</>
	}

	if (user) {
		// User is authenticated, showing redirect loading state
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
<<<<<<< HEAD
					<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
=======
					<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
>>>>>>> origin/main
					<p className="text-muted-foreground mt-2 text-sm">
						Redirecting to dashboard...
					</p>
				</div>
			</div>
		)
	}

	// User is not authenticated, show the auth form
	return <>{children}</>
}
