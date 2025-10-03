'use client'

import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel
} from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { useFormProgress } from '@/hooks/use-form-progress'
import { cn } from '@/lib/design-system'
import type { AuthFormProps } from '@repo/shared/types/frontend'
import { signupFormSchema } from '@repo/shared/validation/auth'
import { useForm } from '@tanstack/react-form'
import { Briefcase, Eye, EyeOff, Mail, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
				const firstError = result.error.issues[0]
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
							<Field>
								<FieldLabel htmlFor="firstName">First name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User />
									</InputGroupAddon>
									<InputGroupInput
										id="firstName"
										data-testid="name-input"
										placeholder="John"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={isLoading}
										aria-invalid={
											field.state.meta.errors?.length ? 'true' : undefined
										}
									/>
								</InputGroup>
								<FieldError
									errors={field.state.meta.errors?.map(err => ({
										message: String(err)
									}))}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="lastName">
						{field => (
							<Field>
								<FieldLabel htmlFor="lastName">Last name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User />
									</InputGroupAddon>
									<InputGroupInput
										id="lastName"
										placeholder="Doe"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={isLoading}
										aria-invalid={
											field.state.meta.errors?.length ? 'true' : undefined
										}
									/>
								</InputGroup>
								<FieldError
									errors={field.state.meta.errors?.map(err => ({
										message: String(err)
									}))}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				{/* Company Field */}
				<form.Field name="company">
					{field => (
						<Field>
							<FieldLabel htmlFor="company">Company</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Briefcase />
								</InputGroupAddon>
								<InputGroupInput
									id="company"
									placeholder="Your company name"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={isLoading}
									aria-invalid={
										field.state.meta.errors?.length ? 'true' : undefined
									}
								/>
							</InputGroup>
							<FieldError
								errors={field.state.meta.errors?.map(err => ({
									message: String(err)
								}))}
							/>
						</Field>
					)}
				</form.Field>

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
									placeholder="john@example.com"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={isLoading}
									aria-invalid={
										field.state.meta.errors?.length ? 'true' : undefined
									}
								/>
							</InputGroup>
							<FieldError
								errors={field.state.meta.errors?.map(err => ({
									message: String(err)
								}))}
							/>
							{!field.state.meta.errors?.length && (
								<FieldDescription>
									We'll use this to send you important updates
								</FieldDescription>
							)}
						</Field>
					)}
				</form.Field>

				{/* Password Field */}
				<form.Field name="password">
					{field => (
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<PasswordStrength
								id="password"
								data-testid="password-input"
								placeholder="Create a secure password"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								disabled={isLoading}
								showStrengthIndicator={true}
								minLength={8}
							/>
							<FieldError
								errors={field.state.meta.errors?.map(err => ({
									message: String(err)
								}))}
							/>
						</Field>
					)}
				</form.Field>

				{/* Confirm Password Field */}
				<form.Field name="confirmPassword">
					{field => (
						<Field>
							<FieldLabel htmlFor="confirmPassword">
								Confirm password
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									data-testid="confirm-password-input"
									placeholder="Re-enter your password"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={isLoading}
									aria-invalid={
										field.state.meta.errors?.length ? 'true' : undefined
									}
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										className="text-muted-foreground hover:text-foreground focus:text-primary transition-colors"
										tabIndex={-1}
									>
										{showConfirmPassword ? <EyeOff /> : <Eye />}
										<span className="sr-only">
											{showConfirmPassword ? 'Hide password' : 'Show password'}
										</span>
									</button>
								</InputGroupAddon>
							</InputGroup>
							<FieldError
								errors={field.state.meta.errors?.map(err => ({
									message: String(err)
								}))}
							/>
						</Field>
					)}
				</form.Field>

				{/* Actions Section */}
				<div className="space-y-4 pt-3">
					<Button
						type="submit"
						data-testid="signup-button"
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
