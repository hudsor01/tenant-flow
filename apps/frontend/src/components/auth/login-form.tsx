'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/password-input'
import { PasswordStrength } from '@/components/auth/password-strength'
import { cn } from '@/lib/design-system'
import {
	loginZodSchema,
	registerZodSchema,
	type AuthFormProps
} from '@repo/shared'
import { Check, Eye, EyeOff } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import type { ZodError } from 'zod'

export function LoginForm({
	className,
	mode = 'login',
	onSubmit,
	onForgotPassword,
	onSignUp,
	onLogin,
	onGoogleLogin,
	isLoading,
	isGoogleLoading
}: AuthFormProps) {
	const isLogin = mode === 'login'
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		company: '',
		email: '',
		password: '',
		confirmPassword: ''
	})

	// Field validation states
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
		{}
	)
	const [validFields, setValidFields] = useState<Record<string, boolean>>({})

	const validateField = (name: string, value: string) => {
		const schema = isLogin ? loginZodSchema : registerZodSchema
		const tempForm = { ...form, [name]: value }

		try {
			schema.parse(tempForm)
		} catch {
			// Schema validation will be used for complete form validation
		}

		try {
			// For login, only validate email and password
			if (isLogin) {
				const partialSchema = loginZodSchema.pick({
					email: true,
					password: true
				})
				partialSchema.parse({
					email: tempForm.email,
					password: tempForm.password
				})
			} else {
				// For signup, validate based on field
				if (name === 'email') {
					registerZodSchema.pick({ email: true }).parse({ email: value })
				} else if (name === 'password') {
					registerZodSchema.pick({ password: true }).parse({ password: value })
				} else if (name === 'confirmPassword' && tempForm.password) {
					if (value !== tempForm.password) {
						throw new Error("Passwords don't match")
					}
				} else if (name === 'firstName') {
					if (value.length < 2)
						throw new Error('First name must be at least 2 characters')
					if (!/^[a-zA-Z\s-']+$/.test(value))
						throw new Error('Please enter a valid first name')
				} else if (name === 'lastName') {
					if (value.length < 2)
						throw new Error('Last name must be at least 2 characters')
					if (!/^[a-zA-Z\s-']+$/.test(value))
						throw new Error('Please enter a valid last name')
				} else if (name === 'company') {
					if (value.length < 2)
						throw new Error('Company name must be at least 2 characters')
				}
			}

			// Field is valid
			setFieldErrors(prev => ({ ...prev, [name]: '' }))
			setValidFields(prev => ({ ...prev, [name]: true }))
		} catch (error) {
			// Field has error
			let message = ''
			if (error instanceof Error) {
				message = error.message
			} else if (error && typeof error === 'object' && 'issues' in error) {
				const zodError = error as ZodError
				if (zodError.issues && zodError.issues[0]) {
					message = zodError.issues[0].message
				}
			}
			setFieldErrors(prev => ({ ...prev, [name]: message }))
			setValidFields(prev => ({ ...prev, [name]: false }))
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setForm(prev => ({ ...prev, [name]: value }))

		// Validate field if it has been touched
		if (touchedFields[name]) {
			validateField(name, value)
		}
	}

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setTouchedFields(prev => ({ ...prev, [name]: true }))
		validateField(name, value)
	}

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		const { name } = e.target
		// Clear error on focus
		setFieldErrors(prev => ({ ...prev, [name]: '' }))
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		// Validate all fields before submission
		const fieldsToValidate = isLogin
			? ['email', 'password']
			: [
					'firstName',
					'lastName',
					'company',
					'email',
					'password',
					'confirmPassword'
				]

		let hasErrors = false
		const errors: Record<string, string> = {}

		// Mark all fields as touched
		const newTouchedFields: Record<string, boolean> = {}
		fieldsToValidate.forEach(field => {
			newTouchedFields[field] = true
		})
		setTouchedFields(newTouchedFields)

		// Validate form based on mode
		try {
			if (isLogin) {
				loginZodSchema.parse({
					email: form.email,
					password: form.password
				})
			} else {
				registerZodSchema.parse(form)
			}
		} catch (error) {
			hasErrors = true
			if ((error as ZodError).issues) {
				;(error as ZodError).issues.forEach(issue => {
					const field = issue.path[0] as string
					errors[field] = issue.message
				})
			}
		}

		// Additional validation for signup
		if (!isLogin) {
			if (form.firstName.length < 2) {
				errors.firstName = 'First name must be at least 2 characters'
				hasErrors = true
			}
			if (form.lastName.length < 2) {
				errors.lastName = 'Last name must be at least 2 characters'
				hasErrors = true
			}
			if (form.company.length < 2) {
				errors.company = 'Company name must be at least 2 characters'
				hasErrors = true
			}
		}

		if (hasErrors) {
			setFieldErrors(errors)
			// Show first error as toast
			const firstError = Object.values(errors)[0]
			toast.error('Validation Error', {
				description: firstError
			})
			return
		}

		onSubmit?.(form)

		// Call specific login callback if in login mode
		if (isLogin) {
			onLogin?.()
		}
	}

	return (
		<div className={cn('w-full', className)}>
			<form className="space-y-5" onSubmit={handleSubmit}>
				{!isLogin && (
					<div className="grid grid-cols-2 gap-[var(--spacing-4)]">
						<div className="relative">
							<Label htmlFor="firstName">First name</Label>
							<div className="relative">
								<Input
									id="firstName"
									name="firstName"
									required
									autoComplete="given-name"
									value={form.firstName}
									onChange={handleChange}
									onBlur={handleBlur}
									onFocus={handleFocus}
									className={cn(
										fieldErrors.firstName && touchedFields.firstName
											? 'border-destructive focus:ring-destructive'
											: validFields.firstName && touchedFields.firstName
												? 'border-[var(--color-system-green)] focus:ring-[var(--color-system-green)]'
												: ''
									)}
								/>
								{validFields.firstName && touchedFields.firstName && (
									<Check className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--color-system-green)]" />
								)}
							</div>
							{fieldErrors.firstName && touchedFields.firstName && (
								<p className="text-xs text-destructive mt-1">
									{fieldErrors.firstName}
								</p>
							)}
						</div>
						<div className="relative">
							<Label htmlFor="lastName">Last name</Label>
							<div className="relative">
								<Input
									id="lastName"
									name="lastName"
									required
									autoComplete="family-name"
									value={form.lastName}
									onChange={handleChange}
									onBlur={handleBlur}
									onFocus={handleFocus}
									className={cn(
										fieldErrors.lastName && touchedFields.lastName
											? 'border-destructive focus:ring-destructive'
											: validFields.lastName && touchedFields.lastName
												? 'border-[var(--color-system-green)] focus:ring-[var(--color-system-green)]'
												: ''
									)}
								/>
								{validFields.lastName && touchedFields.lastName && (
									<Check className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--color-system-green)]" />
								)}
							</div>
							{fieldErrors.lastName && touchedFields.lastName && (
								<p className="text-xs text-destructive mt-1">
									{fieldErrors.lastName}
								</p>
							)}
						</div>
					</div>
				)}

				{!isLogin && (
					<div>
						<Label htmlFor="company">Company</Label>
						<div className="relative">
							<Input
								id="company"
								name="company"
								required
								autoComplete="organization"
								value={form.company}
								onChange={handleChange}
								onBlur={handleBlur}
								onFocus={handleFocus}
								className={cn(
									fieldErrors.company && touchedFields.company
										? 'border-destructive focus:ring-destructive'
										: validFields.company && touchedFields.company
											? 'border-[var(--color-system-green)] focus:ring-[var(--color-system-green)]'
											: ''
								)}
							/>
							{validFields.company && touchedFields.company && (
								<Check className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--color-system-green)]" />
							)}
						</div>
						{fieldErrors.company && touchedFields.company && (
							<p className="text-xs text-destructive mt-1">
								{fieldErrors.company}
							</p>
						)}
					</div>
				)}

				<div>
					<Label htmlFor="email">Email address</Label>
					<div className="relative">
						<Input
							id="email"
							name="email"
							type="email"
							required
							autoComplete="email"
							value={form.email}
							onChange={handleChange}
							onBlur={handleBlur}
							onFocus={handleFocus}
							placeholder="Enter your email"
							className={cn(
								'h-[var(--spacing-11)]',
								fieldErrors.email && touchedFields.email
									? 'border-destructive focus:ring-destructive'
									: validFields.email && touchedFields.email
										? 'border-[var(--color-system-green)] focus:ring-[var(--color-system-green)]'
										: ''
							)}
							aria-describedby={isLogin ? undefined : 'email-hint'}
						/>
						{validFields.email && touchedFields.email && (
							<Check className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--color-system-green)]" />
						)}
					</div>
					{fieldErrors.email && touchedFields.email && (
						<p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
					)}
					{!isLogin && !fieldErrors.email && (
						<p id="email-hint" className="text-xs text-muted-foreground mt-1">
							We'll use this to send you important updates
						</p>
					)}
				</div>

				<div>
					{isLogin ? (
						<>
							<PasswordInput
								label="Password"
								id="password"
								name="password"
								required
								autoComplete="current-password"
								value={form.password}
								onChange={handleChange}
								onBlur={handleBlur}
								onFocus={handleFocus}
								placeholder="Enter your password"
								className={cn(
									'h-[var(--spacing-11)]',
									fieldErrors.password && touchedFields.password
										? 'border-destructive focus:ring-destructive'
										: ''
								)}
							/>
							{fieldErrors.password && touchedFields.password && (
								<p className="text-xs text-destructive mt-1">
									{fieldErrors.password}
								</p>
							)}
						</>
					) : (
						<PasswordStrength
							label="Password"
							id="password"
							name="password"
							required
							autoComplete="new-password"
							value={form.password}
							onChange={handleChange}
							onBlur={handleBlur}
							onFocus={handleFocus}
							placeholder="Create a secure password"
							className={cn(
								'h-[var(--spacing-11)]',
								fieldErrors.password && touchedFields.password
									? 'border-destructive focus:ring-destructive'
									: ''
							)}
							showStrengthIndicator={true}
							minLength={8}
						/>
					)}
					{!isLogin && fieldErrors.password && touchedFields.password && (
						<p className="text-xs text-destructive mt-1">
							{fieldErrors.password}
						</p>
					)}
				</div>

				{!isLogin && (
					<div>
						<Label htmlFor="confirmPassword">Confirm password</Label>
						<div className="relative">
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								required
								autoComplete="new-password"
								value={form.confirmPassword}
								onChange={handleChange}
								onBlur={handleBlur}
								onFocus={handleFocus}
								placeholder="Re-enter your password"
								className={cn(
									'h-[var(--spacing-11)] pr-[var(--spacing-12)]',
									fieldErrors.confirmPassword && touchedFields.confirmPassword
										? 'border-destructive focus:ring-destructive'
										: validFields.confirmPassword &&
											  touchedFields.confirmPassword &&
											  form.confirmPassword
											? 'border-[var(--color-system-green)] focus:ring-[var(--color-system-green)]'
											: ''
								)}
							/>
							{validFields.confirmPassword &&
								touchedFields.confirmPassword &&
								form.confirmPassword && (
									<Check className="absolute right-[var(--spacing-12)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--color-system-green)]" />
								)}
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								tabIndex={-1}
								aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
							>
								{showConfirmPassword ? (
									<EyeOff className="h-[var(--spacing-4)] w-[var(--spacing-4)]" />
								) : (
									<Eye className="h-[var(--spacing-4)] w-[var(--spacing-4)]" />
								)}
							</button>
						</div>
						{fieldErrors.confirmPassword && touchedFields.confirmPassword && (
							<p className="text-xs text-destructive mt-1">
								{fieldErrors.confirmPassword}
							</p>
						)}
					</div>
				)}

				<div className="space-y-4 pt-3">
					<Button
						type="submit"
						className="w-full h-[var(--spacing-11)] text-sm font-medium"
						disabled={isLoading}
					>
						{isLoading
							? 'Please wait…'
							: isLogin
								? 'Sign In'
								: 'Create Account'}
					</Button>

					{isLogin && (
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t border-border/60" />
							</div>
							<div className="relative flex justify-center text-xs">
								<span className="bg-background px-[var(--spacing-3)] text-muted-foreground/70">
									or continue with
								</span>
							</div>
						</div>
					)}

					{isLogin && (
						<button
							type="button"
							onClick={onGoogleLogin}
							disabled={isGoogleLoading}
							className="w-full h-[var(--spacing-11)] flex items-center justify-center gap-[var(--spacing-3)] px-[var(--spacing-4)] bg-background border border-border rounded-[var(--radius-large)] text-foreground font-medium hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[var(--duration-200)] text-sm"
							aria-label="Sign in with Google"
						>
							{!isGoogleLoading && (
								<svg className="w-[var(--spacing-5)] h-[var(--spacing-5)]" viewBox="0 0 24 24">
									<path
										fill="var(--color-system-blue)"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="var(--color-system-green)"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="var(--color-system-yellow)"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="var(--color-system-red)"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
							)}
							{isGoogleLoading ? (
								<>
									<svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
										<circle
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
											className="opacity-25"
										/>
										<path
											fill="currentColor"
											className="opacity-75"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Connecting…
								</>
							) : (
								'Continue with Google'
							)}
						</button>
					)}
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<button
							type="button"
							onClick={onForgotPassword}
							className="hover:text-foreground"
						>
							Forgot password?
						</button>
						{isLogin ? (
							<button
								type="button"
								onClick={onSignUp}
								className="hover:text-foreground"
							>
								Create account
							</button>
						) : (
							<a href="/auth/login" className="hover:text-foreground">
								Have an account? Sign in
							</a>
						)}
					</div>
				</div>
			</form>
		</div>
	)
}

export default LoginForm
