'use client'

import { LoaderOne } from '@/components/ui/loader'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
	text?: string
	className?: string
	size?: 'sm' | 'default' | 'lg'
}

/**
 * Apple-style typing indicator loading state
 * Perfect for forms, buttons, and page loading states
 */
export function LoadingState({
	text,
	className,
	size = 'default'
}: LoadingStateProps) {
	const sizeClasses = {
		sm: 'gap-2 text-xs',
		default: 'gap-3 text-sm',
		lg: 'gap-4 text-base'
	}

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center',
				sizeClasses[size],
				className
			)}
		>
			<LoaderOne />
			{text && (
				<p className="text-muted-foreground font-medium animate-pulse">
					{text}
				</p>
			)}
		</div>
	)
}

/**
 * Inline loading state for buttons and small UI elements
 */
export function InlineLoadingState({ className }: { className?: string }) {
	return (
		<div className={cn('inline-flex items-center', className)}>
			<LoaderOne />
		</div>
	)
}

/**
 * Page-level loading state with centered layout
 */
export function PageLoadingState({ text }: { text?: string }) {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<LoadingState text={text} size="lg" />
		</div>
	)
}