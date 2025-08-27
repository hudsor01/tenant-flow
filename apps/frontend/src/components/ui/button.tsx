/**
 * Native Button Component with UnoCSS
 * No CVA, no external dependencies, just UnoCSS shortcuts
 */

'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

// Native variant types without CVA
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	asChild?: boolean
	loading?: boolean
}

// UnoCSS class maps - will be converted to shortcuts in uno.config.ts
const variantClasses: Record<ButtonVariant, string> = {
	default: 'bg-brand-500 text-white hover:bg-brand-600',
	destructive: 'bg-red-500 text-white hover:bg-red-600',
	outline: 'border border-gray-300 bg-white hover:bg-gray-50',
	secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
	ghost: 'hover:bg-gray-100 hover:text-gray-900',
	link: 'text-brand-500 underline-offset-4 hover:underline',
	premium: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg'
}

const sizeClasses: Record<ButtonSize, string> = {
	default: 'h-10 px-4 py-2 text-sm',
	sm: 'h-9 px-3 text-xs',
	lg: 'h-11 px-8 text-base',
	icon: 'h-10 w-10 p-0'
}

// Base button classes using UnoCSS utilities
const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-fast focus-visible:(outline-none ring-2 ring-brand-500 ring-offset-2) disabled:(pointer-events-none opacity-50) [&_svg]:(pointer-events-none size-4 shrink-0)'

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = 'default',
			size = 'default',
			asChild = false,
			loading,
			disabled,
			children,
			...props
		},
		ref
	) => {
		const Comp = asChild ? Slot : 'button'

		// Build complete className
		const classes = cn(
			baseClasses,
			variantClasses[variant],
			sizeClasses[size],
			className
		)

		// When using asChild, we can't add extra elements like the loading spinner
		if (asChild) {
			return (
				<Comp
					className={classes}
					ref={ref}
					disabled={disabled || loading}
					{...props}
				>
					{children}
				</Comp>
			)
		}

		return (
			<Comp
				className={classes}
				ref={ref}
				disabled={disabled || loading}
				aria-busy={loading}
				{...props}
			>
				{loading && (
					<i className="i-lucide-loader-2 animate-spin" aria-label="Loading" />
				)}
				{children}
			</Comp>
		)
	}
)

Button.displayName = 'Button'

export { Button }