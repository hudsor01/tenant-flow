'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuthRedirectProps {
	to: string
}

export function AuthRedirect({ to }: AuthRedirectProps) {
	const router = useRouter()

	useEffect(() => {
		router.push(to)
	}, [router, to])

	// Show minimal loading state while redirecting
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
<<<<<<< HEAD
				<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
=======
				<div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
>>>>>>> origin/main
				<p className="text-muted-foreground mt-2 text-sm">
					Redirecting...
				</p>
			</div>
		</div>
	)
}
