/**
 * Mutation Loading Components
 * Provides consistent loading UI for all mutation states
 */

import { ButtonSpinner, Spinner, CenteredSpinner } from './spinner'
import { Button } from './button'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

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
						<span className="text-muted-foreground">{loadingMessage}</span>
					</>
				)}
				{error && (
					<>
						<AlertTriangle className="h-4 w-4 text-destructive" />
						<span className="text-destructive">
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
			<div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
				{isLoading && (
					<div className="flex flex-col items-center gap-2">
						<Spinner size={size === 'sm' ? 'md' : 'lg'} />
						<span className="text-sm text-muted-foreground">{loadingMessage}</span>
					</div>
				)}
				{error && (
					<Card className="border-destructive/50 bg-destructive/5">
						<CardContent className="p-4">
							<div className="flex items-center gap-2 mb-2">
								<AlertTriangle className="h-5 w-5 text-destructive" />
								<span className="font-medium text-destructive">Error</span>
							</div>
							<p className="text-sm mb-3">{errorMessage || error.message}</p>
							<div className="flex gap-2">
								{onRetry && (
									<Button variant="outline" size="sm" onClick={onRetry}>
										<RefreshCw className="h-3 w-3 mr-1" />
										Retry
									</Button>
								)}
								{onDismiss && (
									<Button variant="secondary" size="sm" onClick={onDismiss}>
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
		<Card className={cn(
			'border-dashed',
			isLoading && 'border-primary/50 bg-primary/5',
			error && 'border-destructive/50 bg-destructive/5'
		)}>
			<CardContent className="p-6">
				{isLoading && (
					<div className="flex flex-col items-center text-center">
						<Spinner size={size === 'sm' ? 'md' : 'lg'} className="mb-3" />
						<p className="text-sm text-muted-foreground">{loadingMessage}</p>
					</div>
				)}
				{error && (
					<div className="text-center">
						<AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
						<p className="font-medium text-destructive mb-1">Operation Failed</p>
						<p className="text-sm text-muted-foreground mb-4">
							{errorMessage || error.message}
						</p>
						<div className="flex justify-center gap-2">
							{onRetry && (
								<Button variant="outline" size="sm" onClick={onRetry}>
									<RefreshCw className="h-3 w-3 mr-1" />
									Try Again
								</Button>
							)}
							{onDismiss && (
								<Button variant="secondary" size="sm" onClick={onDismiss}>
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
				<CheckCircle className="h-4 w-4 text-green-600" />
				<span className="text-green-700">{message}</span>
			</div>
		)
	}

	return (
		<Card className="border-green-200 bg-green-50">
			<CardContent className="p-4">
				<div className="flex items-center gap-2">
					<CheckCircle className="h-5 w-5 text-green-600" />
					<span className="text-green-800 font-medium">Success</span>
				</div>
				<p className="text-sm text-green-700 mt-1">{message}</p>
				{onDismiss && !autoHide && (
					<Button
						variant="link"
						size="sm"
						onClick={onDismiss}
						className="h-auto p-0 mt-2 text-green-700"
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
	if (!isMutating) return null

	return (
		<div className={cn(
			'fixed left-0 right-0 z-50 bg-primary/10 border-primary/20',
			position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t'
		)}>
			<div className="container mx-auto px-4 py-2">
				<div className="flex items-center justify-center gap-2">
					<Spinner size="sm" />
					<span className="text-sm text-primary">
						{mutatingCount === 1 
							? 'Processing request...'
							: `Processing ${mutatingCount} requests...`
						}
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
}

export function LoadingButton({
	isLoading = false,
	loadingText = 'Loading...',
	disabled,
	children,
	...props
}: LoadingButtonProps) {
	return (
		<Button
			disabled={disabled || isLoading}
			{...props}
		>
			{isLoading ? <ButtonSpinner text={loadingText} /> : children}
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
	error,
	onSubmit,
	loadingMessage = 'Saving...',
	className
}: MutationFormProps) {
	return (
		<form onSubmit={onSubmit} className={cn('relative', className)}>
			{children}
			
			{/* Loading overlay for forms */}
			{isLoading && (
				<div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
					<div className="flex flex-col items-center gap-2">
						<Spinner size="md" />
						<span className="text-sm text-muted-foreground">{loadingMessage}</span>
					</div>
				</div>
			)}
		</form>
	)
}

export default MutationLoading