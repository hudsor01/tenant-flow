'use client'

import { PageLoader } from '@/components/magicui/loading-spinner'
import { useAuthStore } from '@/stores/auth-provider'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function AuthCheck({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuthStore(state => ({
		isAuthenticated: state.isAuthenticated,
		isLoading: state.isLoading
	}))

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