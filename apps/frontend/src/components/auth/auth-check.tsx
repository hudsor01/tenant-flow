'use client'

import { PageLoader } from '@/components/magicui/loading-spinner'
import { useAuth } from '@/stores/auth-provider'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function AuthCheck({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		// Only redirect if auth state has loaded and user is not authenticated
		if (!isLoading && !isAuthenticated) {
			router.push('/login')
		}
	}, [isAuthenticated, isLoading, router])

	if (isLoading) {
		return <PageLoader text="Authenticating..." />
	}

	if (!isAuthenticated) {
		return <PageLoader text="Redirecting to login..." />
	}

	return <>{children}</>
}