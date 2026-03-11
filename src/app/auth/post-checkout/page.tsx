'use client'

import { Spinner } from '#components/ui/loading-spinner'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Alert, AlertDescription } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'

import { createClient } from '#lib/supabase/client'
import { Mail, RefreshCw } from 'lucide-react'

/**
 * Post-Checkout Page
 *
 * AUTH-10: Does NOT auto-send magic link from unauthenticated Edge Function response.
 *
 * Flow:
 * 1. User completes Stripe Checkout -> redirected here with session_id
 * 2. We retrieve the customer email from the checkout session (minimal data)
 * 3. User sees "Check your email" message
 * 4. User can explicitly click "Resend" to trigger a magic link if needed
 */
export default function PostCheckoutPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [email, setEmail] = useState<string>('')
	const fetchRef = useRef(false)

	// Fetch customer email from checkout session (no magic link auto-send)
	const {
		mutate: fetchEmail,
		isPending: isFetchingEmail,
		isError: isFetchError,
		error: fetchError
	} = useMutation({
		mutationFn: async (sessionId: string) => {
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(
				`${supabaseUrl}/functions/v1/stripe-checkout-session`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId })
				}
			)

			if (!response.ok) {
				throw new Error('Failed to retrieve checkout session')
			}

			const session = (await response.json()) as {
				customer_email: string | null
			}
			const customerEmail = session.customer_email

			if (!customerEmail) {
				throw new Error('No email found in checkout session')
			}

			return customerEmail
		},
		onSuccess: (customerEmail: string) => {
			setEmail(customerEmail)
		}
	})

	// Fetch email once on mount
	useEffect(() => {
		const sessionId = searchParams.get('session_id')
		if (sessionId && !fetchRef.current) {
			fetchRef.current = true
			fetchEmail(sessionId)
		}
	}, [searchParams, fetchEmail])

	// AUTH-10: Resend magic link only on explicit user action (not auto-send)
	const {
		mutate: resendMagicLink,
		isPending: isResending,
		isSuccess: resendSuccess,
		isError: isResendError
	} = useMutation({
		mutationFn: async (targetEmail: string) => {
			const supabase = createClient()
			const { error } = await supabase.auth.signInWithOtp({
				email: targetEmail,
				options: {
					emailRedirectTo: `${window.location.origin}/dashboard`
				}
			})

			if (error) {
				throw error
			}
		}
	})

	const handleResend = () => {
		if (email) {
			resendMagicLink(email)
		}
	}

	if (isFetchingEmail) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<CardLayout
					title="Setting up your account"
					description="Please wait while we prepare your login..."
					isLoading={true}
				>
					<div className="flex-center py-8">
						<Spinner className="size-12 animate-spin text-muted-foreground" />
					</div>
				</CardLayout>
			</div>
		)
	}

	if (isFetchError || !searchParams.get('session_id')) {
		const errorMessage =
			fetchError instanceof Error
				? fetchError.message
				: !searchParams.get('session_id')
					? 'Invalid checkout session'
					: 'Failed to retrieve checkout details'

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

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<CardLayout
				title="Check Your Email"
				description="Your subscription is confirmed"
			>
				<div className="space-y-4">
					<Alert className="border-success/20 bg-success/5 dark:border-success/30 dark:bg-success/10">
						<Mail className="size-4 text-success" />
						<AlertDescription className="text-success dark:text-success">
							A login link has been sent to <strong>{email}</strong>
						</AlertDescription>
					</Alert>

					<div className="space-y-3 text-muted-foreground">
						<p>Click the link in your email to sign in to your dashboard.</p>
						<p>The link will expire in 1 hour for security.</p>
					</div>

					<div className="flex flex-col gap-2 pt-4 border-t">
						<Button
							variant="outline"
							className="w-full"
							onClick={handleResend}
							disabled={isResending}
						>
							{isResending ? (
								<>
									<RefreshCw className="mr-2 size-4 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Mail className="mr-2 size-4" />
									Resend Login Link
								</>
							)}
						</Button>
						{resendSuccess && (
							<p className="text-xs text-success text-center">
								Login link sent! Check your inbox.
							</p>
						)}
						{isResendError && (
							<p className="text-xs text-destructive text-center">
								Failed to send link. Please try again.
							</p>
						)}
						<Button
							variant="ghost"
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
