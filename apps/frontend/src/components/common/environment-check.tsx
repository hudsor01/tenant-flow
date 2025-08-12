import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface EnvVar {
	name: string
	value: string | undefined
	required: boolean
	description: string
}

export function EnvironmentCheck() {
	const [showDetails, setShowDetails] = useState(false)
	const [envVars, setEnvVars] = useState<EnvVar[]>([])
	const [hasErrors, setHasErrors] = useState(false)

	useEffect(() => {
		// Check all required environment variables
		const vars: EnvVar[] = [
			{
				name: 'NEXT_PUBLIC_SUPABASE_URL',
				value: process.env.NEXT_PUBLIC_SUPABASE_URL,
				required: true,
				description:
					'Supabase project URL for authentication and database access'
			},
			{
				name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
				value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
				required: true,
				description:
					'Supabase anonymous key for client-side authentication'
			},
			{
				name: 'NEXT_PUBLIC_API_URL',
				value: process.env.NEXT_PUBLIC_API_URL,
				required: true,
				description: 'Backend API URL for TenantFlow services'
			},
			{
				name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
				value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
				required: false,
				description: 'Stripe publishable key for payment processing'
			},
			{
				name: 'NEXT_PUBLIC_POSTHOG_KEY',
				value: process.env.NEXT_PUBLIC_POSTHOG_KEY,
				required: false,
				description: 'PostHog API key for analytics (optional)'
			},
			{
				name: 'NEXT_PUBLIC_POSTHOG_HOST',
				value: process.env.NEXT_PUBLIC_POSTHOG_HOST,
				required: false,
				description: 'PostHog host URL for analytics (optional)'
			}
		]

		setEnvVars(vars)
		setHasErrors(vars.some(v => v.required && !v.value))

		// Log environment status in development
		if (process.env.NODE_ENV === 'development') {
			console.warn('[EnvironmentCheck] Environment variables:', {
				total: vars.length,
				required: vars.filter(v => v.required).length,
				missing: vars
					.filter(v => v.required && !v.value)
					.map(v => v.name),
				optional: vars
					.filter(v => !v.required && !v.value)
					.map(v => v.name)
			})
		}
	}, [])

	// Don't show in production unless there are errors
	if (process.env.NODE_ENV === 'production' && !hasErrors) {
		return null
	}

	// In development, show a small indicator
	if (process.env.NODE_ENV === 'development' && !hasErrors && !showDetails) {
		return (
			<div className="fixed right-4 bottom-4 z-50">
				<button
					onClick={() => setShowDetails(true)}
					className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 shadow-sm hover:bg-green-100"
				>
					<CheckCircle className="h-4 w-4" />
					Environment OK
				</button>
			</div>
		)
	}

	// Show errors or details
	if (hasErrors || showDetails) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
					<div className="mb-4 flex items-start justify-between">
						<div>
							<h2 className="text-lg font-semibold text-gray-900">
								Environment Configuration
							</h2>
							<p className="mt-1 text-sm text-gray-600">
								{hasErrors
									? 'Missing required environment variables. Please check your .env.local file.'
									: 'All required environment variables are configured.'}
							</p>
						</div>
						<button
							onClick={() => setShowDetails(false)}
							className="rounded-md p-1 hover:bg-gray-100"
							aria-label="Close"
						>
							<XCircle className="h-5 w-5 text-gray-400" />
						</button>
					</div>

					<div className="space-y-3">
						{envVars.map(envVar => (
							<div
								key={envVar.name}
								className={`rounded-md border p-3 ${
									envVar.value
										? 'border-green-200 bg-green-50'
										: envVar.required
											? 'border-red-200 bg-red-50'
											: 'border-yellow-200 bg-yellow-50'
								}`}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2">
											{envVar.value ? (
												<CheckCircle className="h-4 w-4 text-green-600" />
											) : envVar.required ? (
												<XCircle className="h-4 w-4 text-red-600" />
											) : (
												<AlertCircle className="h-4 w-4 text-yellow-600" />
											)}
											<code className="font-mono text-sm">
												{envVar.name}
											</code>
											{envVar.required && (
												<span className="text-xs text-gray-500">
													(required)
												</span>
											)}
										</div>
										<p className="mt-1 text-xs text-gray-600">
											{envVar.description}
										</p>
									</div>
									<div className="ml-4 text-xs">
										{envVar.value ? (
											<span className="text-green-700">
												Set
											</span>
										) : (
											<span
												className={
													envVar.required
														? 'text-red-700'
														: 'text-yellow-700'
												}
											>
												Not set
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>

					{hasErrors && (
						<div className="mt-4 rounded-md bg-blue-50 p-4">
							<h3 className="text-sm font-medium text-blue-800">
								How to fix:
							</h3>
							<ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700">
								<li>
									Copy{' '}
									<code className="font-mono">
										.env.example
									</code>{' '}
									to{' '}
									<code className="font-mono">
										.env.local
									</code>
								</li>
								<li>
									Fill in the missing environment variables
								</li>
								<li>Restart the development server</li>
							</ol>
							<p className="mt-2 text-xs text-blue-600">
								See the README.md for detailed setup
								instructions.
							</p>
						</div>
					)}

					<div className="mt-6 flex justify-end">
						<button
							onClick={() => setShowDetails(false)}
							className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
						>
							{hasErrors ? 'Continue Anyway' : 'Close'}
						</button>
					</div>
				</div>
			</div>
		)
	}

	return null
}
