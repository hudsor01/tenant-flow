'use client'

import { OTPInput, OTPInputContext } from 'input-otp'
import * as React from 'react'

import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function InputOTP({
	className,
	containerClassName,
	...props
}: React.ComponentProps<typeof OTPInput> & {
	containerClassName?: string
}) {
	return (
		<OTPInput
			data-slot="input-otp"
			containerClassName={cn(
				// Layout using design tokens
				"flex items-center",
				"gap-[var(--spacing-2)]",
				"has-disabled:opacity-[0.5]",

				containerClassName
			)}
			data-tokens="applied"
			className={cn(
				// Disabled state using design tokens
				"disabled:cursor-not-allowed",

				className
			)}
			{...props}
		/>
	)
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="input-otp-group"
			data-tokens="applied"
			className={cn(
				// Layout using design tokens
				"flex items-center",

				className
			)}
			{...props}
		/>
	)
}

function InputOTPSlot({
	index,
	className,
	...props
}: React.ComponentProps<'div'> & {
	index: number
}) {
	const inputOTPContext = React.useContext(OTPInputContext)
	const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

	return (
		<div
			data-slot="input-otp-slot"
			data-active={isActive}
			data-tokens="applied"
			className={cn(
				// Base layout and sizing using design tokens
				"relative flex items-center justify-center",
				"h-[var(--spacing-9)] w-[var(--spacing-9)]",

				// Design tokens: borders, radius, shadows
				"border-y border-r",
				"border-[var(--color-separator)]",
				"shadow-[var(--shadow-small)]",
				"outline-none",

				// Border radius using design tokens
				"first:rounded-l-[var(--radius-medium)]",
				"first:border-l",
				"last:rounded-r-[var(--radius-medium)]",

				// Typography using design tokens
				"text-[var(--font-body)]",
				"font-[var(--font-weight-normal)]",

				// Transitions using design tokens
				"transition-all",
				"duration-[var(--duration-quick)]",
				"ease-[var(--ease-smooth)]",

				// Active state using design tokens
				"data-[active=true]:z-[var(--z-10)]",
				"data-[active=true]:border-[var(--focus-ring-color)]",
				"data-[active=true]:ring-[var(--focus-ring-width)]",
				"data-[active=true]:ring-[var(--focus-ring-color)]",
				"data-[active=true]:ring-offset-[var(--focus-ring-offset)]",

				// Invalid state using design tokens
				"aria-invalid:border-[var(--color-system-red)]",
				"data-[active=true]:aria-invalid:border-[var(--color-system-red)]",
				"data-[active=true]:aria-invalid:ring-[var(--color-system-red-50)]",

				className
			)}
			{...props}
		>
			{char}
			{hasFakeCaret && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="animate-caret-blink bg-[var(--color-label-primary)] h-[var(--spacing-4)] w-px duration-[var(--duration-1000)]" />
				</div>
			)}
		</div>
	)
}

function InputOTPSeparator({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="input-otp-separator"
			role="separator"
			data-tokens="applied"
			className={cn(
				// Layout using design tokens
				"flex items-center justify-center",

				className
			)}
			{...props}
		>
			<Separator orientation="vertical" className="h-[var(--spacing-4)]" />
		</div>
	)
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
