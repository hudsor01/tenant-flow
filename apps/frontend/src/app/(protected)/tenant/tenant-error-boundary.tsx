'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Component } from 'react'

const logger = createLogger({ component: 'TenantErrorBoundary' })

interface TenantErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onReset?: () => void
}

interface TenantErrorBoundaryState {
	hasError: boolean
	error?: Error
}

export class TenantErrorBoundary extends Component<
	TenantErrorBoundaryProps,
	TenantErrorBoundaryState
> {
	constructor(props: TenantErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): TenantErrorBoundaryState {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Enhanced logging with analytics tracking
		logger.error('TenantErrorBoundary - Tenant operation failed', {
			action: 'tenant_error_boundary',
			metadata: {
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack
			}
		})

		// Track render error with comprehensive analytics
		trackRenderError(
			error,
			{ componentStack: errorInfo.componentStack ?? undefined },
			{
				component: 'TenantErrorBoundary',
				entityType: 'tenant',
				operation: 'render'
			}
		)

		// Attempt automatic recovery for network/auth errors
		recoverFromError(
			error,
			{
				entityType: 'tenant',
				operation: 'render tenant component'
			},
			{
				showToast: false // Don't show toast here, error boundary UI handles it
			}
		).catch((recoveryError: unknown) => {
			logger.error('Error recovery failed in boundary', {
				action: 'error_recovery_failed',
				metadata: {
					recoveryError:
						recoveryError instanceof Error
							? recoveryError.message
							: String(recoveryError)
				}
			})
		})
	}

	handleReset = () => {
		this.setState({ hasError: false })
		this.props.onReset?.()
	}

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<TenantErrorFallback
					error={this.state.error}
					onReset={this.handleReset}
				/>
			)
		}

		return this.props.children
	}
}

interface TenantErrorFallbackProps {
	// explicit union with undefined to satisfy exactOptionalPropertyTypes checks
	error: Error | undefined
	onReset: () => void
}

export function TenantErrorFallback({
	error,
	onReset
}: TenantErrorFallbackProps) {
	const router = useRouter()

	const errorMessage = error?.message?.toLowerCase() || ''
	const isNotFound =
		errorMessage.includes('404') || errorMessage.includes('not found')
	const isUnauthorized =
		errorMessage.includes('401') || errorMessage.includes('unauthorized')
	const isNetwork =
		errorMessage.includes('network') || errorMessage.includes('fetch')

	let title = 'Something went wrong'
	let description = 'We encountered an error while loading tenant information.'

	if (isNotFound) {
		title = 'Tenant not found'
		description =
			'The tenant you are looking for does not exist or has been removed.'
	} else if (isUnauthorized) {
		title = 'Access denied'
		description = 'You do not have permission to view this tenant information.'
	} else if (isNetwork) {
		title = 'Connection error'
		description =
			'Unable to connect to the server. Please check your internet connection.'
	}

	return (
		<div className="flex min-h-100 items-center justify-center p-4">
			<CardLayout title={title} description={description}>
				<div className="flex flex-col items-center gap-6">
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="size-8 text-destructive" />
					</div>

					{process.env.NODE_ENV === 'development' && error && (
						<details className="w-full rounded bg-muted p-4 text-xs">
							<summary className="cursor-pointer font-medium">
								Technical details
							</summary>
							<pre className="mt-2 whitespace-pre-wrap text-xs">
								{error.message}
								{'\n\n'}
								{error.stack}
							</pre>
						</details>
					)}

					<div className="flex w-full flex-col gap-2 sm:flex-row">
						<Button
							onClick={onReset}
							className="flex-1"
							aria-label="Try loading tenant again"
						>
							<RefreshCw className="mr-2 size-4" />
							Try Again
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push('/manage/tenants')}
							className="flex-1"
							aria-label="Return to tenants list"
						>
							<Home className="mr-2 size-4" />
							Back to Tenants
						</Button>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
function trackRenderError(
	error: Error,
	arg1: { componentStack: string | undefined },
	arg2: { component: string; entityType: string; operation: string }
) {
	// Log the render error with contextual metadata for diagnostics/analytics.
	logger.error('Render error tracked', {
		action: 'track_render_error',
		metadata: {
			error: error.message,
			stack: error.stack,
			componentStack: arg1.componentStack,
			component: arg2.component,
			entityType: arg2.entityType,
			operation: arg2.operation
		}
	})

	// If you have a remote analytics/telemetry API, call it here.
	// For now this is a best-effort synchronous log.
}

// Add a small helper that attempts basic automatic recovery actions.
// The function is intentionally conservative: it tries to reload on auth failures
// and waits for the network to come back online for network errors, then reloads.
// It returns a Promise so callers can await or catch failures.
async function recoverFromError(
	error: unknown,
	context: { entityType: string; operation: string },
	options?: { showToast?: boolean }
): Promise<void> {
	try {
		const message =
			error instanceof Error
				? error.message.toLowerCase()
				: String(error).toLowerCase()

		logger.info('Attempting automatic recovery', {
			action: 'recover_from_error',
			metadata: {
				message,
				entityType: context.entityType,
				operation: context.operation,
				showToast: Boolean(options?.showToast)
			}
		})

		// If it's an auth-related error, reload to trigger auth flow (e.g., redirect to login)
		if (message.includes('401') || message.includes('unauthorized')) {
			if (typeof window !== 'undefined') {
				window.location.reload()
			}
			return
		}

		// If it's a network/fetch error, wait for the browser to come back online then reload
		if (
			message.includes('network') ||
			message.includes('fetch') ||
			(typeof navigator !== 'undefined' && !navigator.onLine)
		) {
			if (typeof window !== 'undefined') {
				// If currently offline, wait for 'online' event
				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					await new Promise<void>(resolve => {
						window.addEventListener(
							'online',
							() => {
								resolve()
							},
							{ once: true }
						)
					})
				}
				// After coming back online, reload to re-run the fetches
				window.location.reload()
			}
			return
		}

		// No automatic recovery strategy available
		logger.info('No automatic recovery performed for this error', {
			action: 'recover_from_error_none',
			metadata: {
				message,
				entityType: context.entityType,
				operation: context.operation
			}
		})
	} catch (recoveryError) {
		logger.error('Error occurred during recoverFromError', {
			action: 'recover_from_error_failed',
			metadata: {
				recoveryError:
					recoveryError instanceof Error
						? recoveryError.message
						: String(recoveryError)
			}
		})
		// Re-throw so callers can handle it if needed
		throw recoveryError
	}
}
