'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignOutMutation } from '#hooks/api/use-auth'
import { createClient } from '#lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { LogOut } from 'lucide-react'

/**
 * AUTH-11: Signout confirmation page
 *
 * Does NOT auto-trigger signout on mount (CSRF protection).
 * If user is signed in: shows a "Sign out" confirmation button.
 * If user is already signed out: shows "You have been signed out" message.
 */
export default function SignOutPage() {
	const router = useRouter()
	const signOut = useSignOutMutation()
	const [signedOut, setSignedOut] = useState(false)

	// Check if user has an active session
	const { data: session, isLoading } = useQuery({
		queryKey: ['auth', 'signout-check'],
		queryFn: async () => {
			const supabase = createClient()
			const { data } = await supabase.auth.getSession()
			return data.session
		},
		staleTime: 0,
	})

	const isAuthenticated = !!session && !signedOut

	function handleSignOut() {
		signOut.mutate(undefined, {
			onSuccess: () => {
				setSignedOut(true)
			},
			onError: () => {
				setSignedOut(true)
			}
		})
	}

	// Redirect to login after showing signed-out confirmation
	useEffect(() => {
		if (!signedOut) return
		const timer = setTimeout(() => {
			router.push('/login')
		}, 3000)
		return () => clearTimeout(timer)
	}, [signedOut, router])

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Sign Out"
					description="Checking session..."
					isLoading={true}
				>
					<div className="py-4" />
				</CardLayout>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Signed Out"
					description="You have been signed out successfully."
				>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground text-center">
							You will be redirected to the login page shortly.
						</p>
						<Button
							className="w-full"
							onClick={() => router.push('/login')}
						>
							Back to Login
						</Button>
					</div>
				</CardLayout>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<CardLayout
				title="Sign Out"
				description="Are you sure you want to sign out?"
			>
				<div className="space-y-4">
					<Button
						className="w-full"
						onClick={handleSignOut}
						disabled={signOut.isPending}
					>
						<LogOut className="mr-2 size-4" />
						{signOut.isPending ? 'Signing out...' : 'Sign Out'}
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => router.back()}
					>
						Cancel
					</Button>
				</div>
			</CardLayout>
		</div>
	)
}
