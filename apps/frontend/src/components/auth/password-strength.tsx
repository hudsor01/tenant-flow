'use client'

import { cn } from '@/lib/design-system'
import * as Popover from '@radix-ui/react-popover'
import { Check, X } from 'lucide-react'
import * as React from 'react'

export interface PasswordStrengthProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
	showStrengthIndicator?: boolean
	minLength?: number
}

interface StrengthRule {
	id: string
	label: string
	test: (value: string) => boolean
}

const PasswordStrength = React.forwardRef<
	HTMLInputElement,
	PasswordStrengthProps
>(
	(
		{
			className,
			label,
			id,
			showStrengthIndicator = true,
			minLength = 8,
			...props
		},
		ref
	) => {
		const [password, setPassword] = React.useState('')
		const [isFocused, setIsFocused] = React.useState(false)
		const inputId = id || 'password-strength'

		const rules: StrengthRule[] = [
			{
				id: 'min-length',
				label: `Minimum ${minLength} characters`,
				test: val => val.length >= minLength
			},
			{
				id: 'lowercase',
				label: 'Contains lowercase letter',
				test: val => /[a-z]/.test(val)
			},
			{
				id: 'uppercase',
				label: 'Contains uppercase letter',
				test: val => /[A-Z]/.test(val)
			},
			{
				id: 'numbers',
				label: 'Contains number',
				test: val => /\d/.test(val)
			},
			{
				id: 'special',
				label: 'Contains special character',
				test: val => /[^A-Za-z0-9]/.test(val)
			}
		]

		const passedRules = rules.filter(rule => rule.test(password))
		const strength = (passedRules.length / rules.length) * 100

		const getStrengthColor = () => {
			if (strength === 0) return 'bg-[var(--color-fill-primary)]'
			if (strength <= 20) return 'bg-destructive'
			if (strength <= 40) return 'bg-accent'
			if (strength <= 60) return 'bg-accent'
			if (strength <= 80) return 'bg-[var(--color-accent-main)]'
			return 'bg-[var(--color-accent-main)]'
		}

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setPassword(e.target.value)
			props.onChange?.(e)
		}

		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className="block text-sm font-medium mb-2 text-foreground"
					>
						{label}
					</label>
				)}
				<Popover.Root open={isFocused && showStrengthIndicator}>
					<Popover.Anchor asChild>
						<input
							id={inputId}
							type="password"
							data-tokens="applied" className={cn(
								'flex h-10 w-full rounded-[var(--radius-medium)] border border-[var(--color-separator)] bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-label-tertiary)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-offset-[var(--focus-ring-offset)] disabled:cursor-not-allowed disabled:opacity-50',
								className
							)}
							ref={ref}
							value={password}
							onChange={handleChange}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
							{...props}
						/>
					</Popover.Anchor>

					<Popover.Portal>
						<Popover.Content
							className="z-50 w-80 rounded-[var(--radius-large)] bg-popover p-[var(--spacing-4)] shadow-[var(--shadow-medium)] border border-[var(--color-separator)]"
							sideOffset={5}
							onOpenAutoFocus={e => e.preventDefault()}
						>
							{/* Strength indicator bars */}
							<div className="flex gap-1 h-2">
								{[...Array(5)].map((_, i) => (
									<div
										key={i}
										data-tokens="applied" className={cn(
											'flex-1 rounded-full transition-all duration-[var(--duration-standard)]',
											i < Math.ceil(passedRules.length)
												? getStrengthColor()
												: 'bg-[var(--color-fill-primary)] opacity-50'
										)}
									/>
								))}
							</div>

							<h4 className="mt-4 mb-3 text-sm font-semibold text-foreground">
								Your password must contain:
							</h4>

							<ul className="space-y-2 text-sm">
								{rules.map(rule => {
									const passed = rule.test(password)
									return (
										<li
											key={rule.id}
											data-tokens="applied" className={cn(
												'flex items-center gap-x-2 transition-colors',
												passed ? 'text-accent' : 'text-[var(--color-label-tertiary)]'
											)}
										>
											{passed ? (
												<Check className="shrink-0 h-4 w-4" />
											) : (
												<X className="shrink-0 h-4 w-4" />
											)}
											<span>{rule.label}</span>
										</li>
									)
								})}
							</ul>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			</div>
		)
	}
)

PasswordStrength.displayName = 'PasswordStrength'

export { PasswordStrength }
