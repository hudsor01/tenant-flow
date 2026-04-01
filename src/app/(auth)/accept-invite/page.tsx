/**
 * Accept Invite Page
 *
 * Allows tenants to accept invitations and create their accounts.
 * Uses TanStack Query queryOptions for invitation validation.
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Home } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { createClient } from '#lib/supabase/client'
import { createLogger } from '#lib/frontend-logger'

import { Button } from '#components/ui/button'
import { ErrorState } from '#components/auth/accept-invite/error-state'
import { InviteHeroSection } from '#components/auth/accept-invite/invite-hero-section'
import { InviteSignupForm } from '#components/auth/accept-invite/invite-signup-form'
import { LoadingState } from '#components/auth/accept-invite/loading-state'
import { SuccessState } from '#components/auth/accept-invite/success-state'
import type { AcceptInviteFormValues } from '#components/auth/accept-invite/accept-invite-form-types'
import {
	InvalidInviteError,
	tenantInvitationQueries
} from '#hooks/api/query-keys/tenant-invitation-keys'

const logger = createLogger({ component: 'AcceptInvitePage' })

function AcceptInviteContent() {
	const [accepted, setAccepted] = useState(false)
	const [submitError, setSubmitError] = useState('')
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [checkingSession, setCheckingSession] = useState(true)
	const [accepting, setAccepting] = useState(false)

	const router = useRouter()
	const searchParams = useSearchParams()
	const code = searchParams.get('code')

	const {
		data: invitation,
		isLoading,
		error
	} = useQuery(tenantInvitationQueries.validate(code))

	// Check for existing session on mount (D-08)
	useEffect(() => {
		const supabase = createClient()
		supabase.auth
			.getUser()
			.then(({ data }) => {
				if (data.user) {
					setCurrentUser(data.user)
				}
				setCheckingSession(false)
			})
			.catch(() => {
				setCheckingSession(false)
			})
	}, [])

	async function acceptInvitation() {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabase = createClient()

		// AUTH-09: Get session access token for Bearer auth
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.access_token) {
			throw new Error('You must be logged in to accept an invitation')
		}

		const response = await fetch(
			`${supabaseUrl}/functions/v1/tenant-invitation-accept`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				},
				body: JSON.stringify({ code })
			}
		)

		if (!response.ok) {
			const err = await response.json().catch(() => ({}))
			throw new Error(
				(err as { error?: string }).error ||
					'Failed to accept invitation'
			)
		}

		logger.info('Invitation accepted successfully')

		// Refresh session so the JWT picks up updated app_metadata.user_type = 'TENANT'
		await supabase.auth.refreshSession()

		setAccepted(true)

		setTimeout(() => {
			router.push('/tenant')
		}, 2000)
	}

	async function handleSignup(value: AcceptInviteFormValues) {
		if (!code || !invitation) return

		setSubmitError('')

		try {
			const supabase = createClient()

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
				if (signUpError.message.includes('already registered')) {
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

					await acceptInvitation()
					return
				}

				throw new Error(signUpError.message)
			}

			if (!authData.user) {
				throw new Error('Failed to create account')
			}

			await acceptInvitation()
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to accept invitation'
			setSubmitError(message)
			logger.error('Accept invitation failed', { error: message })
		}
	}

	async function handleLoggedInAccept(): Promise<void> {
		setAccepting(true)
		setSubmitError('')
		try {
			// acceptInvitation() already calls setAccepted(true)
			await acceptInvitation()
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to accept invitation'
			setSubmitError(message)
			logger.error('Logged-in accept failed', { error: message })
		} finally {
			setAccepting(false)
		}
	}

	if (!code) {
		return <ErrorState state="error" message="No invitation code provided" />
	}

	if (isLoading) {
		return <LoadingState />
	}

	if (error) {
		if (error instanceof InvalidInviteError) {
			const customMessage =
				error.message !== `Invitation ${error.state}`
					? error.message
					: ''
			return <ErrorState state={error.state} message={customMessage} />
		}
		logger.error('Failed to validate invitation', { error })
		return (
			<ErrorState
				state="error"
				message="Failed to validate invitation. Please try again."
			/>
		)
	}

	if (accepted) {
		return <SuccessState />
	}

	// If still checking session, show loading (brief flash)
	if (checkingSession) {
		return (
			<div className="min-h-screen bg-background flex">
				<InviteHeroSection />
				<div className="flex-1 flex items-center justify-center p-8">
					<LoadingState />
				</div>
			</div>
		)
	}

	// Logged-in user: show one-click accept (D-08)
	if (currentUser && invitation) {
		return (
			<div className="min-h-screen flex bg-background">
				<InviteHeroSection />
				<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 min-h-screen">
					<div className="w-full max-w-md space-y-6">
						<div className="text-center">
							<div className="size-14 mx-auto mb-4">
								<div className="w-full h-full bg-primary/10 rounded-full flex-center">
									<Home className="size-7 text-primary" />
								</div>
							</div>
							<h1 className="typography-h3 text-foreground">
								Accept Your Invitation
							</h1>
							<p className="text-sm text-muted-foreground mt-2">
								You&apos;re signed in as {currentUser.email}. Accept this
								invitation to join as a tenant.
							</p>
						</div>

						{submitError && (
							<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
								<p className="text-sm text-destructive">{submitError}</p>
							</div>
						)}

						<Button
							size="lg"
							className="w-full"
							onClick={handleLoggedInAccept}
							disabled={accepting}
						>
							{accepting ? 'Accepting...' : 'Accept Invitation'}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex bg-background">
			<InviteHeroSection />

			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 min-h-screen">
				<div className="w-full max-w-md">
					<div className="space-y-4 text-center mb-8">
						<div className="size-14 mx-auto">
							<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm">
								<Home className="size-7 text-primary-foreground" />
							</div>
						</div>

						<div className="space-y-2">
							<h1 className="typography-h3 text-foreground">
								Accept Your Invitation
							</h1>
							<p className="text-muted-foreground text-sm">
								Create your tenant account to get started
							</p>
						</div>
					</div>

					<InviteSignupForm
						invitation={invitation ?? null}
						errorMessage={submitError}
						onSubmit={handleSignup}
						code={code}
					/>
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
