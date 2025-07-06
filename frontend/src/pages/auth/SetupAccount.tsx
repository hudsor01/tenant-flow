import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Building2, Loader2, Mail, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function SetupAccount() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const { signUp, signIn } = useAuth()

	const email = searchParams.get('email') || ''
	const name = searchParams.get('name') || ''

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showVerificationModal, setShowVerificationModal] = useState(false)
	const [verificationSent, setVerificationSent] = useState(false)
	// Redirect to login if no email provided
	useEffect(() => {
		if (!email) {
			navigate('/auth/login')
		}
	}, [email, navigate])

	// Helper function to link subscription and redirect
	const linkSubscriptionAndRedirect = async (userId: string) => {
		try {
			const linkError = await apiClient.subscriptions.link({
				userId,
				userEmail: email
			})

			if (linkError) {
				logger.error(
					'Error linking subscription during account setup',
					linkError
				)
				// Don't fail the whole flow - just log it
			} else {
				logger.info(
					'Successfully linked subscription to user during setup'
				)
			}
		} catch (linkErr) {
			logger.error(
				'Subscription linking failed during account setup',
				linkErr as Error
			)
			// Continue anyway - subscription can be linked later
		}

		// Success! Take them to dashboard
		navigate('/dashboard?setup=success')
	}

	const handleResendVerification = async () => {
		try {
			setIsLoading(true)
			const error = await apiClient.auth.resendVerification({
				email: email,
				redirectTo: `${window.location.origin}/auth/callback?setup=true`
			})

			if (error) {
				toast.error(`Failed to resend verification: ${error.message}`)
			} else {
				setVerificationSent(true)
				toast.success(
					'Verification email sent! Please check your inbox.'
				)
			}
		} catch {
			toast.error('Failed to resend verification email')
		} finally {
			setIsLoading(false)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			// Step 1: Create the account
			try {
				const signUpData = await signUp(email, password, name, {
					from_subscription: true
				})
				
				if (signUpData?.user) {
					// Check if email confirmation is required
					if (!signUpData.session) {
						// Email confirmation required - show modal
						setShowVerificationModal(true)
						setError(null)
						return
					} else {
						// No email confirmation required - proceed directly
						await linkSubscriptionAndRedirect(signUpData.user.id)
						return
					}
				}
			} catch (signUpError: unknown) {
				const error = signUpError as Error

				// If user already exists, try to sign them in
				if (
					error.message.includes('already registered') ||
					error.message.includes('User already registered')
				) {
					logger.info(
						'User already exists, attempting sign in during setup'
					)

					try {
						const signInData = await signIn(email, password)
						
						if (signInData?.user) {
							// Sign in successful - link subscription and redirect
							await linkSubscriptionAndRedirect(signInData.user.id)
							return
						}
					} catch (signInError: unknown) {
						const signInErr = signInError as Error
						// If sign in fails due to email not confirmed, show verification modal
						if (
							signInErr.message.includes('Email not confirmed')
						) {
							setShowVerificationModal(true)
							setError(null)
							return
						} else {
							setError(
								`Unable to sign in: ${signInErr.message}`
							)
							return
						}
					}
				} else {
					setError(`Unable to create account: ${error.message}`)
					return
				}
			}

			// Success! Take them to dashboard
			navigate('/dashboard?setup=success')
		} catch {
			setError('Unable to complete setup. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="from-background via-background to-primary/5 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md"
			>
				<Card>
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<div className="bg-primary/10 rounded-full p-3">
								<Building2 className="text-primary h-8 w-8" />
							</div>
						</div>
						<CardTitle>Complete Your Account Setup</CardTitle>
						<CardDescription>
							Your subscription was successful! Setup is taking a
							bit longer than expected, but you can set your
							password now to complete your account.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-2">
								<Label>Email</Label>
								<Input
									type="email"
									value={email}
									disabled
									className="bg-muted"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder="Enter your password"
									required
									autoFocus
									autoComplete="new-password"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">
									Confirm Password
								</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={confirmPassword}
									onChange={e =>
										setConfirmPassword(e.target.value)
									}
									placeholder="Confirm your password"
									required
									autoComplete="new-password"
								/>
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={
									isLoading || !password || !confirmPassword
								}
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Setting up account...
									</>
								) : (
									'Complete Setup'
								)}
							</Button>

							<p className="text-muted-foreground text-center text-sm">
								By setting up your account, you agree to our
								Terms of Service and Privacy Policy
							</p>
						</form>
					</CardContent>
				</Card>
			</motion.div>

			{/* Email Verification Modal */}
			<Dialog
				open={showVerificationModal}
				onOpenChange={setShowVerificationModal}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Mail className="text-primary h-5 w-5" />
							Verify Your Email
						</DialogTitle>
						<DialogDescription>
							We've sent a verification email to{' '}
							<strong>{email}</strong>
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="text-center">
							<div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
								<Mail className="text-primary h-8 w-8" />
							</div>
							<h3 className="mb-2 text-lg font-semibold">
								Check Your Email
							</h3>
							<p className="text-muted-foreground mb-4">
								Please click the verification link in the email
								we sent to complete your account setup and
								access your dashboard.
							</p>
							{verificationSent && (
								<div className="mb-4 flex items-center justify-center gap-2 text-sm text-emerald-600">
									<CheckCircle className="h-4 w-4" />
									Verification email sent successfully!
								</div>
							)}
						</div>

						<div className="space-y-4">
							<Button
								onClick={handleResendVerification}
								disabled={isLoading || verificationSent}
								variant="outline"
								className="w-full"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</>
								) : verificationSent ? (
									'Email Sent!'
								) : (
									'Resend Verification Email'
								)}
							</Button>

							<div className="text-center">
								<p className="text-muted-foreground text-sm">
									Can't find the email? Check your spam folder
									or{' '}
									<button
										onClick={handleResendVerification}
										disabled={isLoading}
										className="text-primary hover:underline"
									>
										try a different email
									</button>
								</p>
							</div>

							<div className="text-center">
								<Button
									onClick={() => {
										setShowVerificationModal(false)
										navigate('/auth/login')
									}}
									variant="ghost"
									className="text-sm"
								>
									Return to Login
								</Button>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
