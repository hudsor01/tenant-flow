'use client'

import React from 'react'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { Skeleton } from '#components/ui/skeleton'
import { getFieldErrorMessage } from '#lib/utils/form'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
	CheckCircle2,
	Eye,
	EyeOff,
	Home,
	Lock,
	Mail,
	Building2,
	AlertCircle,
	XCircle
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'error' | 'accepted'

const logger = createLogger({ component: 'AcceptInvitePage' })

// Validation schema for tenant signup
const signupSchema = z
	.object({
		email: z.string().email('Invalid email format'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

interface InvitationData {
	valid: boolean
	email: string
	expires_at: string
	property_owner_name?: string
	property_name?: string
	unit_number?: string
}



function AcceptInviteContent() {
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [pageState, setPageState] = useState<PageState>('loading')
	const [invitation, setInvitation] = useState<InvitationData | null>(null)
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [isAccepting, setIsAccepting] = useState(false)

	const router = useRouter()
	const searchParams = useSearchParams()
	const code = searchParams?.get('code')

	// Validate invitation on mount
	useEffect(() => {
		async function validateInvitation() {
			if (!code) {
				setPageState('invalid')
				setErrorMessage('No invitation code provided')
				return
			}

			try {
				const apiUrl = getApiBaseUrl()
				const response = await fetch(
					`${apiUrl}/api/v1/tenants/invitation/${code}`,
					{
						method: 'GET',
						headers: { 'Content-Type': 'application/json' }
					}
				)

				if (!response.ok) {
					const error = await response.json().catch(() => ({}))
					if (response.status === 404) {
						setPageState('invalid')
						setErrorMessage(
							'This invitation link is invalid or has already been used'
						)
					} else if (response.status === 410) {
						setPageState('expired')
						setErrorMessage(
							'This invitation has expired. Please contact your property manager for a new invitation.'
						)
					} else {
						setPageState('error')
						setErrorMessage(error.message || 'Failed to validate invitation')
					}
					return
				}

				const data = await response.json()
				setInvitation(data)
				setPageState('valid')
			} catch (error) {
				logger.error('Failed to validate invitation', { error })
				setPageState('error')
				setErrorMessage('Unable to connect to server. Please try again.')
			}
		}

		validateInvitation()
	}, [code])

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
			confirmPassword: ''
		},
		validators: { onSubmit: signupSchema },
		onSubmit: async ({ value }) => {
			if (!code || !invitation) return

			setIsAccepting(true)
			setErrorMessage('')

			try {
				const supabase = createClient()

				// Step 1: Create Supabase auth account
				const { data: authData, error: signUpError } =
					await supabase.auth.signUp({
						email: value.email,
						password: value.password,
						options: {
							data: {
								user_type: 'TENANT'
							}
						}
					})

				if (signUpError) {
					// Check if user already exists
					if (signUpError.message.includes('already registered')) {
						// Try to sign in instead
						const { data: signInData, error: signInError } =
							await supabase.auth.signInWithPassword({
								email: value.email,
								password: value.password
							})

						if (signInError) {
							throw new Error(
								'Account exists. Please use the correct password or reset it.'
							)
						}

						if (!signInData.user) {
							throw new Error('Failed to sign in')
						}

						// Accept invitation with existing user
						await acceptInvitation(signInData.user.id)
						return
					}

					throw new Error(signUpError.message)
				}

				if (!authData.user) {
					throw new Error('Failed to create account')
				}

				// Step 2: Accept the invitation
				await acceptInvitation(authData.user.id)
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Failed to accept invitation'
				setErrorMessage(message)
				logger.error('Accept invitation failed', { error: message })
			} finally {
				setIsAccepting(false)
			}
		}
	})

	async function acceptInvitation(authUserId: string) {
		const apiUrl = getApiBaseUrl()
		const response = await fetch(
			`${apiUrl}/api/v1/tenants/invitation/${code}/accept`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ authuser_id: authUserId })
			}
		)

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(error.message || 'Failed to accept invitation')
		}

		logger.info('Invitation accepted successfully')
		setPageState('accepted')

		// Redirect to tenant dashboard after short delay
		setTimeout(() => {
			router.push('/tenant')
		}, 2000)
	}

	// Update email field when invitation loads
	useEffect(() => {
		if (invitation?.email) {
			form.setFieldValue('email', invitation.email)
		}
	}, [invitation?.email, form])

	// Render different states
	if (pageState === 'loading') {
		return <LoadingState />
	}

	if (
		pageState === 'invalid' ||
		pageState === 'expired' ||
		pageState === 'error'
	) {
		return <ErrorState state={pageState} message={errorMessage} />
	}

	if (pageState === 'accepted') {
		return <SuccessState />
	}

	return (
		<div className="min-h-screen flex bg-background">
			{/* Image Section - Hidden on mobile */}
			<div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
				<div className="absolute inset-0 transform scale-105">
					<Image
						src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2340&q=80"
						alt="Modern apartment interior"
						fill
						sizes="50vw"
						className="object-cover"
						priority
					/>
				</div>
				<div className="absolute inset-0 bg-black/25" />

				<div className="absolute inset-0 flex-center">
					<div className="relative max-w-lg mx-auto px-8">
						<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

						<div className="relative text-center space-y-6 py-12 px-8">
							<div className="size-16 mx-auto mb-8">
								<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-white/20 shadow-lg">
									<Building2 className="size-8 text-primary-foreground" />
								</div>
							</div>

							<h2 className="text-foreground font-bold text-xl">
								Welcome to TenantFlow
							</h2>

							<p className="text-muted-foreground max-w-md mx-auto text-base">
								Your property manager has invited you to join their platform.
								Create your account to access your tenant portal.
							</p>

							<div className="grid grid-cols-3 gap-6 pt-6">
								{[
									{ icon: CheckCircle2, label: 'Pay Rent\nOnline' },
									{ icon: Home, label: 'Submit\nRequests' },
									{ icon: Lock, label: 'Secure\nPortal' }
								].map(item => (
									<div key={item.label} className="text-center">
										<div className="size-10 mx-auto mb-2 bg-primary/10 rounded-lg flex-center">
											<item.icon className="size-5 text-primary" />
										</div>
										<div
											className="text-muted-foreground text-xs font-medium"
											dangerouslySetInnerHTML={{
												__html: item.label.replace('\n', '<br />')
											}}
										/>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Form Section */}
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 min-h-screen">
				<div className="w-full max-w-sm space-y-8">
					{/* Logo & Title */}
					<div className="text-center space-y-4">
						<div className="size-14 mx-auto">
							<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm">
								<Home className="size-7 text-primary-foreground" />
							</div>
						</div>

						<div className="space-y-2">
							<h1 className="text-2xl font-bold text-foreground">
								Accept Your Invitation
							</h1>
							<p className="text-muted-foreground text-sm">
								Create your tenant account to get started
							</p>
						</div>
					</div>

					{/* Invitation Details */}
					{invitation && (
						<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border/50">
							{invitation.property_owner_name && (
								<p className="text-muted-foreground">
									<strong className="text-foreground">Invited by:</strong>{' '}
									{invitation.property_owner_name}
								</p>
							)}
							{invitation.property_name && (
								<p className="text-muted-foreground">
									<strong className="text-foreground">Property:</strong>{' '}
									{invitation.property_name}
									{invitation.unit_number &&
										` - Unit ${invitation.unit_number}`}
								</p>
							)}
							<p className="text-muted-foreground">
								<strong className="text-foreground">Email:</strong>{' '}
								{invitation.email}
							</p>
						</div>
					)}

					{/* Signup Form */}
					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-5"
					>
						{errorMessage && (
							<div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
								<span className="font-medium">Error:</span> {errorMessage}
							</div>
						)}

						{/* Email Field */}
						<form.Field name="email">
							{field => (
								<Field>
									<FieldLabel htmlFor="email">Email address</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Mail />
										</InputGroupAddon>
										<InputGroupInput
											id="email"
											type="email"
											placeholder="Enter your email"
											autoComplete="email"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={isAccepting || !!invitation?.email}
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
							{field => (
								<Field>
									<FieldLabel htmlFor="password">Create password</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Lock />
										</InputGroupAddon>
										<InputGroupInput
											id="password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Create a secure password"
											autoComplete="new-password"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={isAccepting}
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

						{/* Confirm Password Field */}
						<form.Field name="confirmPassword">
							{field => (
								<Field>
									<FieldLabel htmlFor="confirmPassword">
										Confirm password
									</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Lock />
										</InputGroupAddon>
										<InputGroupInput
											id="confirmPassword"
											type={showConfirmPassword ? 'text' : 'password'}
											placeholder="Confirm your password"
											autoComplete="new-password"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={isAccepting}
											aria-invalid={field.state.meta.errors.length > 0}
										/>
										<InputGroupAddon align="inline-end">
											<button
												type="button"
												onClick={() =>
													setShowConfirmPassword(!showConfirmPassword)
												}
												className="text-muted-foreground hover:text-foreground transition-colors"
												tabIndex={-1}
											>
												{showConfirmPassword ? <EyeOff /> : <Eye />}
												<span className="sr-only">
													{showConfirmPassword ? 'Hide' : 'Show'} password
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
							className="w-full h-11 text-sm font-medium"
							disabled={isAccepting}
						>
							{isAccepting
								? 'Creating Account...'
								: 'Accept Invitation & Create Account'}
						</Button>

						{/* Already have account */}
						<p className="text-center text-muted">
							Already have an account?{' '}
							<Link
								href="/login"
								className="text-primary hover:underline font-medium"
							>
								Sign in
							</Link>
						</p>
					</form>

					{/* Footer */}
					<div className="text-center text-caption/70">
						By creating an account, you agree to our{' '}
						<Link href="/terms" className="hover:underline">
							Terms of Service
						</Link>{' '}
						and{' '}
						<Link href="/privacy" className="hover:underline">
							Privacy Policy
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

function LoadingState() {
	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-sm space-y-8 text-center">
				<div className="size-14 mx-auto">
					<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm animate-pulse">
						<Home className="size-7 text-primary-foreground" />
					</div>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-8 w-48 mx-auto" />
					<Skeleton className="h-4 w-64 mx-auto" />
				</div>
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</div>
		</div>
	)
}

function ErrorState({ state, message }: { state: PageState; message: string }) {
	const isExpired = state === 'expired'
	const Icon = isExpired ? AlertCircle : XCircle

	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-md text-center space-y-6">
				<div
					className={`size-20 mx-auto rounded-full flex-center ${isExpired ? 'bg-warning/10' : 'bg-destructive/10'}`}
				>
					<Icon
						className={`size-10 ${isExpired ? 'text-warning' : 'text-destructive'}`}
					/>
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-bold text-foreground">
						{isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
					</h1>
					<p className="text-muted-foreground">{message}</p>
				</div>

				<div className="pt-4 space-y-3">
					<Button asChild className="w-full">
						<Link href="/login">Go to Login</Link>
					</Button>
					<p className="text-muted">
						Need help?{' '}
						<Link href="/contact" className="text-primary hover:underline">
							Contact Support
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}

function SuccessState() {
	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-md text-center space-y-6">
				<div className="size-20 mx-auto rounded-full bg-success/10 flex-center">
					<CheckCircle2 className="size-10 text-success" />
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-bold text-foreground">
						Welcome to TenantFlow!
					</h1>
					<p className="text-muted-foreground">
						Your account has been created and verified. Redirecting you to your
						tenant portal...
					</p>
				</div>

				<div className="pt-4">
					<div className="animate-spin size-6 mx-auto border-2 border-primary border-t-transparent rounded-full" />
				</div>
			</div>
		</div>
	)
}

export default function AcceptInvitePage() {
	return (
		<Suspense fallback={<LoadingState />}>
			<AcceptInviteContent />
		</Suspense>
	)
}
