'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/design-system'

interface LoadingSpinnerProps {
	size?: 'sm' | 'default' | 'lg' | 'xl'
	variant?: 'default' | 'primary' | 'muted'
	className?: string
}

// Design System Compliance: Using standard Tailwind size classes
const sizeClasses = {
	sm: 'size-4', // 16px - Touch accessible
	default: 'size-6', // 24px - Standard
	lg: 'size-8', // 32px - Prominent
	xl: 'size-12' // 48px - Page level
}

// OKLCH Color System Compliance: Using design system color tokens
const variantClasses = {
	default: 'text-[var(--color-label-secondary)]',
	primary: 'text-[var(--color-accent-main)]',
	muted: 'text-[var(--color-label-tertiary)]'
}

// Typography System: Using Roboto Flex scale from globals.css
const textSizeClasses = {
	sm: 'text-[var(--font-footnote)]', // 10px
	default: 'text-[var(--font-body)]', // 13px
	lg: 'text-[var(--font-title-3)]', // 15px
	xl: 'text-[var(--font-title-2)]' // 17px
}

function LoadingSpinner({
	size = 'default',
	variant = 'default',
	className,
	text,
	...props
}: LoadingSpinnerProps &
	React.HTMLAttributes<HTMLDivElement> & { text?: string }) {
	const IconComponent = Spinner

	const content = (
		<div
			data-tokens="applied"
			className={cn(
				'flex items-center justify-center',
				text ? 'flex-col gap-3' : '', // gap-3 = 0.75rem = var(--spacing-3)
				className
			)}
			{...props}
		>
			<IconComponent
				data-tokens="applied"
				className={cn(
					sizeClasses[size],
					variantClasses[variant],
					// Design System Animation: Using actual globals.css variables
					'animate-spin [animation-duration:var(--duration-1000)] [animation-timing-function:var(--ease-linear)]'
				)}
			/>
			{text && (
				<p
					data-tokens="applied"
					className={cn(
						textSizeClasses[size],
						variantClasses[variant],
						// Design System Typography: Roboto Flex medium weight
						'font-medium tracking-[var(--tracking-body)] leading-[var(--line-height-body)]',
						// Design System Animation: Using actual globals.css variables
						'animate-pulse [animation-duration:var(--duration-500)] [animation-timing-function:var(--ease-in-out)]'
					)}
				>
					{text}
				</p>
			)}
		</div>
	)

	return content
}

// Page-level loading component
function PageLoader({
	text = 'Loading...',
	className,
	...props
}: { text?: string } & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-tokens="applied"
			className={cn(
				'flex items-center justify-center min-h-screen bg-background',
				className
			)}
			{...props}
		>
			<div className="text-center space-y-4">
				<LoadingSpinner size="xl" variant="primary" />
				<div className="space-y-2">
					<p className="text-lg font-semibold text-foreground">{text}</p>
					<p className="text-sm text-[var(--color-label-tertiary)]">
						This should only take a moment
					</p>
				</div>
			</div>
		</div>
	)
}

// Button loading state
function ButtonLoader({
	size = 'sm',
	text,
	className,
	disabled,
	variant,
	...props
}: LoadingSpinnerProps &
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		disabled?: boolean
		text?: string
	}) {
	return (
		<Button
			disabled={disabled}
			variant="ghost"
			data-tokens="applied"
			className={cn('gap-2 pointer-events-none', className)} // gap-2 = 0.5rem = var(--spacing-2)
			{...props}
		>
			<LoadingSpinner
				size={size}
				{...(variant ? { variant } : {})}
				className="text-current"
			/>
			{text && <span>{text}</span>}
		</Button>
	)
}

// Card/Section loading overlay with glass morphism
function SectionLoader({
	text,
	className,
	children,
	...props
}: {
	text?: string
	children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div data-tokens="applied" className={cn('relative', className)} {...props}>
			{/* Glass Backdrop */}
			<div className="absolute inset-0 glass z-10 flex items-center justify-center rounded-[var(--radius-large)]">
				<div className="shadow-md bg-card/50 border border-border backdrop-blur-sm p-6">
					{' '}
					{/* p-6 = 1.5rem = var(--spacing-6) */}
					<LoadingSpinner
						size="lg"
						variant="primary"
						{...(text ? { text } : {})}
					/>
				</div>
			</div>

			{/* Content (blurred with motion) */}
			<div className="opacity-50 pointer-events-none transition-all [transition-duration:var(--duration-medium)] [transition-timing-function:var(--ease-out-expo)]">
				{children}
			</div>
		</div>
	)
}

// Inline loading for tables/lists
function InlineLoader({
	size = 'sm',
	className,
	...props
}: LoadingSpinnerProps & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-tokens="applied"
			className={cn(
				'inline-flex items-center gap-2', // gap-2 = 0.5rem = var(--spacing-2)
				className
			)}
			{...props}
		>
			<LoadingSpinner size={size} variant="muted" />
			<span className="text-sm text-[var(--color-label-tertiary)]">
				Loading...
			</span>
		</div>
	)
}

// Loading Dots - Satisfying bounce animation with professional timing
function LoadingDots({
	className,
	variant = 'default',
	size = 'default',
	asButton = false,
	...props
}: {
	variant?: 'default' | 'primary' | 'muted'
	size?: 'sm' | 'default' | 'lg'
	asButton?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
	const dotSize = {
		sm: 'size-1',
		default: 'size-2',
		lg: 'size-3'
	}[size]

	const dotSpacing = {
		sm: 'gap-1', // gap-1 = 0.25rem = var(--spacing-1)
		default: 'gap-1.5', // gap-1.5 = 0.375rem = var(--spacing-1_5)
		lg: 'gap-2' // gap-2 = 0.5rem = var(--spacing-2)
	}[size]

	const dots = (
		<div
			data-tokens="applied"
			className={cn('flex items-center', dotSpacing)}
			{...props}
		>
			<div
				data-tokens="applied"
				className={cn(
					dotSize,
					'rounded-full animate-bounce bg-current',
				variantClasses[variant],
				// Design System Animation: Using actual globals.css variables
				'[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:0ms]'
			)}
			/>
			<div
				data-tokens="applied"
				className={cn(
					dotSize,
					'rounded-full animate-bounce bg-current',
				variantClasses[variant],
				'[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:200ms]'
			)}
			/>
			<div
				data-tokens="applied"
				className={cn(
					dotSize,
					'rounded-full animate-bounce bg-current',
				variantClasses[variant],
				'[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:400ms]'
			)}
			/>
		</div>
	)

	if (asButton) {
		return (
			<Button
				variant="ghost"
				disabled
				data-tokens="applied"
				className={cn('pointer-events-none', className)}
			>
				{dots}
			</Button>
		)
	}

	return <div className={className}>{dots}</div>
}

export {
	ButtonLoader,
	InlineLoader,
	LoadingDots,
	LoadingSpinner,
	PageLoader,
	SectionLoader
}
