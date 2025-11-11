'use client'

import { cn } from '#lib/design-system'
import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

export interface PasswordInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
	'data-testid'?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, label, id, ...props }, ref) => {
		const [showPassword, setShowPassword] = React.useState(false)
		const inputId = id || 'password-input'

		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className={cn(
							// Typography using design tokens
							'block',
							'text-(--font-body)',
							'font-[var(--font-weight-medium)]',
							'text-(--color-label-primary)',
							'mb-[var(--spacing-2)]'
						)}
					>
						{label}
					</label>
				)}
				<div className="relative">
					<input
						id={inputId}
						type={showPassword ? 'text' : 'password'}
						data-tokens="applied"
						data-testid={props['data-testid'] || 'password-input'}
						className={cn(
							// Base layout and sizing using design tokens
							'flex w-full',
							'h-[var(--spacing-10)]',
							'px-[var(--spacing-3)] py-[var(--spacing-2)]',
							'pr-[var(--spacing-10)]',

							// Design tokens: borders, radius, shadows
							'rounded-[var(--radius-medium)]',
							'border border-(--color-separator)',
							'bg-transparent',
							'shadow-[var(--shadow-small)]',
							'outline-none',

							// Typography with design tokens
							'text-(--font-body)',
							'font-[var(--font-weight-normal)]',
							'leading-[var(--line-height-body)]',

							// File input styles using design tokens
							'file:border-0 file:bg-transparent',
							'file:text-(--font-body)',
							'file:font-[var(--font-weight-medium)]',

							// Placeholder using design tokens
							'placeholder:text-(--color-label-tertiary)',

							// Focus state with comprehensive design tokens
							'focus-visible:outline-none',
							'focus-visible:ring-[var(--focus-ring-width)]',
							'focus-visible:ring-[var(--focus-ring-color)]',
							'focus-visible:ring-offset-[var(--focus-ring-offset)]',
							'focus-visible:border-(--focus-ring-color)',

							// Disabled state using design tokens
							'disabled:cursor-not-allowed',
							'disabled:opacity-[0.5]',

							className
						)}
						ref={ref}
						{...props}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className={cn(
							// Position and layout using design tokens
							'absolute inset-y-0 right-0',
							'flex items-center',
							'px-[var(--spacing-3)]',

							// Colors using design tokens
							'text-(--color-label-tertiary)',
							'hover:text-(--color-label-primary)',
							'focus:text-(--color-accent-main)',

							// Focus and interaction
							'focus:outline-none',

							// Transitions using design tokens
							'transition-colors',
							'duration-[var(--duration-quick)]',
							'ease-[var(--ease-smooth)]'
						)}
						tabIndex={-1}
					>
						{showPassword ? (
							<EyeOff
								className="h-[var(--spacing-4)] w-[var(--spacing-4)]"
								aria-hidden="true"
							/>
						) : (
							<Eye
								className="h-[var(--spacing-4)] w-[var(--spacing-4)]"
								aria-hidden="true"
							/>
						)}
						<span className="sr-only">
							{showPassword ? 'Hide password' : 'Show password'}
						</span>
					</button>
				</div>
			</div>
		)
	}
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
