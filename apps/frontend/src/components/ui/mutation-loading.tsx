/**
 * Mutation Loading Components with Mixed Icon Sets
 * Demonstrates using multiple icon libraries with UnoCSS
 */

import { ButtonSpinner, Spinner } from './spinner'
import { Button } from './button'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

interface MutationLoadingProps {
	isLoading: boolean
	error?: Error | null
	loadingMessage?: string
	errorMessage?: string
	onRetry?: () => void
	onDismiss?: () => void
	variant?: 'default' | 'inline' | 'overlay' | 'button'
	size?: 'sm' | 'md' | 'lg'
}

export function MutationLoading({
	isLoading,
	error,
	loadingMessage = 'Processing...',
	errorMessage,
	onRetry,
	onDismiss,
	variant = 'default',
	size = 'md'
}: MutationLoadingProps) {
	if (!isLoading && !error) {
		return null
	}

	if (variant === 'button') {
		return <ButtonSpinner text={loadingMessage} />
	}

	if (variant === 'inline') {
		return (
			<div className="flex items-center gap-2 text-sm">
				{isLoading && (
					<>
						<Spinner size="sm" />
						<span className="text-gray-500">
							{loadingMessage}
						</span>
					</>
				)}
				{error && (
					<>
						{/* Using Heroicons for warning */}
						<i className="i-heroicons-exclamation-triangle text-red-500 h-4 w-4" />
						<span className="text-red-500">
							{errorMessage || error.message}
						</span>
						{onRetry && (
							<Button
								variant="link"
								size="sm"
								onClick={onRetry}
								className="h-auto p-0 text-sm"
							>
								Try again
							</Button>
						)}
					</>
				)}
			</div>
		)
	}

	if (variant === 'overlay') {
		return (
			<div className="bg-white/50 dark:bg-gray-900/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
				{isLoading && (
					<div className="flex flex-col items-center gap-2">
						<Spinner size={size === 'sm' ? 'md' : 'lg'} />
						<span className="text-gray-500 text-sm">
							{loadingMessage}
						</span>
					</div>
				)}
				{error && (
					<Card className="border-red-200 bg-red-50">
						<CardContent className="p-4">
							<div className="mb-2 flex items-center gap-2">
								{/* Using Phosphor icons for error */}
								<i className="i-ph-warning-circle-bold text-red-500 h-5 w-5" />
								<span className="text-red-600 font-medium">
									Error
								</span>
							</div>
							<p className="mb-3 text-sm">
								{errorMessage || error.message}
							</p>
							<div className="flex gap-2">
								{onRetry && (
									<Button
										variant="outline"
										size="sm"
										onClick={onRetry}
									>
										{/* Using Tabler icons for refresh */}
										<i className="i-tabler-refresh mr-1 h-3 w-3" />
										Retry
									</Button>
								)}
								{onDismiss && (
									<Button
										variant="secondary"
										size="sm"
										onClick={onDismiss}
									>
										Dismiss
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		)
	}

	// Default variant - card-based
	return (
		<Card
			className={cn(
				'border-dashed',
				isLoading && 'border-brand-500/50 bg-brand-50',
				error && 'border-red-500/50 bg-red-50'
			)}
		>
			<CardContent className="p-6">
				{isLoading && (
					<div className="flex flex-col items-center text-center">
						<Spinner
							size={size === 'sm' ? 'md' : 'lg'}
							className="mb-3"
						/>
						<p className="text-gray-500 text-sm">
							{loadingMessage}
						</p>
					</div>
				)}
				{error && (
					<div className="text-center">
						{/* Using Material Design Icons for error state */}
						<i className="i-mdi-alert-octagon text-red-500 mx-auto mb-3 h-8 w-8 block" />
						<p className="text-red-600 mb-1 font-medium">
							Operation Failed
						</p>
						<p className="text-gray-500 mb-4 text-sm">
							{errorMessage || error.message}
						</p>
						<div className="flex justify-center gap-2">
							{onRetry && (
								<Button
									variant="outline"
									size="sm"
									onClick={onRetry}
								>
									{/* Using Carbon icons for retry */}
									<i className="i-carbon-reset mr-1 h-3 w-3" />
									Try Again
								</Button>
							)}
							{onDismiss && (
								<Button
									variant="secondary"
									size="sm"
									onClick={onDismiss}
								>
									Dismiss
								</Button>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

/**
 * Success state component for completed mutations
 */
interface MutationSuccessProps {
	message: string
	onDismiss?: () => void
	variant?: 'default' | 'inline'
	autoHide?: boolean
}

export function MutationSuccess({
	message,
	onDismiss,
	variant = 'default',
	autoHide = false
}: MutationSuccessProps) {
	if (variant === 'inline') {
		return (
			<div className="flex items-center gap-2 text-sm">
				{/* Using Lucide for success */}
				<i className="i-lucide-check-circle h-4 w-4 text-green-600" />
				<span className="text-green-700">{message}</span>
			</div>
		)
	}

	return (
		<Card className="border-green-200 bg-green-50">
			<CardContent className="p-4">
				<div className="flex items-center gap-2">
					{/* Using Heroicons for checkmark */}
					<i className="i-heroicons-check-badge-solid h-5 w-5 text-green-600" />
					<span className="font-medium text-green-800">Success</span>
				</div>
				<p className="mt-1 text-sm text-green-700">{message}</p>
				{onDismiss && !autoHide && (
					<Button
						variant="link"
						size="sm"
						onClick={onDismiss}
						className="mt-2 h-auto p-0 text-green-700"
					>
						Dismiss
					</Button>
				)}
			</CardContent>
		</Card>
	)
}

/**
 * Global loading indicator for active mutations
 */
interface GlobalMutationLoadingProps {
	isMutating: boolean
	mutatingCount: number
	position?: 'top' | 'bottom'
}

export function GlobalMutationLoading({
	isMutating,
	mutatingCount,
	position = 'top'
}: GlobalMutationLoadingProps) {
	if (!isMutating) {
		return null
	}

	return (
		<div
			className={cn(
				'bg-brand-50 border-brand-200 fixed left-0 right-0 z-50',
				position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t'
			)}
		>
			<div className="container mx-auto px-4 py-2">
				<div className="flex items-center justify-center gap-2">
					<Spinner size="sm" />
					<span className="text-brand-600 text-sm">
						{mutatingCount === 1
							? 'Processing request...'
							: `Processing ${mutatingCount} requests...`}
					</span>
				</div>
			</div>
		</div>
	)
}

/**
 * Button with built-in loading state
 */
interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
	isLoading?: boolean
	loadingText?: string
	loadingIcon?: string // Allow custom loading icon
}

export function LoadingButton({
	isLoading = false,
	loadingText = 'Loading...',
	loadingIcon = 'i-lucide-loader-2', // Default to Lucide
	disabled,
	children,
	...props
}: LoadingButtonProps) {
	return (
		<Button disabled={disabled || isLoading} {...props}>
			{isLoading ? (
				<>
					<i className={`${loadingIcon} animate-spin h-4 w-4`} />
					<span>{loadingText}</span>
				</>
			) : (
				children
			)}
		</Button>
	)
}

/**
 * Form with mutation loading states
 */
interface MutationFormProps {
	children: React.ReactNode
	isLoading: boolean
	error?: Error | null
	onSubmit: (e: React.FormEvent) => void
	loadingMessage?: string
	className?: string
}

export function MutationForm({
	children,
	isLoading,
	error: _error,
	onSubmit,
	loadingMessage = 'Saving...',
	className
}: MutationFormProps) {
	return (
		<form onSubmit={onSubmit} className={cn('relative', className)}>
			{children}

			{/* Loading overlay for forms with container query */}
			{isLoading && (
				<div className="bg-white/50 dark:bg-gray-900/50 absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-sm @container-sm:p-8">
					<div className="flex flex-col items-center gap-2">
						{/* Using Radix Icons for form loading */}
						<i className="i-radix-icons-update animate-spin h-8 w-8 text-brand-500" />
						<span className="text-gray-500 text-sm @container-sm:text-base">
							{loadingMessage}
						</span>
					</div>
				</div>
			)}
		</form>
	)
}

export default MutationLoading