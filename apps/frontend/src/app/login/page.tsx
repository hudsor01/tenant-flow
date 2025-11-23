'use client'

import { GoogleButton } from '#components/auth/google-button'
import { ForgotPasswordModal } from '#components/auth/forgot-password-modal'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '#components/ui/input-group'
import { getFieldErrorMessage } from '#lib/utils/form'
import { useModalStore } from '#stores/modal-store'
import { useUserRole } from '#hooks/use-user-role'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { loginZodSchema } from '@repo/shared/validation/auth'
import { useForm } from '@tanstack/react-form'
import { Eye, EyeOff, Home, Lock, Mail, Smartphone, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { env } from '#config/env'

const logger = createLogger({ component: 'LoginPage' })

function LoginPageContent() {
	const [showPassword, setShowPassword] = useState(false)
	const [authError, setAuthError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [justLoggedIn, setJustLoggedIn] = useState(false)

	const { openModal } = useModalStore()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { isTenant, isLoading: roleLoading } = useUserRole()

	// Handle OAuth error from URL params
	useEffect(() => {
		if (!searchParams) return
		const error = searchParams.get('error')
		if (error === 'oauth_failed') {
			router.replace('/login')
		}
	}, [searchParams, router])

	// Handle post-login redirect
	useEffect(() => {
		if (justLoggedIn && !roleLoading) {
			let destination = isTenant ? '/tenant' : '/manage'
			const redirectTo = searchParams?.get('redirectTo')
			if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
				destination = redirectTo
			}

			logger.info('[LOGIN_REDIRECT]', {
				destination,
				userType: isTenant ? 'TENANT' : 'OWNER'
			})

			router.push(destination)
			router.refresh()
			setJustLoggedIn(false)
		}
	}, [justLoggedIn, roleLoading, isTenant, router, searchParams])

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: { onSubmit: loginZodSchema },
		onSubmit: async ({ value }) => {
			setIsLoading(true)
			setAuthError(null)

			try {
				const supabase = getSupabaseClientInstance()
				const { data, error } = await supabase.auth.signInWithPassword({
					email: value.email,
					password: value.password
				})

				if (error) {
					logger.error('[LOGIN_FAILED]', { error: error.message })

					if (error.message.includes('Email not confirmed')) {
						router.push('/auth/confirm-email')
						throw new Error('Please confirm your email before signing in.')
					}

					throw new Error(
						error.message === 'Invalid login credentials'
							? 'Invalid email or password.'
							: error.message
					)
				}

				if (data.user) {
					logger.info('[LOGIN_SUCCESS]', { userId: data.user.id })
					setJustLoggedIn(true)
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Please try again'
				setAuthError(message)
				setIsLoading(false)
			}
		}
	})

	const handleGoogleLogin = async () => {
		setIsGoogleLoading(true)
		try {
			const supabase = getSupabaseClientInstance()
			const redirectUrl = env.NODE_ENV === 'development'
				? 'http://localhost:3000/auth/callback'
				: `${window.location.origin}/auth/callback`

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo: redirectUrl }
			})

			if (error) {
				logger.error('[GOOGLE_LOGIN_FAILED]', { error: error.message })
			}
		} catch (error) {
			logger.error('[GOOGLE_LOGIN_ERROR]', {
				error: error instanceof Error ? error.message : String(error)
			})
		} finally {
			setIsGoogleLoading(false)
		}
	}

	return (
		<>
			<div className="min-h-screen flex bg-background">
				{/* Image Section - Hidden on mobile */}
				<div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
					<div className="absolute inset-0 transform scale-105">
						<Image
							src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=2340&q=80"
							alt="Modern apartment building"
							fill
							sizes="50vw"
							className="object-cover"
							priority
						/>
					</div>
					<div className="absolute inset-0 bg-black/25" />

					<div className="absolute inset-0 flex items-center justify-center">
						<div className="relative max-w-lg mx-auto px-8">
							<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

							<div className="relative text-center space-y-6 py-12 px-8">
								<div className="size-16 mx-auto mb-8">
									<div className="absolute inset-0 bg-primary/55 rounded-2xl blur-xl" />
									<div className="relative w-full h-full bg-primary rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
										<Home className="size-8 text-primary-foreground" />
									</div>
								</div>

								<h2 className="text-foreground font-bold text-xl">
									Your Success Dashboard Awaits
								</h2>

								<p className="text-muted-foreground max-w-md mx-auto text-base">
									Join 10,000+ property managers who check their dashboard daily to see vacancy rates drop, NOI increase, and hours saved multiply.
								</p>

								<div className="grid grid-cols-3 gap-6 pt-6">
									{[
										{ value: '$2.4K+', label: 'Saved Per\nProperty' },
										{ value: '98.7%', label: 'Customer\nSuccess' },
										{ value: '90 sec', label: 'Support\nResponse' }
									].map((stat, i) => (
										<div key={i} className="text-center">
											<div className="text-foreground font-bold mb-1 text-base">
												{stat.value}
											</div>
											<div
												className="text-muted-foreground text-xs font-medium"
												dangerouslySetInnerHTML={{ __html: stat.label.replace('\n', '<br />') }}
											/>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Form Section */}
				<div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 min-h-screen">
					<div className="w-full max-w-sm space-y-8">
						{/* Logo & Title */}
						<div className="text-center space-y-4">
							<div className="size-14 mx-auto">
								<div className="w-full h-full bg-primary rounded-xl flex items-center justify-center shadow-sm">
									<Home className="size-7 text-primary-foreground" />
								</div>
							</div>

							<div className="space-y-2">
								<h1 className="text-2xl font-bold text-foreground">
									Welcome Back to Your $30,000 Annual Savings
								</h1>
								<p className="text-muted-foreground text-sm">
									Your properties are generating 40% more NOI while you've been away.
								</p>
							</div>
						</div>

						{/* Helper Text */}
						<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border/50">
							<p className="text-muted-foreground">
								<strong className="text-foreground">Property Owners:</strong> New to TenantFlow?{' '}
								<Link href="/pricing" className="text-primary hover:underline font-medium">
									View plans
								</Link>
							</p>
							<p className="text-muted-foreground">
								<strong className="text-foreground">Tenants:</strong> Check your email for an invitation link
							</p>
						</div>

						{/* Login Form */}
						<form
							onSubmit={(e) => {
								e.preventDefault()
								form.handleSubmit()
							}}
							className="space-y-5"
						>
							{authError && (
								<div
									data-testid="auth-error"
									className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive"
								>
									<span className="font-medium">Sign in failed:</span> {authError}
								</div>
							)}

							{/* Email Field */}
							<form.Field name="email">
								{(field) => (
									<Field>
										<FieldLabel htmlFor="email">Email address</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Mail />
											</InputGroupAddon>
											<InputGroupInput
												id="email"
												data-testid="email-input"
												type="email"
												placeholder="Enter your email"
												autoComplete="email"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												disabled={isLoading}
												aria-invalid={field.state.meta.errors.length > 0}
											/>
										</InputGroup>
										<FieldError>
											{field.state.meta.errors.length
												? getFieldErrorMessage(field.state.meta.errors)
												: null}
										</FieldError>
									</Field>
								)}
							</form.Field>

							{/* Password Field */}
							<form.Field name="password">
								{(field) => (
									<Field>
										<FieldLabel htmlFor="password">Password</FieldLabel>
										<InputGroup>
											<InputGroupInput
												id="password"
												data-testid="password-input"
												type={showPassword ? 'text' : 'password'}
												placeholder="Enter your password"
												autoComplete="current-password"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												disabled={isLoading}
												aria-invalid={field.state.meta.errors.length > 0}
											/>
											<InputGroupAddon align="inline-end">
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													className="text-muted-foreground hover:text-foreground transition-colors"
													tabIndex={-1}
												>
													{showPassword ? <EyeOff /> : <Eye />}
													<span className="sr-only">
														{showPassword ? 'Hide' : 'Show'} password
													</span>
												</button>
											</InputGroupAddon>
										</InputGroup>
										<FieldError>
											{field.state.meta.errors.length
												? getFieldErrorMessage(field.state.meta.errors)
												: null}
										</FieldError>
									</Field>
								)}
							</form.Field>

							{/* Submit Button */}
							<Button
								type="submit"
								data-testid="login-button"
								className="w-full h-11 text-sm font-medium"
								disabled={isLoading || form.state.isSubmitting}
							>
								{isLoading || form.state.isSubmitting ? 'Signing in...' : 'Sign In'}
							</Button>

							{/* Divider */}
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-border/60" />
								</div>
								<div className="relative flex justify-center text-xs">
									<span className="bg-background px-3 text-muted-foreground">
										or continue with
									</span>
								</div>
							</div>

							{/* Google Button */}
							<GoogleButton
								onClick={handleGoogleLogin}
								isLoading={isGoogleLoading}
								mode="login"
								className="w-full"
							/>

							{/* Footer Links */}
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<button
									type="button"
									onClick={() => openModal('forgot-password')}
									className="hover:text-foreground transition-colors"
									data-testid="forgot-password-link"
								>
									Forgot password?
								</button>
								<button
									type="button"
									onClick={() => router.push('/signup')}
									className="hover:text-foreground transition-colors"
									data-testid="signup-link"
								>
									Create account
								</button>
							</div>
						</form>

						{/* Trust Indicators */}
						<div className="text-center space-y-4 pt-4 border-t border-border/50">
							<p className="text-muted-foreground/80 text-xs font-medium">
								Trusted by property managers worldwide
							</p>
							<div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 text-xs">
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Lock className="size-3" />
									<span className="font-medium hidden sm:inline">Bank-level Security</span>
									<span className="font-medium sm:hidden">Secure</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Zap className="size-3" />
									<span className="font-medium">99.9% Uptime</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Smartphone className="size-3" />
									<span className="font-medium hidden sm:inline">Mobile Ready</span>
									<span className="font-medium sm:hidden">Mobile</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<ForgotPasswordModal />
		</>
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<LoginPageContent />
		</Suspense>
	)
}
