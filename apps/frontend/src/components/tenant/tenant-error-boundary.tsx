'use client'

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { trackRenderError } from '@/lib/error-analytics'
import { recoverFromError } from '@/lib/error-recovery'
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
		).catch(recoveryError => {
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
	error?: Error
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
		<div className="flex min-h-[400px] items-center justify-center p-4">
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
