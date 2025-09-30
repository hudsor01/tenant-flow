'use client'

import { GoogleButton } from '@/components/auth/google-button'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormProgress } from '@/hooks/use-form-progress'
import { cn } from '@/lib/design-system'
import { loginZodSchema } from '@repo/shared/validation/auth'
import type { AuthFormProps } from '@repo/shared/types/frontend'
import { useForm } from '@tanstack/react-form'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function LoginForm({
	className,
	onSubmit,
	onForgotPassword,
	onSignUp,
	onGoogleLogin,
	isLoading,
	isGoogleLoading
}: Omit<AuthFormProps, 'mode' | 'onLogin'>) {
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
			try {
				await onSubmit?.(value)
				// Clear progress on successful login
				clearProgress()
			} catch (error) {
				toast.error('Sign in failed', {
					description:
						error instanceof Error ? error.message : 'Please try again'
				})
			}
		},
		validators: {
			onChange: loginZodSchema
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
				{/* Email Field */}
				<form.Field name="email">
					{field => (
						<div className="space-y-2">
							<Label htmlFor="email">Email address</Label>
							<Input
								id="email"
								data-testid="email-input"
								type="email"
								placeholder="Enter your email"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								disabled={isLoading}
								className={cn(
									'h-11',
									field.state.meta.errors?.length
										? 'border-destructive focus:ring-destructive'
										: ''
								)}
							/>
							{field.state.meta.errors?.length ? (
								<p className="text-xs text-destructive">
									{String(field.state.meta.errors[0])}
								</p>
							) : null}
						</div>
					)}
				</form.Field>

				{/* Password Field */}
				<form.Field name="password">
					{field => (
						<div className="space-y-2">
							<PasswordInput
								label="Password"
								id="password"
								data-testid="password-input"
								placeholder="Enter your password"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								disabled={isLoading}
								className={cn(
									'h-11',
									field.state.meta.errors?.length
										? 'border-destructive focus:ring-destructive'
										: ''
								)}
							/>
							{field.state.meta.errors?.length ? (
								<p className="text-xs text-destructive">
									{String(field.state.meta.errors[0])}
								</p>
							) : null}
						</div>
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
							isLoading={isGoogleLoading}
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
