'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2Icon } from 'lucide-react'

import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'

// Basic spinner icon component
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
	return (
		<Loader2Icon
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin', className)}
			{...props}
		/>
	)
}

// CVA variants for LoadingSpinner
const spinnerVariants = cva(
	'animate-spin [animation-duration:var(--duration-1000)] [animation-timing-function:var(--ease-linear)]',
	{
		variants: {
			size: {
				sm: 'size-4',
				default: 'size-6',
				lg: 'size-8',
				xl: 'size-12'
			},
			variant: {
				default: 'text-(--color-label-secondary)',
				primary: 'text-(--color-accent-main)',
				muted: 'text-(--color-label-tertiary)'
			}
		},
		defaultVariants: {
			size: 'default',
			variant: 'default'
		}
	}
)

const spinnerTextVariants = cva(
	'font-medium tracking-normal leading-normal animate-pulse animation-duration-(--duration-500) [animation-timing-function:var(--ease-in-out)]',
	{
		variants: {
			size: {
				sm: 'text-(--font-footnote)',
				default: 'text-(--font-body)',
				lg: 'text-(--font-title-3)',
				xl: 'text-(--font-title-2)'
			},
			variant: {
				default: 'text-(--color-label-secondary)',
				primary: 'text-(--color-accent-main)',
				muted: 'text-(--color-label-tertiary)'
			}
		},
		defaultVariants: {
			size: 'default',
			variant: 'default'
		}
	}
)

type SpinnerVariants = VariantProps<typeof spinnerVariants>

interface LoadingSpinnerProps extends SpinnerVariants {
	className?: string
	text?: string
}

function LoadingSpinner({
	size = 'default',
	variant = 'default',
	className,
	text,
	...props
}: LoadingSpinnerProps & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex-center', text ? 'flex-col gap-3' : '', className)}
			{...props}
		>
			<Loader2Icon className={cn(spinnerVariants({ size, variant }))} />
			{text && (
				<p className={cn(spinnerTextVariants({ size, variant }))}>{text}</p>
			)}
		</div>
	)
}

// Page-level loading component
function PageLoader({
	text = 'Loading...',
	className,
	...props
}: { text?: string } & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex-center min-h-screen bg-background', className)}
			{...props}
		>
			<div className="text-center space-y-4">
				<LoadingSpinner size="xl" variant="primary" />
				<div className="space-y-2">
					<p className="typography-large text-foreground">{text}</p>
					<p className="text-sm text-(--color-label-tertiary)">
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
	}) {
	return (
		<Button
			disabled={disabled}
			variant="ghost"
			className={cn('gap-2 pointer-events-none', className)}
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
		<div className={cn('relative', className)} {...props}>
			{/* Glass Backdrop */}
			<div className="absolute inset-0 glass z-10 flex-center rounded-[var(--radius-lg)]">
				<div className="shadow-md bg-card/50 border border-border backdrop-blur-sm p-6">
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
		<div className={cn('inline-flex items-center gap-2', className)} {...props}>
			<LoadingSpinner size={size} variant="muted" />
			<span className="text-sm text-(--color-label-tertiary)">Loading...</span>
		</div>
	)
}

// CVA for loading dots
const dotsVariants = cva('rounded-full animate-bounce bg-current', {
	variants: {
		size: {
			sm: 'size-1',
			default: 'size-2',
			lg: 'size-3'
		},
		variant: {
			default: 'text-(--color-label-secondary)',
			primary: 'text-(--color-accent-main)',
			muted: 'text-(--color-label-tertiary)'
		}
	},
	defaultVariants: {
		size: 'default',
		variant: 'default'
	}
})

const dotsContainerVariants = cva('flex items-center', {
	variants: {
		size: {
			sm: 'gap-1',
			default: 'gap-1.5',
			lg: 'gap-2'
		}
	},
	defaultVariants: {
		size: 'default'
	}
})

// Loading Dots - Satisfying bounce animation with professional timing
function LoadingDots({
	className,
	variant = 'default',
	size = 'default',
	asButton = false,
	...props
}: VariantProps<typeof dotsVariants> & {
	asButton?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
	const dots = (
		<div className={cn(dotsContainerVariants({ size }))} {...props}>
			<div
				className={cn(
					dotsVariants({ size, variant }),
					'[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:0ms]'
				)}
			/>
			<div
				className={cn(
					dotsVariants({ size, variant }),
					'[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:200ms]'
				)}
			/>
			<div
				className={cn(
					dotsVariants({ size, variant }),
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
	SectionLoader,
	Spinner,
	spinnerVariants,
	spinnerTextVariants,
	dotsVariants
}
