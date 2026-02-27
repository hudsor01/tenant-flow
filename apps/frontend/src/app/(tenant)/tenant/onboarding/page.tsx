/**
 * Tenant Onboarding Page
 * Called after Supabase Auth email confirmation
 * Activates tenant record and redirects to dashboard
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'TenantOnboarding' })

type Status = 'loading' | 'activating' | 'success' | 'error'

/**
 * Tenant Onboarding Page
 * Called after Supabase Auth email confirmation
 * Activates tenant record by setting status to 'active' via PostgREST.
 * The tenants.status column is updated directly; no NestJS activation endpoint needed.
 */
export default function TenantOnboardingPage() {
	const [status, setStatus] = useState<Status>('loading')
	const [errorMessage, setErrorMessage] = useState<string>('')
	const router = useRouter()

	useEffect(() => {
		let redirectTimer: NodeJS.Timeout | null = null
		let dashboardTimer: NodeJS.Timeout | null = null

		const activateTenant = async () => {
			try {
				const supabase = createClient()

				// Verify authentication
				const user = await getCachedUser()

				if (!user) {
					logger.error('Auth error during tenant onboarding', {
						error: 'Not authenticated'
					})
					setErrorMessage(
						'Not authenticated. Please check your invitation email.'
					)
					setStatus('error')
					redirectTimer = setTimeout(() => router.push('/login'), 3000)
					return
				}

				setStatus('activating')

				// Activate tenant record via PostgREST
				// The tenants table has a status column; set to 'active' for the current user
				const { error: updateError } = await supabase
					.from('tenants')
					.update({ status: 'active' })
					.eq('user_id', user.id)

				if (updateError) {
					logger.error('Failed to activate tenant record', {
						error: updateError
					})
					throw new Error(
						updateError.message || 'Failed to activate tenant account'
					)
				}

				setStatus('success')
				// Redirect to tenant dashboard after 2 seconds
				dashboardTimer = setTimeout(() => router.push('/tenant'), 2000)
			} catch (error) {
				logger.error('Tenant activation error', {}, error)
				setErrorMessage(
					error instanceof Error
						? error.message
						: 'An unexpected error occurred'
				)
				setStatus('error')
			}
		}

		activateTenant()

		// Cleanup function to clear timers on unmount
		return () => {
			if (redirectTimer) clearTimeout(redirectTimer)
			if (dashboardTimer) clearTimeout(dashboardTimer)
		}
	}, [router])

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/50">
			<div
				className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm"
				role="status"
				aria-live="polite"
			>
				<div className="text-center">
					<h1 className="typography-h3 tracking-tight">
						Setting Up Your Account
					</h1>
					<p className="mt-2 text-muted">
						{status === 'loading' && 'Verifying your invitation...'}
						{status === 'activating' && 'Activating your account...'}
						{status === 'success' &&
							'All set! Redirecting to your dashboard...'}
						{status === 'error' && 'Something went wrong'}
					</p>
				</div>

				<div className="flex justify-center py-8">
					{(status === 'loading' || status === 'activating') && (
						<Loader2 className="h-16 w-16 animate-spin text-primary" />
					)}
					{status === 'success' && (
						<CheckCircle2 className="h-16 w-16 text-success" />
					)}
					{status === 'error' && (
						<XCircle className="h-16 w-16 text-destructive" />
					)}
				</div>

				{status === 'success' && (
					<div className="rounded-md bg-success/10 p-4">
						<p className="text-sm text-success">
							Welcome! Your account has been activated successfully.
						</p>
					</div>
				)}

				{status === 'error' && (
					<div className="space-y-4">
						<div className="rounded-md bg-destructive/10 p-4">
							<p className="text-sm text-destructive">{errorMessage}</p>
						</div>
						<div className="text-center text-muted">
							<p>Need help? Contact your property manager.</p>
						</div>
					</div>
				)}

				{(status === 'loading' || status === 'activating') && (
					<div className="space-y-2 text-center text-muted">
						<p>Please wait while we set up your account...</p>
						<p className="text-xs">This usually takes just a few seconds.</p>
					</div>
				)}
			</div>
		</div>
	)
}
