'use client'

import { ForgotPasswordModal } from '#components/auth/forgot-password-modal'
import { MfaVerificationDialog } from '#components/auth/mfa-verification-dialog'
import { authKeys } from '#hooks/api/use-auth'
import { createLogger } from '#lib/frontend-logger.js'
import { createClient } from '#lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Home, Lock, Smartphone, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { LoginForm } from './login-form'
import { LoginOAuth } from './login-oauth'

const logger = createLogger({ component: 'LoginPage' })

const HERO_STATS = [
	{ value: '$2.4K+', lines: ['Saved Per', 'Property'] },
	{ value: '98.7%', lines: ['Customer', 'Success'] },
	{ value: '90 sec', lines: ['Support', 'Response'] }
]

/** AUTH-12: Prevent open redirect attacks including protocol-relative URLs. */
function isValidRedirect(redirect: string): boolean {
	if (!redirect.startsWith('/') || redirect.startsWith('//')) return false
	try {
		const url = new URL(redirect, window.location.origin)
		return url.hostname === window.location.hostname
	} catch { return false }
}

function LoginPageContent() {
	const [authError, setAuthError] = useState<string | null>(null)
	const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
	const [showMfaDialog, setShowMfaDialog] = useState(false)
	const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
	const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const router = useRouter()
	const searchParams = useSearchParams()
	const queryClient = useQueryClient()

	// Handle OAuth error from URL params
	useEffect(() => {
		if (!searchParams) return
		const error = searchParams.get('error')
		if (error === 'oauth_failed') {
			router.replace('/login')
		}
	}, [searchParams, router])

	const handleCredentialSubmit = async (value: {
		email: string
		password: string
	}) => {
		setAuthError(null)
		setIsSubmitting(true)

		try {
			const supabase = createClient()
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

			if (data.session?.user) {
				logger.info('[LOGIN_SUCCESS]', { userId: data.session.user.id })

				// CRITICAL: Update query cache BEFORE navigating to prevent race condition
				queryClient.setQueryData(authKeys.session(), data.session)
				queryClient.setQueryData(authKeys.user(), data.session.user)

				const userType = data.session.user.app_metadata?.user_type as
					| string
					| undefined
				const redirectTo = searchParams?.get('redirect')
				let destination =
					userType === 'TENANT'
						? '/tenant'
						: userType === 'PENDING'
							? '/auth/select-role'
							: '/dashboard'

				if (redirectTo && isValidRedirect(redirectTo)) {
					destination = redirectTo
				}

				// Check if MFA verification is required
				const { data: aalData } =
					await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

				if (
					aalData?.nextLevel === 'aal2' &&
					aalData?.currentLevel !== 'aal2'
				) {
					logger.info('[MFA_REQUIRED]', { userId: data.session.user.id })
					const { data: factorsData } = await supabase.auth.mfa.listFactors()
					const totpFactor = factorsData?.totp?.find(
						f => f.status === 'verified'
					)

					if (totpFactor) {
						setPendingRedirect(destination)
						setMfaFactorId(totpFactor.id)
						setShowMfaDialog(true)
						return
					}
				}

				logger.info('[LOGIN_REDIRECT]', {
					destination,
					userType: userType || 'OWNER'
				})
				router.push(destination)
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Please try again'
			setAuthError(message)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleMfaSuccess = () => {
		logger.info('[MFA_VERIFIED]', { destination: pendingRedirect })
		setShowMfaDialog(false)
		if (pendingRedirect) router.push(pendingRedirect)
	}

	const handleMfaCancel = async () => {
		const supabase = createClient()
		await supabase.auth.signOut()
		setShowMfaDialog(false); setMfaFactorId(null); setPendingRedirect(null)
		setAuthError('Two-factor authentication is required to sign in.')
	}

	return (
		<>
			<div className="min-h-screen flex bg-background">
				{/* Image Section - Hidden on mobile */}
				<div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
					<div className="absolute inset-0 transform scale-105">
						<Image src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=2340&q=80" alt="Modern apartment building" fill sizes="50vw" className="object-cover" priority />
					</div>
					<div className="absolute inset-0 bg-black/25" />
					<div className="absolute inset-0 flex-center">
						<div className="relative max-w-lg mx-auto px-8">
							<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />
							<div className="relative text-center space-y-6 py-12 px-8">
								<div className="size-16 mx-auto mb-8">
									<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-white/20 shadow-lg">
										<Home className="size-8 text-primary-foreground" />
									</div>
								</div>
								<h2 className="text-foreground font-bold text-xl">Your Success Dashboard Awaits</h2>
								<p className="text-muted-foreground max-w-md mx-auto text-base">
									Join 10,000+ property managers who check their dashboard daily to see vacancy rates drop, NOI increase, and hours saved multiply.
								</p>
								<div className="grid grid-cols-3 gap-6 pt-6">
									{HERO_STATS.map(stat => (
										<div key={stat.value} className="text-center">
											<div className="text-foreground font-bold mb-1 text-base">{stat.value}</div>
											<div className="text-muted-foreground text-xs font-medium">
												{stat.lines.map((line, i, arr) => (
													<span key={line}>{line}{i < arr.length - 1 && <br />}</span>
												))}
											</div>
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
						<div className="text-center space-y-4">
							<div className="size-14 mx-auto">
								<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm">
									<Home className="size-7 text-primary-foreground" />
								</div>
							</div>
							<div className="space-y-2">
								<h1 className="typography-h3 text-foreground">Welcome Back to Your $30,000 Annual Savings</h1>
								<p className="text-muted-foreground text-sm">Your properties are generating 40% more NOI while you&apos;ve been away.</p>
							</div>
						</div>
						<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border/50">
							<p className="text-muted-foreground">
								<strong className="text-foreground">Property Owners:</strong> New to TenantFlow?{' '}
								<Link href="/pricing" className="text-primary hover:underline font-medium">View plans</Link>
							</p>
							<p className="text-muted-foreground">
								<strong className="text-foreground">Tenants:</strong> Check your email for an invitation link
							</p>
						</div>

						{/* Credential Login Form */}
						<LoginForm
							authError={authError}
							isSubmitting={isSubmitting}
							onSubmit={handleCredentialSubmit}
							onForgotPassword={() => setForgotPasswordOpen(true)}
							onCreateAccount={() => router.push('/pricing')}
						/>

						{/* OAuth */}
						<LoginOAuth />

						{/* Trust Indicators */}
						<div className="text-center space-y-4 pt-4 border-t border-border/50">
							<p className="text-muted-foreground/80 text-xs font-medium">
								Trusted by property managers worldwide
							</p>
							<div className="flex-center flex-wrap gap-4 sm:gap-6 text-xs">
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Lock className="size-3" />
									<span className="font-medium hidden sm:inline">
										Bank-level Security
									</span>
									<span className="font-medium sm:hidden">Secure</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Zap className="size-3" />
									<span className="font-medium">99.9% Uptime</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Smartphone className="size-3" />
									<span className="font-medium hidden sm:inline">
										Mobile Ready
									</span>
									<span className="font-medium sm:hidden">Mobile</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<ForgotPasswordModal
				open={forgotPasswordOpen}
				onOpenChange={setForgotPasswordOpen}
			/>

			{mfaFactorId && (
				<MfaVerificationDialog
					open={showMfaDialog}
					onOpenChange={setShowMfaDialog}
					factorId={mfaFactorId}
					onSuccess={handleMfaSuccess}
					onCancel={handleMfaCancel}
				/>
			)}
		</>
	)
}

function LoginFallback() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4">
				<div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary animate-pulse">
					<Building2 className="w-6 h-6 text-primary-foreground" />
				</div>
				<span className="text-sm text-muted-foreground animate-pulse">
					Loading...
				</span>
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={<LoginFallback />}>
			<LoginPageContent />
		</Suspense>
	)
}
