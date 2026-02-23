/**
 * Accept Invite Page
 *
 * Allows tenants to accept invitations and create their accounts.
 * Extracted components for maintainability per CLAUDE.md KISS principle.
 */

'use client'

import { Home } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { createClient } from '#lib/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'

import { LoadingState } from '#components/auth/accept-invite/loading-state'
import { ErrorState } from '#components/auth/accept-invite/error-state'
import { SuccessState } from '#components/auth/accept-invite/success-state'
import { InviteHeroSection } from '#components/auth/accept-invite/invite-hero-section'
import { InviteSignupForm } from '#components/auth/accept-invite/invite-signup-form'
import type {
	PageState,
	InvitationData,
	AcceptInviteFormValues
} from '#components/auth/accept-invite/accept-invite-form-types'

const logger = createLogger({ component: 'AcceptInvitePage' })

function AcceptInviteContent() {
	const [pageState, setPageState] = useState<PageState>('loading')
	const [invitation, setInvitation] = useState<InvitationData | null>(null)
	const [errorMessage, setErrorMessage] = useState<string>('')

	const router = useRouter()
	const searchParams = useSearchParams()
	const code = searchParams.get('code')

	useEffect(() => {
		async function validateInvitation() {
			if (!code) {
				setErrorMessage('No invitation code provided')
				setPageState('error')
				return
			}

			try {
				const apiUrl = getApiBaseUrl()
				const response = await fetch(
					`${apiUrl}/api/v1/tenants/invitation/${code}/validate`,
					{ method: 'GET' }
				)

				if (!response.ok) {
					if (response.status === 404) {
						setErrorMessage('This invitation is invalid or has already been used.')
						setPageState('invalid')
					} else if (response.status === 410) {
						setPageState('expired')
					} else {
						setPageState('error')
					}
					return
				}

				const data = (await response.json()) as InvitationData

				if (!data.valid) {
					setPageState('invalid')
					return
				}

				setInvitation(data)
				setPageState('valid')
			} catch (error) {
				logger.error('Failed to validate invitation', { error })
				setPageState('error')
				setErrorMessage('Failed to validate invitation. Please try again.')
			}
		}

		validateInvitation()
	}, [code])

	async function acceptInvitation(authUserId: string) {
		const apiUrl = getApiBaseUrl()
		const supabase = createClient()
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
			throw new Error((error as { message?: string }).message || 'Failed to accept invitation')
		}

		logger.info('Invitation accepted successfully')

		// Refresh session so the JWT picks up updated app_metadata.user_type = 'TENANT'
		// set by the backend during invitation acceptance.
		await supabase.auth.refreshSession()

		setPageState('accepted')

		// Redirect to tenant dashboard after short delay
		setTimeout(() => {
			router.push('/tenant')
		}, 2000)
	}

	async function handleSignup(value: AcceptInviteFormValues) {
		if (!code || !invitation) return

		setErrorMessage('')

		try {
			const supabase = createClient()

			// Step 1: Create Supabase auth account
			const { data: authData, error: signUpError } = await supabase.auth.signUp(
				{
					email: value.email,
					password: value.password,
					options: {
						data: {
							user_type: 'TENANT'
						}
					}
				}
			)

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
		}
	}

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
			<InviteHeroSection />

			{/* Form Section */}
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 min-h-screen">
				{/* Logo & Title */}
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
					invitation={invitation}
					errorMessage={errorMessage}
					onSubmit={handleSignup}
				/>
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
