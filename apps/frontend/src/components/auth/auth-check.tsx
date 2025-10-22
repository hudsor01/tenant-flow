'use client'

import { PageLoader } from '@/components/magicui/loading-spinner'
import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'

export function AuthCheck({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth()
	const router = useRouter()

	const redirectToLogin = useCallback(() => {
		router.push('/login')
	}, [router])

	useEffect(() => {
		// Only redirect if auth state has loaded and user is not authenticated
		if (!isLoading && !isAuthenticated) {
			redirectToLogin()
		}
	}, [isAuthenticated, isLoading, redirectToLogin])

	if (isLoading) {
		return <PageLoader text="Authenticating..." />
	}

	if (!isAuthenticated) {
		return <PageLoader text="Redirecting to login..." />
	}

	return <>{children}</>
}
