"use client"

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-provider'

export default function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	const { isAuthenticated, isLoading } = useAuthStore(state => ({
		isAuthenticated: state.isAuthenticated,
		isLoading: state.isLoading
	}))
	
	const router = useRouter()

	useEffect(() => {
		// Only redirect if auth state has loaded and user is not authenticated
		if (!isLoading && !isAuthenticated) {
			router.push('/auth/login')
		}
	}, [isAuthenticated, isLoading, router])

	// Show loading while auth state is being determined
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		)
	}

	// Show nothing while redirecting unauthenticated users
	if (!isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Redirecting to login...</p>
				</div>
			</div>
		)
	}

	// Render protected content for authenticated users
	return <>{children}</>
}