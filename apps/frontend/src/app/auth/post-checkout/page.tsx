'use client'

import { Spinner } from '#components/ui/spinner'
import { API_BASE_URL } from '#lib/api-config'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Alert, AlertDescription } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'

import { createClient } from '#lib/supabase/client'
import { Mail } from 'lucide-react'

/**
 * Post-Checkout Page - Magic Link Flow
 *
 * Flow:
 * 1. User completes Stripe Checkout → redirected here with session_id
 * 2. We send magic link to their email (via Supabase OTP)
 * 3. User clicks link → auto-logged in → redirected to /manage
 *
 * This implements passwordless authentication after payment.
 * Official Supabase pattern: signInWithOtp({ email, options: { emailRedirectTo } })
 */
export default function PostCheckoutPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [email, setEmail] = useState<string>('')
	const mutateRef = useRef<((sessionId: string) => void) | null>(null)

	// TanStack Query mutation for sending magic link
	const sendMagicLinkMutation = useMutation({
		mutationFn: async (sessionId: string) => {
			// Call backend to get customer email from Stripe session
			const response = await fetch(
				`${API_BASE_URL}/billing/checkout-session/${sessionId}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				}
			)

			if (!response.ok) {
				throw new Error('Failed to retrieve checkout session')
			}

			const session = await response.json()
			const customerEmail =
				session.customer_email || session.customer_details?.email

			if (!customerEmail) {
				throw new Error('No email found in checkout session')
			}

			// Send magic link via Supabase OTP
			const supabase = createClient()
			const { error } = await supabase.auth.signInWithOtp({
				email: customerEmail,
				options: {
					emailRedirectTo: `${window.location.origin}/manage`
				}
			})

			if (error) {
				throw error
			}

			return customerEmail
		},
		onSuccess: customerEmail => {
			setEmail(customerEmail)
		}
	})

	// Store mutate function in ref for stable reference
	mutateRef.current = sendMagicLinkMutation.mutate

	// Trigger mutation once on mount with session_id
	useEffect(() => {
		const sessionId = searchParams.get('session_id')
		if (
			sessionId &&
			!sendMagicLinkMutation.isSuccess &&
			!sendMagicLinkMutation.isPending &&
			mutateRef.current
		) {
			mutateRef.current(sessionId)
		}
	}, [searchParams, sendMagicLinkMutation.isSuccess, sendMagicLinkMutation.isPending])

	if (sendMagicLinkMutation.isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Setting up your account"
					description="Please wait while we prepare your login..."
					isLoading={true}
				>
					<div className="flex items-center justify-center py-8">
						<Spinner className="size-12 animate-spin text-muted-foreground" />
					</div>
				</CardLayout>
			</div>
		)
	}

	if (sendMagicLinkMutation.isError || !searchParams.get('session_id')) {
		const errorMessage =
			sendMagicLinkMutation.error instanceof Error
				? sendMagicLinkMutation.error.message
				: !searchParams.get('session_id')
					? 'Invalid checkout session'
					: 'Failed to send login link'

		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Setup Error"
					description="We encountered a problem setting up your account"
					error={errorMessage}
				>
					<div className="space-y-4">
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => router.push('/')}>
								Go Home
							</Button>
							<Button onClick={() => router.push('/pricing')}>Try Again</Button>
						</div>
					</div>
				</CardLayout>
			</div>
		)
	}

	// Success state
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<CardLayout
				title="Check Your Email"
				description="We sent you a magic login link"
			>
				<div className="space-y-4">
					<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
						<Mail className="size-4 text-green-600" />
						<AlertDescription className="text-green-900 dark:text-green-10">
							We sent a login link to <strong>{email}</strong>
						</AlertDescription>
					</Alert>

					<div className="space-y-3 text-sm text-muted-foreground">
						<p>Click the link in your email to sign in to your dashboard.</p>
						<p>The link will expire in 1 hour for security.</p>
						<p className="text-xs">
							Didn&apos;t receive it? Check your spam folder or contact support.
						</p>
					</div>

					<div className="pt-4 border-t">
						<Button
							variant="outline"
							className="w-full"
							onClick={() => router.push('/')}
						>
							Go to Homepage
						</Button>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
