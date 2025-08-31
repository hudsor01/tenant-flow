import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	color?: 'primary' | 'secondary' | 'white' | 'current' | 'red' | 'blue'
	variant?: 'circle' | 'dots' | 'pulse' | 'ring'
	className?: string
}

export function Spinner({
	size = 'md',
	color = 'primary',
	variant = 'circle',
	className
}: SpinnerProps) {

	const iconSizes = {
		xs: 'text-xs',
		sm: 'text-sm',
		md: 'text-lg',
		lg: 'text-2xl',
		xl: 'text-5xl'
	}
	
	// Map colors to Tailwind color utilities
	const colorMap = {
		primary: 'text-blue-600',
		secondary: 'text-gray-500',
		white: 'text-white',
		current: 'text-current',
		red: 'text-red-500',
		blue: 'text-blue-500'
	}
	
	// For simplicity, we'll use Lucide's Loader2 for all variants
	// Different animations can be achieved with CSS classes
	const getSpinnerAnimation = () => {
		switch (variant) {
			case 'circle':
				return 'animate-spin'
			case 'dots':
				return 'animate-pulse'
			case 'pulse':
				return 'animate-pulse'
			case 'ring':
				return 'animate-spin'
			default:
				return 'animate-spin'
		}
	}
	
	return (
		<Loader2 
			className={cn(
				getSpinnerAnimation(),
				'inline-block',
				iconSizes[size],
				colorMap[color],
				className
			)} 
			aria-label="Loading"
			role="status"
		/>
	)
}

// Helper components for common spinner use cases
export function LoadingSpinner({
	text = 'Loading...',
	size = 'md',
	variant = 'circle' as SpinnerProps['variant']
}: {
	text?: string
	size?: SpinnerProps['size']
	variant?: SpinnerProps['variant']
}) {
	return (
		<div className="flex items-center gap-2">
			<Spinner size={size} variant={variant} />
			<span className="text-gray-600 text-sm">{text}</span>
		</div>
	)
}

export function CenteredSpinner({
	size = 'lg',
	text,
	variant = 'circle' as SpinnerProps['variant'],
	className
}: {
	size?: SpinnerProps['size']
	text?: string
	variant?: SpinnerProps['variant']
	className?: string
}) {
	return (
		<div className={cn('flex items-center justify-center p-8', className)}>
			<div className="text-center">
				<Spinner size={size} variant={variant} className="mx-auto" />
				{text && (
					<p className="text-gray-600 mt-2 text-sm">{text}</p>
				)}
			</div>
		</div>
	)
}

// Button loading state helper with icon options
export function ButtonSpinner({ 
	text = 'Loading...',
	variant = 'circle' as SpinnerProps['variant']
}: { 
	text?: string
	variant?: SpinnerProps['variant']
}) {
	return (
		<div className="inline-flex items-center gap-2">
			<Spinner size="sm" color="current" variant={variant} />
			<span>{text}</span>
		</div>
	)
}
