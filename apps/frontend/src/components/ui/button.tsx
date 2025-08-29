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
	default: 'bg-primary text-primary-foreground hover:bg-primary/90',
	destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
	outline: 'border border-input bg-card hover:bg-muted',
	secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
	ghost: 'hover:bg-muted hover:text-foreground',
	link: 'text-primary underline-offset-4 hover:underline',
	premium: 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 shadow-lg'
}

const sizeClasses: Record<ButtonSize, string> = {
	default: 'h-10 px-4 py-2 text-sm',
	sm: 'h-9 px-3 text-xs',
	lg: 'h-11 px-8 text-base',
	icon: 'h-10 w-10 p-0'
}

// Base button classes using UnoCSS utilities
const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-fast focus-visible:(outline-none ring-2 ring-primary/50 ring-offset-2) disabled:(pointer-events-none opacity-50) [&_svg]:(pointer-events-none size-4 shrink-0)'

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

// Export variants for compatibility with existing components
export const buttonVariants = (props: { variant?: ButtonVariant; size?: ButtonSize }) => {
	return cn(
		baseClasses,
		variantClasses[props.variant || 'default'],
		sizeClasses[props.size || 'default']
	)
}

export { Button }
