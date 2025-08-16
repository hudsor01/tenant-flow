/**
 * Signup Form - Configurable Layout
 *
 * Unified signup form with multiple layout options.
 * Consolidates enhanced-signup-form.tsx and signup-form.tsx
 */

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import {
	CheckCircle,
	AlertCircle,
	ArrowRight,
	Building2,
	Mail,
	Lock,
	User,
	Eye,
	EyeOff,
	Shield,
	Check,
	Zap,
	Star
} from 'lucide-react'
import { motion } from '@/lib/framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { signupAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { toast } from 'sonner'
import { supabase } from '@/lib/clients'

type SignupLayout = 'clean' | 'marketing'

interface SignupFormProps {
	redirectTo?: string
	error?: string
	onSuccess?: (result: AuthFormState) => void
	layout?: SignupLayout
}

export function SignupForm({
	redirectTo = '/dashboard',
	error,
	onSuccess,
	layout = 'clean'
}: SignupFormProps) {
	const initialState: AuthFormState = { errors: {} }
	const [state, action] = useActionState(signupAction, initialState)
	const [isPending, _startTransition] = useTransition()
	const [password, setPassword] = useState('')
	const [resendLoading, setResendLoading] = useState(false)
	const [resendSuccess, setResendSuccess] = useState(false)
	const [submittedEmail, setSubmittedEmail] = useState('')

	// Enhanced form state for marketing layout
	const [email, setEmail] = useState('')
	const [name, setName] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [acceptTerms, setAcceptTerms] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [enhancedError, setEnhancedError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	// Enhanced form handlers for marketing layout
	const handleEnhancedSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!acceptTerms) {
			setEnhancedError('Please accept the terms and conditions')
			return
		}

		setIsLoading(true)
		setEnhancedError(null)

		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: { name },
					emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
				}
			})

			if (error) throw error
			if (data.user) {
				setSuccess(true)
				setSubmittedEmail(email)
			}
		} catch (error: unknown) {
			setEnhancedError(
				(error as Error).message || 'An error occurred during signup'
			)
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleSignup = async () => {
		setIsLoading(true)
		setEnhancedError(null)

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
				}
			})
			if (error) throw error
		} catch (error: unknown) {
			setEnhancedError(
				(error as Error).message || 'Failed to sign up with Google'
			)
			setIsLoading(false)
		}
	}

	// Handle success
	useEffect(() => {
		if (state.success) {
			toast.success('Welcome to TenantFlow!')
			if (onSuccess) {
				onSuccess(state)
			}
			// Redirect handled by auth-actions
		}
	}, [state, onSuccess])

	// Success state (handles both layouts)
	if (state.success || (layout === 'marketing' && success)) {
		return (
			<div className="mx-auto w-full max-w-md">
				<div className="rounded-3xl border border-white/20 bg-white/90 p-8 text-center shadow-xl backdrop-blur-sm">
					{/* Animated success icon */}
					<div className="relative mx-auto mb-6">
						<div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
							<CheckCircle className="h-10 w-10 animate-pulse text-green-600" />
						</div>
						{/* Subtle glow effect */}
						<div className="absolute inset-0 animate-pulse rounded-full bg-green-400/20 blur-xl"></div>
					</div>

					{/* Enhanced title and messaging */}
					<h2 className="mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-2xl font-bold text-gray-900 text-transparent">
						Almost there! 🎉
					</h2>

					<p className="mb-2 leading-relaxed text-gray-600">
						We've sent a verification email to:
					</p>
					<p className="mb-4 rounded-lg border bg-gray-50 px-3 py-2 font-semibold text-gray-900">
						{submittedEmail || 'your email address'}
					</p>
					<p className="mb-6 text-sm leading-relaxed text-gray-600">
						Check your inbox and click the link to get started with
						TenantFlow.
					</p>

					{/* Email tips section */}
					<div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
						<div className="flex items-start gap-3 text-left">
							<div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
								<span className="text-primary text-xs font-medium">
									💡
								</span>
							</div>
							<div className="text-sm text-blue-800">
								<p className="mb-1 font-medium">
									Can't find the email?
								</p>
								<ul className="space-y-1 text-xs text-blue-700">
									<li>• Check your spam or junk folder</li>
									<li>
										• The email might take 1-2 minutes to
										arrive
									</li>
									<li>
										• Make sure you entered the correct
										email address
									</li>
								</ul>
							</div>
						</div>
					</div>

					{/* Action buttons */}
					<div className="space-y-3">
						<button
							onClick={async () => {
								setResendLoading(true)
								// Simulate resend process
								setTimeout(() => {
									setResendLoading(false)
									setResendSuccess(true)
									setTimeout(
										() => setResendSuccess(false),
										3000
									) // Reset after 3 seconds
								}, 1500)
							}}
							disabled={resendLoading || resendSuccess}
							className={`w-full transform rounded-xl px-6 py-3 font-semibold shadow-lg transition-all duration-200 ${
								resendSuccess
									? 'cursor-default bg-green-600 text-white'
									: resendLoading
										? 'cursor-not-allowed bg-gray-400 text-white'
										: 'from-primary bg-gradient-to-r to-blue-700 text-white hover:scale-[1.02] hover:from-blue-700 hover:to-blue-800 hover:shadow-xl active:scale-[0.98]'
							}`}
						>
							{resendLoading ? (
								<span className="flex items-center justify-center gap-2">
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
									Sending...
								</span>
							) : resendSuccess ? (
								<span className="flex items-center justify-center gap-2">
									<CheckCircle className="h-4 w-4" />
									Email sent!
								</span>
							) : (
								'Resend verification email'
							)}
						</button>

						{!resendSuccess && (
							<p className="text-xs text-gray-500">
								Didn't receive it? Check the email address and
								try again
							</p>
						)}

						{resendSuccess && (
							<p className="text-xs font-medium text-green-600">
								✓ Verification email sent successfully! Check
								your inbox.
							</p>
						)}
					</div>

					{/* Additional actions */}
					<div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
						<div className="flex items-center justify-center gap-4 text-sm">
							<Link
								href="/auth/login"
								className="text-primary font-medium transition-colors hover:text-blue-700"
							>
								Back to sign in
							</Link>
							<span className="text-gray-300">•</span>
							<a
								href="/support"
								className="hover:text-primary text-gray-600 transition-colors"
							>
								Need help?
							</a>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// Render marketing layout
	if (layout === 'marketing') {
		return (
			<div className="flex min-h-screen">
				{/* Left Panel - Visual with Brand Gradient */}
				<div
					className="relative hidden flex-1 items-center justify-center overflow-hidden p-8 lg:flex"
					style={{
						background: 'var(--gradient-brand)',
						backgroundSize: '200% 200%',
						animation: 'gradient-shift 4s ease infinite',
						color: 'var(--foreground-inverse)'
					}}
				>
					{/* Animated mesh background */}
					<div
						className="absolute inset-0 opacity-20"
						style={{
							background: 'var(--gradient-brand-mesh)',
							filter: 'blur(60px)'
						}}
					/>
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="relative z-10 max-w-md"
					>
						<div className="relative mb-6">
							<Star className="h-12 w-12" />
							<div className="absolute inset-0 animate-pulse">
								<Star
									className="h-12 w-12 opacity-50"
									style={{ filter: 'blur(8px)' }}
								/>
							</div>
						</div>
						<h2 className="mb-4 text-3xl font-bold">
							Join 10,000+ Property Managers
						</h2>
						<p className="mb-8 text-lg opacity-90">
							Start your 14-day free trial today. No credit card
							required.
						</p>
						<div className="space-y-4">
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Unlimited properties & tenants</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>
									Automated rent collection with Stripe
								</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Maintenance request tracking</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>24/7 tenant portal access</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Financial reports & analytics</span>
							</div>
						</div>

						{/* Social Proof */}
						<div
							className="mt-8 border-t pt-8"
							style={{ borderColor: 'oklch(1 0 0 / 0.2)' }}
						>
							<div className="mb-2 flex items-center">
								{[...Array(5)].map((_, i) => (
									<Star
										key={i}
										className="h-5 w-5 fill-current"
									/>
								))}
							</div>
							<p className="text-sm opacity-90">
								"TenantFlow transformed how we manage our 200+
								properties. The automation saves us 20 hours per
								week!"
							</p>
							<p className="mt-2 text-sm font-semibold">
								— Sarah Chen, Property Manager
							</p>
						</div>
					</motion.div>
				</div>

				{/* Right Panel - Form */}
				<div
					className="flex flex-1 items-center justify-center p-8"
					style={{ backgroundColor: 'var(--background)' }}
				>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="w-full max-w-md"
					>
						{/* Logo */}
						<Link
							href="/"
							className="mb-8 flex items-center space-x-2"
						>
							<Building2
								className="h-8 w-8"
								style={{ color: 'var(--steel-600)' }}
							/>
							<span className="text-gradient-brand text-2xl font-bold">
								TenantFlow
							</span>
						</Link>

						{/* Welcome Text */}
						<div className="mb-8">
							<Badge className="badge-accent mb-4">
								<Zap className="mr-1 h-3 w-3" />
								14-Day Free Trial
							</Badge>
							<h1
								className="mb-2 text-3xl font-bold"
								style={{ color: 'var(--foreground)' }}
							>
								Create your account
							</h1>
							<p style={{ color: 'var(--foreground-muted)' }}>
								Get started with TenantFlow in less than a
								minute
							</p>
						</div>

						{/* Signup Form */}
						<Card className="card-elevated p-6">
							<form
								onSubmit={handleEnhancedSubmit}
								className="space-y-6"
							>
								{enhancedError && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{enhancedError}
										</AlertDescription>
									</Alert>
								)}

								{/* Name Field */}
								<div className="space-y-2">
									<Label htmlFor="name">Full Name</Label>
									<div className="relative">
										<User
											className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										/>
										<Input
											id="name"
											type="text"
											placeholder="John Smith"
											value={name}
											onChange={e =>
												setName(e.target.value)
											}
											className="input-field pl-10"
											required
										/>
									</div>
								</div>

								{/* Email Field */}
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<div className="relative">
										<Mail
											className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										/>
										<Input
											id="email"
											type="email"
											placeholder="name@company.com"
											value={email}
											onChange={e =>
												setEmail(e.target.value)
											}
											className="input-field pl-10"
											required
										/>
									</div>
								</div>

								{/* Password Field */}
								<div className="space-y-2">
									<Label htmlFor="password">Password</Label>
									<div className="relative">
										<Lock
											className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										/>
										<Input
											id="password"
											type={
												showPassword
													? 'text'
													: 'password'
											}
											placeholder="••••••••"
											value={password}
											onChange={e =>
												setPassword(e.target.value)
											}
											className="input-field pr-10 pl-10"
											required
											minLength={6}
										/>
										<button
											type="button"
											onClick={() =>
												setShowPassword(!showPassword)
											}
											className="absolute top-1/2 right-3 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
									<p
										className="text-xs"
										style={{
											color: 'var(--foreground-muted)'
										}}
									>
										Must be at least 6 characters
									</p>
								</div>

								{/* Terms & Conditions */}
								<div className="flex items-start space-x-2">
									<Checkbox
										id="terms"
										checked={acceptTerms}
										onCheckedChange={checked =>
											setAcceptTerms(checked as boolean)
										}
										className="mt-1"
									/>
									<Label
										htmlFor="terms"
										className="cursor-pointer text-sm"
									>
										I agree to the{' '}
										<Link
											href="/terms"
											className="underline"
											style={{ color: 'var(--primary)' }}
										>
											Terms of Service
										</Link>{' '}
										and{' '}
										<Link
											href="/privacy"
											className="underline"
											style={{ color: 'var(--primary)' }}
										>
											Privacy Policy
										</Link>
									</Label>
								</div>

								{/* Submit Button */}
								<Button
									type="submit"
									className="btn-brand w-full shadow-xl"
									disabled={isLoading || !acceptTerms}
								>
									{isLoading
										? 'Creating account...'
										: 'Start Free Trial'}
									{!isLoading && (
										<ArrowRight className="ml-2 h-4 w-4" />
									)}
								</Button>

								{/* Divider */}
								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<span
											className="w-full border-t"
											style={{
												borderColor: 'var(--border)'
											}}
										/>
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span
											className="px-2"
											style={{
												backgroundColor:
													'var(--background)',
												color: 'var(--foreground-muted)'
											}}
										>
											Or continue with
										</span>
									</div>
								</div>

								{/* Google Signup */}
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={handleGoogleSignup}
									disabled={isLoading}
								>
									<svg
										className="mr-2 h-4 w-4"
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											fill="currentColor"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
										<path
											fill="currentColor"
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										/>
										<path
											fill="currentColor"
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										/>
									</svg>
									Continue with Google
								</Button>
							</form>

							{/* Sign In Link */}
							<div className="mt-6 text-center">
								<p
									className="text-sm"
									style={{ color: 'var(--foreground-muted)' }}
								>
									Already have an account?{' '}
									<Link
										href="/auth/login"
										className="font-semibold hover:underline"
										style={{ color: 'var(--primary)' }}
									>
										Sign in
									</Link>
								</p>
							</div>
						</Card>

						{/* Security Badge */}
						<div className="mt-6 flex items-center justify-center">
							<Badge variant="outline" className="badge-primary">
								<Shield className="mr-1 h-3 w-3" />
								Secured with bank-level encryption
							</Badge>
						</div>
					</motion.div>
				</div>
			</div>
		)
	}

	// Clean layout (default)
	return (
		<div className="mx-auto w-full max-w-md">
			<div className="rounded-3xl border border-white/20 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
				<form
					action={formData => {
						// Capture email before submitting
						setSubmittedEmail(
							(formData.get('email') as string) || ''
						)
						action(formData)
					}}
					className="space-y-6"
				>
					{/* Error display */}
					{(state.errors?._form || error) && (
						<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
							<div className="flex items-start gap-3">
								<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
								<p className="text-sm text-red-800">
									{state.errors?._form?.[0] || error}
								</p>
							</div>
						</div>
					)}

					{/* Form fields with improved spacing and styling */}
					<div className="space-y-5">
						<div>
							<Label
								htmlFor="fullName"
								className="mb-2 block text-sm font-semibold text-gray-800"
							>
								Full Name
							</Label>
							<Input
								id="fullName"
								name="fullName"
								placeholder="Enter your full name"
								disabled={isPending}
								required
								autoComplete="name"
								className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2"
							/>
						</div>

						<div>
							<Label
								htmlFor="email"
								className="mb-2 block text-sm font-semibold text-gray-800"
							>
								Email Address
							</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="Enter your email"
								disabled={isPending}
								required
								autoComplete="email"
								className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2"
							/>
						</div>

						<div>
							<Label
								htmlFor="password"
								className="mb-2 block text-sm font-semibold text-gray-800"
							>
								Password
							</Label>
							<Input
								id="password"
								name="password"
								type="password"
								placeholder="Create a strong password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								disabled={isPending}
								required
								autoComplete="new-password"
								className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2"
							/>
							{password &&
								password.length > 0 &&
								password.length < 8 && (
									<p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
										<span className="h-1 w-1 rounded-full bg-amber-600"></span>
										{8 - password.length} more character
										{8 - password.length !== 1 ? 's' : ''}{' '}
										needed
									</p>
								)}
						</div>
					</div>

					{/* Hidden fields for backend compatibility */}
					<input
						type="hidden"
						name="confirmPassword"
						value={password}
					/>
					<input type="hidden" name="terms" value="on" />
					<input type="hidden" name="redirectTo" value={redirectTo} />
					<input type="hidden" name="companyName" value="" />

					{/* Submit button */}
					<Button
						type="submit"
						className="from-primary group relative w-full transform overflow-hidden rounded-xl bg-gradient-to-r to-blue-700 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-blue-700 hover:to-blue-800 hover:shadow-2xl active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-lg"
						disabled={isPending || !password || password.length < 8}
					>
						{/* Subtle shine effect */}
						<div className="absolute inset-0 -top-1 -left-1 -skew-x-12 transform bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"></div>

						{isPending ? (
							<span className="relative flex items-center justify-center gap-3">
								<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								<span className="text-base font-medium">
									Creating your account...
								</span>
							</span>
						) : (
							<span className="relative flex items-center justify-center gap-3 text-base font-medium">
								Create Free Account
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</span>
						)}
					</Button>

					{/* OAuth Section - moved below for better flow */}
					<div className="space-y-4">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-100"></div>
							</div>
							<div className="relative flex justify-center">
								<span className="bg-white px-4 text-sm text-gray-400">
									or
								</span>
							</div>
						</div>

						<OAuthProviders disabled={isPending} />
					</div>

					{/* Legal notice - moved to bottom with better styling */}
					<div className="border-t border-gray-100 pt-4">
						<p className="text-center text-xs leading-relaxed text-gray-500">
							By creating an account, you agree to our{' '}
							<Link
								href="/terms"
								className="text-primary underline underline-offset-2 transition-colors hover:text-blue-700"
							>
								Terms of Service
							</Link>{' '}
							and{' '}
							<Link
								href="/privacy"
								className="text-primary underline underline-offset-2 transition-colors hover:text-blue-700"
							>
								Privacy Policy
							</Link>
						</p>
					</div>

					{/* Sign in link */}
					<p className="mt-6 text-center text-sm text-gray-600">
						Already have an account?{' '}
						<Link
							href="/auth/login"
							className="text-primary font-semibold transition-colors hover:text-blue-700"
						>
							Sign in
						</Link>
					</p>
				</form>
			</div>
		</div>
	)
}

export default SignupForm
