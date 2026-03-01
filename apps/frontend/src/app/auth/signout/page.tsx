'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSignOutMutation } from '#hooks/api/use-auth'
import { Loader2 } from 'lucide-react'

/**
 * Signout page - automatically signs out the user and redirects to login
 *
 * This provides a direct URL for signing out: /auth/signout
 */
export default function SignOutPage() {
	const router = useRouter()
	const signOut = useSignOutMutation()
	const hasSignedOut = useRef(false)

	useEffect(() => {
		if (hasSignedOut.current) return
		hasSignedOut.current = true
		signOut.mutate(undefined, {
			onSuccess: () => {
				router.push('/login')
			},
			onError: () => {
				router.push('/login')
			}
		})
	}, [signOut, router])

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-muted-foreground">Signing out...</p>
			</div>
		</div>
	)
}
