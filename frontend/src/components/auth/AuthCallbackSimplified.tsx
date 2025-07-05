import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'

export default function AuthCallbackSimplified() {
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)
	const [status, setStatus] = useState('Processing...')

	useEffect(() => {
		const handleCallback = async () => {
			try {
				// Log the current URL for debugging
				logger.info('Auth callback started', {
					href: window.location.href,
					search: window.location.search
				})

				// Extract the code from URL
				const urlParams = new URLSearchParams(window.location.search)
				const code = urlParams.get('code')
				const errorParam = urlParams.get('error')
				const errorDescription = urlParams.get('error_description')

				// Handle OAuth errors
				if (errorParam) {
					throw new Error(errorDescription || errorParam || 'Authentication failed')
				}

				// No code means something went wrong
				if (!code) {
					// Check if already authenticated
					const { data: { session } } = await supabase.auth.getSession()
					if (session?.user) {
						logger.info('Already authenticated, redirecting')
						navigate('/dashboard')
						return
					}
					throw new Error('No authentication code received')
				}

				// Exchange code for session - this is the critical step
				setStatus('Completing authentication...')
				const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
				
				if (exchangeError) {
					throw exchangeError
				}

				if (!data.session) {
					throw new Error('No session created')
				}

				// Session created successfully
				logger.info('Authentication successful', { userId: data.session.user.id })
				
				// Create user profile if needed (but don't block navigation)
				setStatus('Setting up your account...')
				const profilePromise = supabase
					.from('User')
					.upsert({
						id: data.session.user.id,
						email: data.session.user.email!,
						name: data.session.user.user_metadata?.full_name || 
						      data.session.user.user_metadata?.name || 
						      data.session.user.email!.split('@')[0],
						role: 'OWNER',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}, {
						onConflict: 'id'
					})
				
				// Don't await - let it run in background
				profilePromise.catch(err => {
					logger.warn('Profile creation failed but continuing', { error: err })
				})

				// Navigate immediately
				const next = urlParams.get('next') || '/dashboard'
				navigate(next)

			} catch (err) {
				logger.error('Auth callback error', err as Error)
				setError(err instanceof Error ? err.message : 'Authentication failed')
				setStatus('')
			}
		}

		// Start the callback handling
		handleCallback()
	}, [navigate])

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
							Authentication Error
						</h2>
						<p className="mt-2 text-sm text-red-600">{error}</p>
						<div className="mt-4">
							<button
								onClick={() => navigate('/auth/login')}
								className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
							>
								Back to Login
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="text-center">
				<div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p className="mt-4 text-sm text-gray-600">{status}</p>
			</div>
		</div>
	)
}