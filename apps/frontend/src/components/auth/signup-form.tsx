'use client'

import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormProgress } from '@/hooks/use-form-progress'
import { cn } from '@/lib/design-system'
import { type AuthFormProps } from '@repo/shared'
import { useForm } from '@tanstack/react-form'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

// Extended signup schema with all required fields
const signupFormSchema = z
	.object({
		firstName: z.string().min(1, 'First name is required'),
		lastName: z.string().min(1, 'Last name is required'),
		company: z.string().min(1, 'Company name is required'),
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				'Password must contain uppercase, lowercase, and number'
			),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

export function SignupForm({
	className,
	onSubmit,
	isLoading
}: Pick<AuthFormProps, 'className' | 'onSubmit' | 'isLoading'>) {
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	// Form progress persistence (only saves safe data - no passwords)
	const {
		data: progressData,
		saveProgress,
		clearProgress,
		isLoading: progressLoading
	} = useFormProgress('signup')

	const form = useForm({
		defaultValues: {
			firstName: progressData?.firstName || '',
			lastName: progressData?.lastName || '',
			company: progressData?.company || '',
			email: progressData?.email || '',
			password: '',
			confirmPassword: ''
		},
		onSubmit: async ({ value }) => {
			// Validate the form data against our schema
			const result = signupFormSchema.safeParse(value)
			if (!result.success) {
				const firstError = result.error.issues[0] // Use .issues not .errors for Zod
				toast.error('Validation failed', {
					description: firstError?.message || 'Please check your input'
				})
				return
			}

			try {
				await onSubmit?.(value)
				// Clear progress on successful signup
				clearProgress()
			} catch (error) {
				toast.error('Sign up failed', {
					description:
						error instanceof Error ? error.message : 'Please try again'
				})
			}
		}
	})

	// Auto-save progress when form fields change (excluding passwords)
	useEffect(() => {
		const values = form.state.values
		if (values.firstName || values.lastName || values.company || values.email) {
			const safeData = {
				firstName: values.firstName,
				lastName: values.lastName,
				company: values.company,
				email: values.email
			}
			saveProgress(safeData)
		}
	}, [form.state.values, saveProgress])

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
						Welcome back! Your progress has been restored.
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
				{/* Name Fields */}
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="firstName">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="firstName">First name</Label>
								<Input
									id="firstName"
									placeholder="John"
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

					<form.Field name="lastName">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="lastName">Last name</Label>
								<Input
									id="lastName"
									placeholder="Doe"
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
				</div>

				{/* Company Field */}
				<form.Field name="company">
					{field => (
						<div className="space-y-2">
							<Label htmlFor="company">Company</Label>
							<Input
								id="company"
								placeholder="Your company name"
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
							{field.state.meta.errors?.length > 0 && (
								<p className="text-xs text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Email Field */}
				<form.Field name="email">
					{field => (
						<div className="space-y-2">
							<Label htmlFor="email">Email address</Label>
							<Input
								id="email"
								type="email"
								placeholder="john@example.com"
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
							{field.state.meta.errors?.length > 0 && (
								<p className="text-xs text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
							{!field.state.meta.errors?.length && (
								<p className="text-xs text-muted-foreground">
									We'll use this to send you important updates
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Password Field */}
				<form.Field name="password">
					{field => (
						<div className="space-y-2">
							<PasswordStrength
								label="Password"
								id="password"
								placeholder="Create a secure password"
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
								showStrengthIndicator={true}
								minLength={8}
							/>
							{field.state.meta.errors?.length > 0 && (
								<p className="text-xs text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Confirm Password Field */}
				<form.Field name="confirmPassword">
					{field => (
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm password</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									placeholder="Re-enter your password"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={isLoading}
									className={cn(
										'h-11 pr-12',
										field.state.meta.errors?.length
											? 'border-destructive focus:ring-destructive'
											: ''
									)}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									tabIndex={-1}
								>
									{showConfirmPassword ? (
										<EyeOffIcon className="h-4 w-4" />
									) : (
										<EyeIcon className="h-4 w-4" />
									)}
								</button>
							</div>
							{field.state.meta.errors?.length > 0 && (
								<p className="text-xs text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Actions Section */}
				<div className="space-y-4 pt-3">
					<Button
						type="submit"
						className="w-full h-11 text-sm font-medium"
						disabled={isLoading || form.state.isSubmitting}
					>
						{isLoading || form.state.isSubmitting
							? 'Creating account...'
							: 'Create Account'}
					</Button>

					<div className="text-center text-sm text-muted-foreground">
						Already have an account?{' '}
						<a
							href="/login"
							className="font-medium text-foreground hover:underline"
						>
							Sign in
						</a>
					</div>
				</div>
			</form>
		</div>
	)
}

export default SignupForm
