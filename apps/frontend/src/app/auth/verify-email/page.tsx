'use client'

// Removed unused Metadata import
import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger/logger'

// Disable static generation for this auth page as it requires runtime Supabase client
export const dynamic = 'force-dynamic'

// Enhanced resend verification email with proper error handling and rate limiting
async function resendVerificationEmail(
	email: string
): Promise<{ success: boolean; message: string }> {
	try {
		logger.info('Attempting to resend verification email', {
			component: 'verify-email-page',
			email:
				email.substring(0, 3) +
				'***' +
				email.substring(email.indexOf('@'))
		})

		const { error } = await supabase.auth.resend({
			type: 'signup',
			email: email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		})

		if (error) {
			logger.error('Failed to resend verification email', error, {
				component: 'verify-email-page',
				email: email.substring(0, 3) + '***'
			})

			// Handle specific error cases
			if (error.message.includes('rate limit')) {
				return {
					success: false,
					message:
						'Please wait a moment before requesting another verification email.'
				}
			}

			if (error.message.includes('not found')) {
				return {
					success: false,
					message: 'Email address not found. Please sign up again.'
				}
			}

			return {
				success: false,
				message:
					error.message ||
					'Failed to resend verification email. Please try again.'
			}
		}

		logger.info('Verification email resent successfully', {
			component: 'verify-email-page'
		})

		return {
			success: true,
			message:
				'Verification email sent successfully! Please check your inbox.'
		}
	} catch (error) {
		logger.error(
			'Unexpected error resending verification email',
			error as Error,
			{
				component: 'verify-email-page'
			}
		)

		return {
			success: false,
			message: 'An unexpected error occurred. Please try again later.'
		}
	}
}

interface VerifyEmailContentProps {
	email?: string
}

function VerifyEmailContent({ email }: VerifyEmailContentProps) {
	const [isPending, startTransition] = useTransition()
	const [resendAttempts, setResendAttempts] = useState(0)
	const [lastResendTime, setLastResendTime] = useState<number | null>(null)
	const [message, setMessage] = useState<{
		type: 'success' | 'error'
		text: string
	} | null>(null)

	// Rate limiting: allow resend every 60 seconds, max 3 attempts per session
	const canResend =
		resendAttempts < 3 &&
		(!lastResendTime || Date.now() - lastResendTime > 60000)

	const handleResendEmail = () => {
		if (!email) {
			setMessage({
				type: 'error',
				text: 'Email address is required to resend verification.'
			})
			return
		}

		if (!canResend) {
			const timeRemaining = lastResendTime
				? Math.ceil((60000 - (Date.now() - lastResendTime)) / 1000)
				: 0

			setMessage({
				type: 'error',
				text:
					timeRemaining > 0
						? `Please wait ${timeRemaining} seconds before requesting another email.`
						: 'Maximum resend attempts reached. Please contact support if you continue having issues.'
			})
			return
		}

		startTransition(async () => {
			try {
				setMessage(null)
				const result = await resendVerificationEmail(email)

				setResendAttempts(prev => prev + 1)
				setLastResendTime(Date.now())

				setMessage({
					type: result.success ? 'success' : 'error',
					text: result.message
				})

				if (result.success) {
					toast.success('Verification email sent!', {
						description: 'Please check your inbox and spam folder.'
					})
				} else {
					toast.error('Failed to send email', {
						description: result.message
					})
				}
			} catch {
				setMessage({
					type: 'error',
					text: 'An unexpected error occurred. Please try again.'
				})
				toast.error('Something went wrong', {
					description: 'Please try again or contact support.'
				})
			}
		})
	}

	const getResendButtonText = () => {
		if (isPending) {
			return 'Sending...'
		}
		if (resendAttempts === 0) {
			return 'Resend Verification Email'
		}
		return `Resend Email (${3 - resendAttempts} attempts left)`
	}

	const timeUntilNextResend = lastResendTime
		? Math.max(0, Math.ceil((60000 - (Date.now() - lastResendTime)) / 1000))
		: 0

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
			<Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
				<CardHeader className="space-y-2 pb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-blue-100">
						<i className="i-lucide-mail inline-block text-primary h-8 w-8"  />
					</div>
					<CardTitle className="text-3xl font-bold">
						Check Your Email
					</CardTitle>
					<CardDescription className="text-muted-foreground text-base">
						We've sent a verification link to your email address
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{email && (
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
							<p className="text-center text-sm font-medium text-blue-800">
								{email}
							</p>
						</div>
					)}

					{/* Display status message */}
					{message && (
						<Alert
							variant={
								message.type === 'error'
									? 'destructive'
									: 'default'
							}
						>
							{message.type === 'error' ? (
								<i className="i-lucide-alert-circle inline-block h-4 w-4"  />
							) : (
								<i className="i-lucide-checkcircle inline-block h-4 w-4"  />
							)}
							<AlertDescription>{message.text}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<i className="i-lucide-checkcircle inline-block mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"  />
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Check your inbox
								</p>
								<p className="text-muted-foreground text-sm">
									Click the verification link we sent to
									confirm your email address. The link will
									expire in 24 hours.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<i className="i-lucide-checkcircle inline-block mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"  />
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Complete your setup
								</p>
								<p className="text-muted-foreground text-sm">
									After verification, you'll be automatically
									signed in and redirected to your dashboard.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<i className="i-lucide-checkcircle inline-block mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"  />
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Check your spam folder
								</p>
								<p className="text-muted-foreground text-sm">
									Sometimes verification emails end up in spam
									or junk folders.
								</p>
							</div>
						</div>
					</div>

					<div className="border-t pt-6">
						<div className="space-y-3">
							<p className="text-muted-foreground text-center text-sm">
								Didn't receive the email?
							</p>

							{timeUntilNextResend > 0 && (
								<p className="text-center text-xs text-orange-600">
									You can request another email in{' '}
									{timeUntilNextResend} seconds
								</p>
							)}

							<Button
								variant="outline"
								className="w-full"
								onClick={handleResendEmail}
								disabled={isPending || !canResend || !email}
							>
								{isPending ? (
									<>
										<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
										Sending...
									</>
								) : (
									<>
										<i className="i-lucide-rotateccw inline-block mr-2 h-4 w-4"  />
										{getResendButtonText()}
									</>
								)}
							</Button>

							{resendAttempts >= 3 && (
								<p className="text-center text-xs text-red-600">
									Maximum attempts reached. Please{' '}
									<Link
										href="/contact"
										className="underline hover:no-underline"
									>
										contact support
									</Link>{' '}
									if you continue having issues.
								</p>
							)}
						</div>
					</div>

					<div className="space-y-3 text-center">
						<Link
							href="/auth/login"
							className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors"
						>
							Back to login
							<i className="i-lucide-arrow-right inline-block h-4 w-4"  />
						</Link>

						<div className="text-xs text-gray-500">
							<p>
								Having trouble? Try signing up with a different
								email or{' '}
								<Link
									href="/contact"
									className="underline hover:no-underline"
								>
									contact our support team
								</Link>
								.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function VerifyEmailPageContent() {
	const searchParams = useSearchParams()
	const email = searchParams.get('email')

	return <VerifyEmailContent email={email ?? undefined} />
}

export default function VerifyEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
					<Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
						<CardContent className="flex items-center justify-center p-8">
							<div className="space-y-4 text-center">
								<i className="i-lucide-loader-2 inline-block mx-auto h-8 w-8 animate-spin text-blue-600"  />
								<p className="text-muted-foreground text-sm">
									Loading...
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			}
		>
			<VerifyEmailPageContent />
		</Suspense>
	)
}

// Note: metadata moved to layout.tsx due to 'use client' directive
