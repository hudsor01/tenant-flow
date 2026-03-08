'use client'

import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { getFieldErrorMessage } from '#lib/utils/form'
import { loginZodSchema } from '#lib/validation/auth'
import { useForm } from '@tanstack/react-form'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useState } from 'react'

interface LoginFormProps {
	authError: string | null
	isSubmitting: boolean
	onSubmit: (values: { email: string; password: string }) => Promise<void>
	onForgotPassword: () => void
	onCreateAccount: () => void
}

export function LoginForm({
	authError,
	isSubmitting,
	onSubmit,
	onForgotPassword,
	onCreateAccount
}: LoginFormProps) {
	const [showPassword, setShowPassword] = useState(false)

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: { onSubmit: loginZodSchema },
		onSubmit: async ({ value }) => {
			await onSubmit(value)
		}
	})

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className="space-y-5"
		>
			{authError && (
				<div
					data-testid="auth-error"
					className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive"
				>
					<span className="font-medium">Sign in failed:</span> {authError}
				</div>
			)}

			{/* Email Field */}
			<form.Field name="email">
				{field => (
					<Field>
						<FieldLabel htmlFor="email">Email address</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Mail />
							</InputGroupAddon>
							<InputGroupInput
								id="email"
								data-testid="email-input"
								type="email"
								placeholder="Enter your email"
								autoComplete="email"
								autoFocus
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting || form.state.isSubmitting}
								aria-invalid={field.state.meta.errors.length > 0}
							/>
						</InputGroup>
						<FieldError>
							{field.state.meta.errors.length
								? getFieldErrorMessage(field.state.meta.errors)
								: null}
						</FieldError>
					</Field>
				)}
			</form.Field>

			{/* Password Field */}
			<form.Field name="password">
				{field => (
					<Field>
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="password"
								data-testid="password-input"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								autoComplete="current-password"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting || form.state.isSubmitting}
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							<InputGroupAddon align="inline-end">
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="text-muted-foreground hover:text-foreground transition-colors"
									tabIndex={-1}
								>
									{showPassword ? <EyeOff /> : <Eye />}
									<span className="sr-only">
										{showPassword ? 'Hide' : 'Show'} password
									</span>
								</button>
							</InputGroupAddon>
						</InputGroup>
						<FieldError>
							{field.state.meta.errors.length
								? getFieldErrorMessage(field.state.meta.errors)
								: null}
						</FieldError>
					</Field>
				)}
			</form.Field>

			{/* Submit Button */}
			<Button
				type="submit"
				data-testid="login-button"
				className="w-full h-11 typography-small"
				disabled={isSubmitting || form.state.isSubmitting}
			>
				{isSubmitting || form.state.isSubmitting
					? 'Signing in...'
					: 'Sign In'}
			</Button>

			{/* Footer Links */}
			<div className="flex-between text-muted-foreground">
				<button
					type="button"
					onClick={onForgotPassword}
					className="hover:text-foreground transition-colors"
					data-testid="forgot-password-link"
				>
					Forgot password?
				</button>
				<button
					type="button"
					onClick={onCreateAccount}
					className="hover:text-foreground transition-colors"
					data-testid="signup-link"
				>
					Create account
				</button>
			</div>
		</form>
	)
}
