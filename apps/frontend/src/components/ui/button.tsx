/**
 * Button Component - Consolidated Architecture
 *
 * Single button component with comprehensive props for all use cases:
 * - Basic buttons with variants (default, secondary, destructive, outline, ghost, link, cta)
 * - Loading states with different indicators
 * - Icon placement and animations
 * - Specialized behaviors (CTA, FAB, icon-only)
 * - Grouping and accessibility features
 */

'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { enhancedButtonVariants, type EnhancedButtonVariants } from './variants'
import { Loader2 } from 'lucide-react'

// ============================================================================
// BUTTON TYPES AND INTERFACES
// ============================================================================

type ButtonBehavior = 'default' | 'cta' | 'icon' | 'fab' | 'split'
type LoadingVariant = 'spinner' | 'dots' | 'shimmer'
type FABPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface DropdownAction {
	label: string
	onClick: () => void
	icon?: React.ReactNode
	destructive?: boolean
}

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		EnhancedButtonVariants {
	// Core props
	asChild?: boolean
	children?: React.ReactNode

	// Loading states
	loading?: boolean
	loadingText?: string
	loadingVariant?: LoadingVariant

	// Icons and content
	leftIcon?: React.ReactNode
	rightIcon?: React.ReactNode
	icon?: React.ReactNode // For icon-only buttons

	// Animation and interaction
	animate?: boolean
	success?: boolean
	rotateIcon?: boolean

	// Specialized behavior types
	behavior?: ButtonBehavior

	// CTA specific props
	priority?: 'primary' | 'secondary'
	glow?: boolean
	pulse?: boolean

	// FAB specific props
	fabPosition?: FABPosition
	fabOffset?: string

	// Split button props
	mainAction?: {
		label: string
		onClick: () => void
	}
	dropdownActions?: DropdownAction[]

	// Accessibility
	label?: string // For icon buttons
	tooltip?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			// Core props
			className,
			variant,
			size,
			fullWidth,
			asChild = false,
			children,
			disabled,

			// Loading props
			loading = false,
			loadingText,
			loadingVariant = 'spinner',

			// Icon props
			leftIcon,
			rightIcon,
			icon,
			rotateIcon = false,

			// Animation props
			animate = false,
			success = false,

			// Behavior props
			behavior = 'default',

			// CTA props
			priority = 'primary',
			glow = false,
			pulse = false,

			// FAB props
			fabPosition = 'bottom-right',
			fabOffset = '2rem',

			// Split button props
			mainAction,
			dropdownActions,

			// Accessibility props
			label,
			tooltip,

			// Extract motion-specific props to avoid conflicts
			onDrag: _onDrag,
			onDragStart: _onDragStart,
			onDragEnd: _onDragEnd,
			onAnimationStart: _onAnimationStart,
			onAnimationEnd: _onAnimationEnd,

			...props
		},
		ref
	) => {
		// Derive computed values
		const Comp = asChild ? Slot : 'button'
		const isDisabled = disabled || loading
		const shouldAnimate = animate || success || behavior === 'fab'
		const effectiveVariant =
			behavior === 'cta' && !variant
				? priority === 'primary'
					? 'cta'
					: 'outline'
				: variant
		const effectiveSize = behavior === 'icon' && !size ? 'icon' : size

		// Handle split button behavior
		if (behavior === 'split' && mainAction && dropdownActions) {
			return (
				<SplitButtonImplementation
					mainAction={mainAction}
					dropdownActions={dropdownActions}
					variant={effectiveVariant}
					size={effectiveSize}
					className={className}
					disabled={isDisabled}
					{...props}
				/>
			)
		}

		// Render loading content based on variant
		const renderLoadingIcon = () => {
			switch (loadingVariant) {
				case 'spinner':
					return shouldAnimate ? (
						<motion.div
							animate={{ rotate: 360 }}
							transition={{
								duration: 1,
								repeat: Infinity,
								ease: 'linear'
							}}
							className="shrink-0"
						>
							<Loader2 className="h-4 w-4" />
						</motion.div>
					) : (
						<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
					)
				case 'dots':
					return (
						<div className="flex shrink-0 space-x-1">
							<div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
							<div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
							<div className="h-1 w-1 animate-bounce rounded-full bg-current" />
						</div>
					)
				case 'shimmer':
					return (
						<div className="h-4 w-16 shrink-0 animate-pulse rounded bg-current/20" />
					)
				default:
					return <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
			}
		}

		// Build button content
		const buttonContent = (
			<>
				{/* Loading state */}
				{loading ? (
					renderLoadingIcon()
				) : /* Icon-only button */
				behavior === 'icon' && icon ? (
					rotateIcon ? (
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 0.5 }}
							className="shrink-0"
						>
							{icon}
						</motion.div>
					) : (
						<span className="shrink-0">{icon}</span>
					)
				) : (
					/* Regular button with optional left icon */
					leftIcon && <span className="shrink-0">{leftIcon}</span>
				)}

				{/* Button text content */}
				{behavior !== 'icon' && (
					<span className={cn(loading && loadingText && 'sr-only')}>
						{children}
					</span>
				)}

				{/* Loading text */}
				{loading && loadingText && <span>{loadingText}</span>}

				{/* Right icon */}
				{!loading && rightIcon && behavior !== 'icon' && (
					<span className="shrink-0">{rightIcon}</span>
				)}

				{/* Accessibility label for icon buttons */}
				{behavior === 'icon' && label && (
					<span className="sr-only">{label}</span>
				)}
			</>
		)

		// Compute final className with behavior-specific styles
		const finalClassName = cn(
			enhancedButtonVariants({
				variant: effectiveVariant,
				size: effectiveSize,
				fullWidth
			}),
			// CTA specific styles
			behavior === 'cta' && glow && 'relative overflow-visible shadow-lg',
			behavior === 'cta' &&
				glow &&
				'before:from-primary before:to-accent before:absolute before:inset-[-2px] before:z-[-1] before:rounded-[inherit] before:bg-gradient-to-r before:opacity-60 before:blur-sm',
			behavior === 'cta' && pulse && 'animate-pulse',
			// FAB specific styles
			behavior === 'fab' && getFABPositionClasses(fabPosition, fabOffset),
			behavior === 'fab' &&
				'z-50 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl',
			className
		)

		// Compute accessibility props
		const accessibilityProps = {
			...props,
			...(behavior === 'icon' && label && { 'aria-label': label }),
			...(tooltip && { title: tooltip }),
			disabled: isDisabled
		}

		// Enhanced animation logic for different behaviors
		if (shouldAnimate && !asChild) {
			const motionProps = getMotionProps(
				behavior,
				success,
				isDisabled,
				fabPosition
			)
			return (
				<motion.button
					ref={ref}
					className={finalClassName}
					{...motionProps}
					{...accessibilityProps}
				>
					{buttonContent}
				</motion.button>
			)
		}

		// Standard button without animations
		return (
			<Comp ref={ref} className={finalClassName} {...accessibilityProps}>
				{asChild ? (
					<span className="inline-flex items-center gap-2">
						{buttonContent}
					</span>
				) : (
					buttonContent
				)}
			</Comp>
		)
	}
)
Button.displayName = 'Button'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFABPositionClasses(position: FABPosition, offset: string): string {
	const positions = {
		'bottom-right': `fixed bottom-[${offset}] right-[${offset}]`,
		'bottom-left': `fixed bottom-[${offset}] left-[${offset}]`,
		'top-right': `fixed top-[${offset}] right-[${offset}]`,
		'top-left': `fixed top-[${offset}] left-[${offset}]`
	}
	return positions[position]
}

function getMotionProps(
	behavior: ButtonBehavior,
	success: boolean,
	isDisabled: boolean,
	_fabPosition?: FABPosition
) {
	const baseProps = {
		whileHover: !isDisabled
			? { scale: behavior === 'fab' ? 1.1 : 1.02 }
			: undefined,
		whileTap: !isDisabled
			? { scale: behavior === 'fab' ? 0.9 : 0.98 }
			: undefined,
		transition: {
			type: 'spring' as const,
			stiffness: 400,
			damping: 30
		}
	}

	// Success animation
	if (success) {
		return {
			...baseProps,
			animate: {
				backgroundColor: [
					'var(--primary)',
					'var(--success)',
					'var(--primary)'
				],
				transition: { duration: 0.5 }
			}
		}
	}

	// FAB entrance animation
	if (behavior === 'fab') {
		return {
			...baseProps,
			initial: { scale: 0, opacity: 0 },
			animate: { scale: 1, opacity: 1 }
		}
	}

	return baseProps
}

// ============================================================================
// SPLIT BUTTON IMPLEMENTATION
// ============================================================================

function SplitButtonImplementation({
	mainAction,
	dropdownActions,
	variant = 'default',
	size = 'default',
	className,
	disabled,
	...props
}: {
	mainAction: { label: string; onClick: () => void }
	dropdownActions: DropdownAction[]
	variant?: EnhancedButtonVariants['variant']
	size?: EnhancedButtonVariants['size']
	className?: string
	disabled?: boolean
	[key: string]: unknown
}) {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<div className="relative inline-flex">
			<Button
				variant={variant}
				size={size}
				className={cn('rounded-r-none border-r-0', className)}
				onClick={mainAction.onClick}
				disabled={disabled}
				{...props}
			>
				{mainAction.label}
			</Button>

			<Button
				variant={variant}
				size={size}
				className="rounded-l-none px-2"
				onClick={() => setIsOpen(!isOpen)}
				disabled={disabled}
				{...props}
			>
				<svg
					className="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</Button>

			{isOpen && (
				<div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-48 rounded-md border p-1 shadow-lg">
					{dropdownActions.map((action, index) => (
						<button
							key={index}
							className={cn(
								'flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors',
								'hover:bg-accent hover:text-accent-foreground',
								action.destructive &&
									'text-red-600 hover:bg-red-50 hover:text-red-700'
							)}
							onClick={() => {
								action.onClick()
								setIsOpen(false)
							}}
						>
							{action.icon && (
								<span className="mr-2">{action.icon}</span>
							)}
							{action.label}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

// ============================================================================
// BUTTON GROUP COMPONENT
// ============================================================================

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	orientation?: 'horizontal' | 'vertical'
	size?: 'sm' | 'md' | 'lg'
	variant?: 'default' | 'outline' | 'ghost'
	attach?: boolean
}

export function ButtonGroup({
	children,
	className,
	orientation = 'horizontal',
	attach = false,
	...props
}: ButtonGroupProps) {
	return (
		<div
			className={cn(
				'inline-flex',
				orientation === 'horizontal' ? 'flex-row' : 'flex-col',
				attach
					? orientation === 'horizontal'
						? '[&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child)]:ml-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none'
						: '[&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child)]:mt-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none'
					: orientation === 'horizontal'
						? 'space-x-2'
						: 'space-y-2',
				className
			)}
			role="group"
			{...props}
		>
			{children}
		</div>
	)
}

// ============================================================================
// LEGACY COMPONENT ALIASES FOR BACKWARDS COMPATIBILITY
// ============================================================================

// Icon Button - now uses behavior="icon"
export const IconButton = React.forwardRef<
	HTMLButtonElement,
	Omit<ButtonProps, 'leftIcon' | 'rightIcon'> & {
		icon: React.ReactNode
		label: string
		rotate?: boolean
	}
>(({ icon, label, rotate, ...props }, ref) => (
	<Button
		ref={ref}
		behavior="icon"
		icon={icon}
		label={label}
		rotateIcon={rotate}
		{...props}
	/>
))
IconButton.displayName = 'IconButton'

// CTA Button - now uses behavior="cta"
export const CTAButton = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & {
		priority?: 'primary' | 'secondary'
		glow?: boolean
		pulse?: boolean
	}
>(({ priority, glow, pulse, ...props }, ref) => (
	<Button
		ref={ref}
		behavior="cta"
		priority={priority}
		glow={glow}
		pulse={pulse}
		{...props}
	/>
))
CTAButton.displayName = 'CTAButton'

// Loading Button - now uses loading prop
export const LoadingButton = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & { loadingVariant?: LoadingVariant }
>(({ loadingVariant, ...props }, ref) => (
	<Button ref={ref} loadingVariant={loadingVariant} {...props} />
))
LoadingButton.displayName = 'LoadingButton'

// Split Button - now uses behavior="split"
export function SplitButton({
	mainAction,
	dropdownActions,
	...props
}: Omit<ButtonProps, 'children'> & {
	mainAction: { label: string; onClick: () => void }
	dropdownActions: DropdownAction[]
}) {
	return (
		<Button
			behavior="split"
			mainAction={mainAction}
			dropdownActions={dropdownActions}
			{...props}
		/>
	)
}

// Floating Action Button - now uses behavior="fab"
export const FloatingActionButton = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & {
		position?: FABPosition
		offset?: string
	}
>(({ position, offset, ...props }, ref) => (
	<Button
		ref={ref}
		behavior="fab"
		fabPosition={position}
		fabOffset={offset}
		{...props}
	/>
))
FloatingActionButton.displayName = 'FloatingActionButton'

// ============================================================================
// EXPORTS
// ============================================================================

// Main components (ButtonGroup is exported inline above)
export { Button, Button as EnhancedButton }
export { enhancedButtonVariants as buttonVariants }

// Type exports
export type { ButtonBehavior, LoadingVariant, FABPosition, DropdownAction }
