/**
 * Loader Components for TanStack Router
 *
 * Provides reusable loading states, skeleton screens, and error boundaries
 * specifically designed for route loaders and data fetching.
 */

import React from 'react'
// import type { LoaderError } from '@/lib/router-context'
// import { noOpHandler } from '@/utils/async-handlers'

// Type definition for LoaderError
export type LoaderError = Error & {
	statusCode?: number
	info?: unknown
	type?: string
	retryable?: boolean
	metadata?: Record<string, unknown>
}

// Error adapter component to bridge LoaderError and Error types
const ErrorAdapter: React.FC<{
	error: Error
	resetErrorBoundary: () => void
}> = ({ error, resetErrorBoundary }) => {
	// Check if it's a LoaderError
	if ('type' in error && 'retryable' in error) {
		return (
			<LoaderErrorFallback
				error={error as LoaderError}
				resetErrorBoundary={resetErrorBoundary}
			/>
		)
	}

	// Convert regular Error to LoaderError format
	const loaderError: LoaderError = {
		name: error.name || 'Error',
		type: 'unknown',
		message: error.message,
		retryable: true
	}

	return (
		<LoaderErrorFallback
			error={loaderError}
			resetErrorBoundary={resetErrorBoundary}
		/>
	)
}

// ===== LOADING STATES =====

/**
 * Page-level loader with skeleton
 */
export const PageLoader: React.FC<{
	message?: string
	showProgress?: boolean
}> = ({ message = 'Loading...', showProgress = false }) => (
	<div className="flex min-h-screen items-center justify-center bg-gray-50">
		<div className="text-center">
			<div className="relative">
				<div className="border-t-primary mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200" />
				{showProgress && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-primary text-xs font-medium">
							<div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
						</div>
					</div>
				)}
			</div>
			<p className="font-medium text-gray-600">{message}</p>
			<p className="mt-1 text-sm text-gray-400">
				This should only take a moment
			</p>
		</div>
	</div>
)

/**
 * Section loader for partial page updates
 */
export const SectionLoader: React.FC<{
	height?: string
	message?: string
}> = ({ height = 'h-64', message = 'Loading...' }) => (
	<div
		className={`flex items-center justify-center ${height} rounded-lg bg-gray-50`}
	>
		<div className="text-center">
			<div className="border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-gray-300" />
			<p className="text-sm text-gray-500">{message}</p>
		</div>
	</div>
)

/**
 * Inline loader for small sections
 */
export const InlineLoader: React.FC<{
	size?: 'sm' | 'md' | 'lg'
	message?: string
}> = ({ size = 'md', message }) => {
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	}

	return (
		<div className="flex items-center justify-center py-2">
			<div
				className={`${sizeClasses[size]} border-t-primary animate-spin rounded-full border-2 border-gray-300`}
			/>
			{message && (
				<span className="ml-2 text-sm text-gray-500">{message}</span>
			)}
		</div>
	)
}

// ===== SKELETON SCREENS =====

/**
 * Property list skeleton
 */
export const PropertyListSkeleton: React.FC = () => (
	<div className="space-y-4">
		{Array.from({ length: 5 }).map((_, i) => (
			<div
				key={i}
				className="animate-pulse rounded-lg border bg-white p-6 shadow-sm"
			>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="mb-2 h-6 w-1/3 rounded bg-gray-200" />
						<div className="mb-4 h-4 w-2/3 rounded bg-gray-200" />
						<div className="flex space-x-4">
							<div className="h-4 w-16 rounded bg-gray-200" />
							<div className="h-4 w-20 rounded bg-gray-200" />
							<div className="h-4 w-14 rounded bg-gray-200" />
						</div>
					</div>
					<div className="h-16 w-16 rounded-lg bg-gray-200" />
				</div>
			</div>
		))}
	</div>
)

/**
 * Tenant list skeleton
 */
export const TenantListSkeleton: React.FC = () => (
	<div className="space-y-4">
		{Array.from({ length: 4 }).map((_, i) => (
			<div
				key={i}
				className="animate-pulse rounded-lg border bg-white p-4 shadow-sm"
			>
				<div className="flex items-center space-x-4">
					<div className="h-12 w-12 rounded-full bg-gray-200" />
					<div className="flex-1">
						<div className="mb-2 h-5 w-1/4 rounded bg-gray-200" />
						<div className="mb-1 h-4 w-1/3 rounded bg-gray-200" />
						<div className="h-3 w-1/5 rounded bg-gray-200" />
					</div>
					<div className="text-right">
						<div className="mb-1 h-4 w-16 rounded bg-gray-200" />
						<div className="h-3 w-12 rounded bg-gray-200" />
					</div>
				</div>
			</div>
		))}
	</div>
)

/**
 * Dashboard skeleton
 */
export const DashboardSkeleton: React.FC = () => (
	<div className="space-y-6">
		{/* Stats Cards */}
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="animate-pulse rounded-lg border bg-white p-6 shadow-sm"
				>
					<div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />
					<div className="mb-2 h-8 w-1/3 rounded bg-gray-200" />
					<div className="h-3 w-1/4 rounded bg-gray-200" />
				</div>
			))}
		</div>

		{/* Chart Section */}
		<div className="animate-pulse rounded-lg border bg-white p-6 shadow-sm">
			<div className="mb-6 h-6 w-1/4 rounded bg-gray-200" />
			<div className="h-64 rounded bg-gray-200" />
		</div>

		{/* Recent Activity */}
		<div className="animate-pulse rounded-lg border bg-white p-6 shadow-sm">
			<div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="flex items-center space-x-3">
						<div className="h-8 w-8 rounded-full bg-gray-200" />
						<div className="flex-1">
							<div className="mb-1 h-4 w-2/3 rounded bg-gray-200" />
							<div className="h-3 w-1/3 rounded bg-gray-200" />
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
)

// ===== ERROR STATES =====

/**
 * Loader error fallback component
 */
export const LoaderErrorFallback: React.FC<{
	error: LoaderError
	resetErrorBoundary: () => void
}> = ({ error, resetErrorBoundary }) => (
	<div className="flex min-h-[400px] items-center justify-center p-8">
		<div className="max-w-md text-center">
			<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
				<svg
					className="h-8 w-8 text-red-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>

			<h3 className="mb-2 text-lg font-semibold text-gray-900">
				Loading Failed
			</h3>

			<p className="mb-4 text-gray-600">
				{error.message ||
					'Please try again or contact support if the problem persists.'}
			</p>

			{error.retryable && (
				<button
					onClick={resetErrorBoundary}
					className="bg-primary focus:ring-primary rounded-md px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:outline-none"
				>
					Try Again
				</button>
			)}

			{process.env.DEV && error.metadata && (
				<details className="mt-4 text-left">
					<summary className="cursor-pointer text-sm text-gray-500">
						Technical Details
					</summary>
					<pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-600">
						{JSON.stringify(error.metadata, null, 2)}
					</pre>
				</details>
			)}
		</div>
	</div>
)

/**
 * Network error component
 */
export const NetworkErrorFallback: React.FC<{
	retry: () => void
}> = ({ retry }) => {
	const isOffline = !navigator.onLine

	return (
		<div className="flex min-h-[300px] items-center justify-center p-8">
			<div className="text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
					<svg
						className="h-8 w-8 text-yellow-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>

				<h3 className="mb-2 text-lg font-semibold text-gray-900">
					{isOffline ? "You're Offline" : 'Connection Problem'}
				</h3>

				<p className="mb-4 text-gray-600">
					{isOffline
						? 'Check your internet connection and try again.'
						: 'Unable to connect to our servers. Please try again.'}
				</p>

				<button
					onClick={retry}
					className="bg-primary focus:ring-primary rounded-md px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:outline-none"
				>
					Try Again
				</button>
			</div>
		</div>
	)
}

// ===== PROGRESSIVE LOADING WRAPPER =====

/**
 * Progressive loading wrapper that shows skeleton first, then content
 */
export const ProgressiveLoader: React.FC<{
	isLoading: boolean
	skeleton: React.ReactNode
	children: React.ReactNode
	error?: LoaderError | null
	onRetry?: () => void
}> = ({ isLoading, skeleton, children, error, onRetry }) => {
	if (error) {
		return (
			<LoaderErrorFallback
				error={error}
				resetErrorBoundary={
					onRetry ||
					(() => {
						/* empty fallback */
					})
				}
			/>
		)
	}

	if (isLoading) {
		return <>{skeleton}</>
	}

	return <>{children}</>
}

// ===== ROUTE LOADER WRAPPER =====

/**
 * Wrapper component for route loaders with error boundaries
 */
export const RouteLoaderWrapper: React.FC<{
	children: React.ReactNode
	fallback?: React.ReactNode
	errorFallback?: React.ComponentType<{
		error: Error
		resetErrorBoundary: () => void
	}>
}> = ({
	children,
	fallback = <PageLoader />,
	errorFallback: _errorFallback = ErrorAdapter
}) => (
	<div>
		<React.Suspense fallback={fallback}>{children}</React.Suspense>
	</div>
)
