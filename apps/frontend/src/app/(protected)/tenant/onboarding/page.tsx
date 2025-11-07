'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { API_BASE_URL } from '@repo/shared/config/api'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

const logger = createLogger({ component: 'TenantOnboarding' })

type Status = 'loading' | 'activating' | 'success' | 'error'

/**
 * Tenant Onboarding Page (Phase 3.1)
 * Called after Supabase Auth email confirmation
 * Activates tenant record and redirects to dashboard
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
				// 1. Create Supabase browser client with validated config
				const supabase = createBrowserClient(
					SUPABASE_URL,
					SUPABASE_PUBLISHABLE_KEY
				)

				// 3. Get current auth user (validates JWT securely)
				const {
					data: { user },
					error: authError
				} = await supabase.auth.getUser()

				if (authError || !user) {
					logger.error('Auth error during tenant onboarding', {
						error: authError
					})
					setErrorMessage(
						'Not authenticated. Please check your invitation email.'
					)
					setStatus('error')
					redirectTimer = setTimeout(() => router.push('/login'), 3000)
					return
				}

				// 4. Get session to extract access token for backend API call
				const {
					data: { session },
					error: sessionError
				} = await supabase.auth.getSession()

				if (sessionError || !session?.access_token) {
					logger.error('Session error during tenant onboarding', {
						error: sessionError
					})
					setErrorMessage(
						'Authentication session expired. Please sign in again.'
					)
					setStatus('error')
					redirectTimer = setTimeout(() => router.push('/login'), 3000)
					return
				}

				setStatus('activating')

				// 5. Call backend activation endpoint with authentication
				const response = await fetch(
					`${API_BASE_URL}/api/v1/tenants/activate`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${session.access_token}`
						},
						body: JSON.stringify({ authUserId: user.id })
					}
				)

				if (!response.ok) {
					let errorMessage = `HTTP ${response.status}: ${response.statusText}`
					let jsonError: unknown
					let textError: unknown

					// FIX: Clone BEFORE consuming the response body
					const responseClone = response.clone()

					try {
						const errorData = await response.json()
						errorMessage = errorData.message || errorMessage
					} catch (error) {
						jsonError = error
						try {
							// Use the cloned response for text fallback
							const textContent = await responseClone.text()
							errorMessage = textContent.substring(0, 200) || errorMessage
						} catch (error) {
							textError = error
						}
					}

					if (jsonError || textError) {
						logger.warn('Failed to parse error response', {
							jsonError,
							textError
						})
					}

					throw new Error(errorMessage)
				}

				// Since response.ok is already true, treat as success
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
					<h1 className="text-2xl font-semibold tracking-tight">
						Setting Up Your Account
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{status === 'loading' && 'Verifying your invitation...'}
						{status === 'activating' && 'Activating your account...'}
						{status === 'success' &&
							'All set! Redirecting to your dashboard...'}
						{status === 'error' && 'Something went wrong'}
					</p>
				</div>

				<div className="flex justify-center py-8">
					{status === 'loading' && (
						<Loader2 className="h-16 w-16 animate-spin text-primary" />
					)}
					{status === 'activating' && (
						<Loader2 className="h-16 w-16 animate-spin text-primary" />
					)}
					{status === 'success' && (
						<CheckCircle2 className="h-16 w-16 text-green-500" />
					)}
					{status === 'error' && (
						<XCircle className="h-16 w-16 text-destructive" />
					)}
				</div>

				{status === 'success' && (
					<div className="rounded-md bg-green-50 p-4">
						<p className="text-sm text-green-800">
							Welcome! Your account has been activated successfully.
						</p>
					</div>
				)}

				{status === 'error' && (
					<div className="space-y-4">
						<div className="rounded-md bg-destructive/10 p-4">
							<p className="text-sm text-destructive">{errorMessage}</p>
						</div>
						<div className="text-center text-sm text-muted-foreground">
							<p>Need help? Contact your property manager.</p>
						</div>
					</div>
				)}

				{(status === 'loading' || status === 'activating') && (
					<div className="space-y-2 text-center text-sm text-muted-foreground">
						<p>Please wait while we set up your account...</p>
						<p className="text-xs">This usually takes just a few seconds.</p>
					</div>
				)}
			</div>
		</div>
	)
}
