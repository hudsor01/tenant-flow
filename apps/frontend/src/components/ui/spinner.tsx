/**
 * Native UnoCSS Spinner Component
 * Uses pure CSS icons for zero JavaScript bundle impact
 */

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
	// Map sizes to UnoCSS icon sizes
	const iconSizes = {
		xs: 'text-xs',
		sm: 'text-sm',
		md: 'text-lg',
		lg: 'text-2xl',
		xl: 'text-5xl'
	}
	
	// Map colors to UnoCSS color utilities
	const colorMap = {
		primary: 'text-blue-6',
		secondary: 'text-gray-5',
		white: 'text-white',
		current: 'text-current',
		red: 'text-red-5',
		blue: 'text-blue-5'
	}
	
	// Different spinner variants using various icon libraries
	const spinnerIcons = {
		circle: 'i-lucide-loader-2',
		dots: 'i-svg-spinners-3-dots-fade',
		pulse: 'i-svg-spinners-pulse-3',
		ring: 'i-svg-spinners-ring-resize'
	}
	
	return (
		<i 
			className={cn(
				spinnerIcons[variant],
				'animate-spin inline-block',
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
			<span className="text-gray-6 text-sm">{text}</span>
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
					<p className="text-gray-6 mt-2 text-sm">{text}</p>
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
