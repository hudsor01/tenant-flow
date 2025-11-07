'use client'

import { GoogleButton } from '#components/auth/google-button'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { useFormProgress } from '#hooks/use-form-progress'
import { cn } from '#lib/design-system'
import type { AuthFormProps } from '@repo/shared/types/frontend'
import { loginZodSchema } from '@repo/shared/validation/auth'
import { useForm } from '@tanstack/react-form'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Helper function to extract field error message
function getFieldErrorMessage(errors: unknown[] | undefined): string {
	if (!errors?.[0]) return ''
	return typeof errors[0] === 'string'
		? errors[0]
		: (errors[0] as { message?: string })?.message || ''
}

export function LoginForm({
	className,
	onSubmit,
	onForgotPassword,
	onSignUp,
	onGoogleLogin,
	isLoading,
	isGoogleLoading
}: Omit<AuthFormProps, 'mode' | 'onLogin'>) {
	const [showPassword, setShowPassword] = useState(false)
	const [authError, setAuthError] = useState<string | null>(null)

	// Form progress persistence (only saves email - no passwords)
	const {
		data: progressData,
		saveProgress,
		clearProgress,
		isLoading: progressLoading
	} = useFormProgress('login')

	const form = useForm({
		defaultValues: {
			email: progressData?.email || '',
			password: ''
		},
		onSubmit: async ({ value }) => {
			setAuthError(null)
			try {
				await onSubmit?.(value)
				clearProgress()
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Please try again'
				setAuthError(message)
				toast.error('Sign in failed', {
					description: message
				})
			}
		},
		validators: {
			onBlur: loginZodSchema
		}
	})

	// Auto-save progress when email changes (exclude password)
	useEffect(() => {
		const email = form.state.values.email
		if (email) {
			saveProgress({ email })
		}
	}, [form.state.values.email, saveProgress])

	return (
		<div className={cn('w-full', className)}>
			{/* Progress restoration indicator */}
			{progressLoading && (
				<div className="mb-4 p-3 bg-muted rounded-md">
					<p className="text-sm text-muted-foreground">
						Restoring your progress...
					</p>
				</div>
			)}

			{progressData && !progressLoading && (
				<div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
					<p className="text-sm text-primary">
						Welcome back! Your email has been restored.
					</p>
				</div>
			)}

			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-5"
			>
				{authError && (
					<div
						role="alert"
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
									name="email"
									data-testid="email-input"
									type="email"
									placeholder="Enter your email"
									autoComplete="email"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									disabled={isLoading}
									aria-invalid={
										field.state.meta.errors?.length ? 'true' : undefined
									}
								/>
							</InputGroup>
							<FieldError>
							{getFieldErrorMessage(field.state.meta.errors) || 'Invalid email address'}
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
									name="password"
									data-testid="password-input"
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter your password"
									autoComplete="current-password"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									disabled={isLoading}
									aria-invalid={
										field.state.meta.errors?.length ? 'true' : undefined
									}
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="text-muted-foreground hover:text-foreground focus:text-primary transition-colors"
										tabIndex={-1}
									>
										{showPassword ? <EyeOff /> : <Eye />}
										<span className="sr-only">
											{showPassword ? 'Hide password' : 'Show password'}
										</span>
									</button>
								</InputGroupAddon>
							</InputGroup>
							<FieldError>
							{getFieldErrorMessage(field.state.meta.errors) || 'Password is required'}
						</FieldError>
						</Field>
					)}
				</form.Field>

				{/* Actions Section */}
				<div className="space-y-4 pt-3">
					{/* Submit Button */}
					<Button
						type="submit"
						data-testid="login-button"
						className="w-full h-11 text-sm font-medium"
						disabled={isLoading || form.state.isSubmitting}
					>
						{isLoading || form.state.isSubmitting ? 'Signing in...' : 'Sign In'}
					</Button>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t border-border/60" />
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="bg-background px-3 text-muted-foreground">
								or continue with
							</span>
						</div>
					</div>

					{/* Google OAuth Button */}
					{onGoogleLogin && (
						<GoogleButton
							onClick={onGoogleLogin}
							{...(isGoogleLoading !== undefined
								? { isLoading: isGoogleLoading }
								: {})}
							mode="login"
							className="w-full"
						/>
					)}

					{/* Footer Links */}
					<div className="flex items-center justify-between text-sm text-muted-foreground">
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
							onClick={onSignUp}
							className="hover:text-foreground transition-colors"
							data-testid="signup-link"
						>
							Create account
						</button>
					</div>
				</div>
			</form>
		</div>
	)
}

export default LoginForm
