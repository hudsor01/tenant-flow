'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  cn,
  buttonClasses,
  inputClasses,
  ANIMATION_DURATIONS
} from '@/lib/utils'
import { emailSchema, requiredString, supabaseClient } from '@repo/shared'
import { useForm } from '@tanstack/react-form'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

// Native Zod validation schemas - no helper layers
const loginSchema = z.object({
	email: emailSchema,
	password: requiredString.min(8, 'Password must be at least 8 characters')
})

const signupSchema = z
	.object({
		firstName: requiredString.min(
			2,
			'First name must be at least 2 characters'
		),
		lastName: requiredString.min(2, 'Last name must be at least 2 characters'),
		company: requiredString.min(2, 'Company name is required'),
		email: emailSchema,
		password: requiredString
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
				'Password must contain uppercase, lowercase, number and special character'
			),
		confirmPassword: requiredString,
		terms: z
			.boolean()
			.refine(val => val === true, 'You must accept the terms and conditions')
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>

interface AuthFormProps extends React.ComponentProps<'div'> {
	mode?: 'login' | 'signup'
}

export function LoginForm({
	className,
	mode = 'login',
	...props
}: AuthFormProps) {
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const isLogin = mode === 'login'

	// TanStack Form with native Zod validation - no adapters or helpers
	const form = useForm({
		defaultValues: isLogin
			? { email: '', password: '' }
			: {
					firstName: '',
					lastName: '',
					company: '',
					email: '',
					password: '',
					confirmPassword: '',
					terms: false
				},
		onSubmit: async ({ value }) => {
			setError(null)

			try {
				if (isLogin) {
					const loginData = value as LoginFormData
					const { error } = await supabaseClient.auth.signInWithPassword({
						email: loginData.email,
						password: loginData.password
					})
					if (error) throw error
				} else {
					const signupData = value as SignupFormData
					const { error } = await supabaseClient.auth.signUp({
						email: signupData.email,
						password: signupData.password,
						options: {
							data: {
								first_name: signupData.firstName,
								last_name: signupData.lastName,
								full_name: `${signupData.firstName} ${signupData.lastName}`,
								company: signupData.company
							}
						}
					})
					if (error) throw error

					setError('Please check your email to confirm your account.')
				}
			} catch (error: unknown) {
				setError(error instanceof Error ? error.message : 'An error occurred')
			}
		},
		validators: {
			// Native Zod validation without adapters
			onChange: ({ value }) => {
				const schema = isLogin ? loginSchema : signupSchema
				const result = schema.safeParse(value)
				return result.success ? undefined : result.error.format()
			}
		}
	})

	const handleGoogleAuth = async () => {
		setIsGoogleLoading(true)
		setError(null)

		try {
			const { error } = await supabaseClient.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/dashboard`
				}
			})
			if (error) throw error
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'An error occurred')
			setIsGoogleLoading(false)
		}
	}

	return (
		<div 
			className={cn('flex flex-col gap-8 max-w-md mx-auto', className)} 
			style={{ 
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
			}}
			{...props}
		>

			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				<div className="space-y-5">
					{/* Name fields for signup */}
					{!isLogin && (
						<div 
							className="grid grid-cols-2 gap-4"
							style={{ 
								animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
							}}
						>
							<form.Field name="firstName">
								{field => (
									<div className="space-y-2">
										<Label 
											htmlFor="firstName"
											className="text-sm font-medium text-foreground"
										>
											First name
										</Label>
										<Input
											id="firstName"
											placeholder="John"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={form.state.isSubmitting}
											className={cn(
												inputClasses('default'),
												field.state.meta.errors.length > 0 && field.state.meta.isTouched
													? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
													: 'focus:border-primary focus:ring-primary/20'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										{field.state.meta.errors.length > 0 &&
											field.state.meta.isTouched && (
												<div 
													className="flex items-center gap-2 text-sm text-red-600"
													style={{ 
														animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
													}}
												>
													<AlertCircle className="h-4 w-4" />
													{field.state.meta.errors[0]}
												</div>
											)}
									</div>
								)}
							</form.Field>
							<form.Field name="lastName">
								{field => (
									<div className="space-y-2">
										<Label 
											htmlFor="lastName"
											className="text-sm font-medium text-foreground"
										>
											Last name
										</Label>
										<Input
											id="lastName"
											placeholder="Doe"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={form.state.isSubmitting}
											className={cn(
												inputClasses('default'),
												field.state.meta.errors.length > 0 && field.state.meta.isTouched
													? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
													: 'focus:border-primary focus:ring-primary/20'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										{field.state.meta.errors.length > 0 &&
											field.state.meta.isTouched && (
												<div 
													className="flex items-center gap-2 text-sm text-red-600"
													style={{ 
														animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
													}}
												>
													<AlertCircle className="h-4 w-4" />
													{field.state.meta.errors[0]}
												</div>
											)}
									</div>
								)}
							</form.Field>
						</div>
					)}

					{/* Company field for signup */}
					{!isLogin && (
						<form.Field name="company">
							{field => (
								<div 
									className="space-y-2"
									style={{ 
										animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
									}}
								>
									<Label 
										htmlFor="company"
										className="text-sm font-medium text-foreground"
									>
										Company
									</Label>
									<Input
										id="company"
										placeholder="Acme Properties LLC"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={form.state.isSubmitting}
										className={cn(
											inputClasses('default'),
											field.state.meta.errors.length > 0 && field.state.meta.isTouched
												? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
												: 'focus:border-primary focus:ring-primary/20'
										)}
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
										}}
									/>
									{field.state.meta.errors.length > 0 &&
										field.state.meta.isTouched && (
											<div 
												className="flex items-center gap-2 text-sm text-red-600"
												style={{ 
													animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												<AlertCircle className="h-4 w-4" />
												{field.state.meta.errors[0]}
											</div>
										)}
								</div>
							)}
						</form.Field>
					)}

					<form.Field name="email">
						{field => (
							<div 
								className="space-y-2"
								style={{ 
									animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`,
								}}
							>
								<Label 
									htmlFor="email"
									className="text-sm font-medium text-foreground"
								>
									Email address
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="john@company.com"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={form.state.isSubmitting}
									className={cn(
										inputClasses('default'),
										field.state.meta.errors.length > 0 && field.state.meta.isTouched
											? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
											: 'focus:border-primary focus:ring-primary/20'
									)}
									style={{
										transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
									}}
								/>
								{field.state.meta.errors.length > 0 &&
									field.state.meta.isTouched && (
										<div 
											className="flex items-center gap-2 text-sm text-red-600"
											style={{ 
												animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										>
											<AlertCircle className="h-4 w-4" />
											{field.state.meta.errors[0]}
										</div>
									)}
							</div>
						)}
					</form.Field>

					<form.Field name="password">
						{field => (
							<div 
								className="space-y-2"
								style={{ 
									animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
								}}
							>
								<div className="flex items-center justify-between">
									<Label 
										htmlFor="password"
										className="text-sm font-medium text-foreground"
									>
										Password
									</Label>
									{isLogin && (
										<button
											type="button"
											className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
											style={{
												transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										>
											Forgot password?
										</button>
									)}
								</div>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? 'text' : 'password'}
										placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={form.state.isSubmitting}
										className={cn(
											inputClasses('default'),
											'pr-10',
											field.state.meta.errors.length > 0 && field.state.meta.isTouched
												? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
												: 'focus:border-primary focus:ring-primary/20'
										)}
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
										}}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										style={{
											transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
										}}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
								{field.state.meta.errors.length > 0 &&
									field.state.meta.isTouched && (
										<div 
											className="flex items-center gap-2 text-sm text-red-600"
											style={{ 
												animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										>
											<AlertCircle className="h-4 w-4" />
											{field.state.meta.errors[0]}
										</div>
									)}
								{!isLogin && (
									<p className="text-xs text-muted-foreground leading-relaxed">
										Must be at least 8 characters with uppercase, lowercase,
										number and special character
									</p>
								)}
							</div>
						)}
					</form.Field>

					{/* Confirm password for signup */}
					{!isLogin && (
						<form.Field name="confirmPassword">
							{field => (
								<div 
									className="space-y-2"
									style={{ 
										animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`,
									}}
								>
									<Label 
										htmlFor="confirmPassword"
										className="text-sm font-medium text-foreground"
									>
										Confirm password
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											type={showConfirmPassword ? 'text' : 'password'}
											placeholder="Confirm your password"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={form.state.isSubmitting}
											className={cn(
												inputClasses('default'),
												'pr-10',
												field.state.meta.errors.length > 0 && field.state.meta.isTouched
													? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
													: 'focus:border-primary focus:ring-primary/20'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword(!showConfirmPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
											style={{
												transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										>
											{showConfirmPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
									{field.state.meta.errors.length > 0 &&
										field.state.meta.isTouched && (
											<div 
												className="flex items-center gap-2 text-sm text-red-600"
												style={{ 
													animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												<AlertCircle className="h-4 w-4" />
												{field.state.meta.errors[0]}
											</div>
										)}
								</div>
							)}
						</form.Field>
					)}

					{/* Terms checkbox for signup */}
					{!isLogin && (
						<form.Field name="terms">
							{field => (
								<div 
									className="space-y-3"
									style={{ 
										animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
									}}
								>
									<div className="flex items-start gap-3">
										<input
											id="terms"
											type="checkbox"
											checked={field.state.value}
											onChange={e => field.handleChange(e.target.checked)}
											onBlur={field.handleBlur}
											className="mt-0.5 h-4 w-4 rounded border-2 border-input bg-background text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 transition-colors"
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										<label
											htmlFor="terms"
											className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
										>
											I agree to the{' '}
											<a
												href="#"
												className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
												style={{
													transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												Terms of Service
											</a>{' '}
											and{' '}
											<a
												href="#"
												className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
												style={{
													transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												Privacy Policy
											</a>
										</label>
									</div>
									{field.state.meta.errors.length > 0 &&
										field.state.meta.isTouched && (
											<div 
												className="flex items-center gap-2 text-sm text-red-600"
												style={{ 
													animation: `fadeIn ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												<AlertCircle className="h-4 w-4" />
												{field.state.meta.errors[0]}
											</div>
										)}
								</div>
							)}
						</form.Field>
					)}

					{/* Error display */}
					{error && (
						<div
							className={cn(
								'flex items-center gap-3 text-sm p-4 rounded-lg border-2',
								error.includes('check your email')
									? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
									: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
							)}
							style={{ 
								animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
							}}
						>
							{error.includes('check your email') ? (
								<CheckCircle className="h-5 w-5 flex-shrink-0" />
							) : (
								<AlertCircle className="h-5 w-5 flex-shrink-0" />
							)}
							<span className="font-medium leading-relaxed">{error}</span>
						</div>
					)}

					<Button
						type="submit"
						className={cn(
							buttonClasses('primary', 'default'),
							'w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl',
						)}
						disabled={form.state.isSubmitting}
						style={{
							transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
							transform: form.state.isSubmitting ? 'scale(0.98)' : 'scale(1)',
						}}
					>
						{form.state.isSubmitting ? (
							<div className="flex items-center gap-3">
								<Loader2 
									className="w-5 h-5 animate-spin" 
									style={{
										animation: `spin 1s linear infinite`,
									}}
								/>
								<span>{isLogin ? 'Signing you in...' : 'Creating your account...'}</span>
							</div>
						) : (
							<span className="flex items-center justify-center gap-2">
								{isLogin ? 'Sign In' : 'Create Account'}
							</span>
						)}
					</Button>

					<div 
						className="relative flex items-center justify-center py-4"
						style={{ 
							animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
						}}
					>
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-background px-4 text-muted-foreground font-medium">
								Or continue with
							</span>
						</div>
					</div>

					<Button
						type="button"
						variant="outline"
						className={cn(
							buttonClasses('outline', 'default'),
							'w-full h-12 text-base font-medium border-2 hover:bg-muted/50',
						)}
						onClick={handleGoogleAuth}
						disabled={isGoogleLoading || form.state.isSubmitting}
						style={{
							transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
							transform: isGoogleLoading ? 'scale(0.98)' : 'scale(1)',
						}}
					>
						{isGoogleLoading ? (
							<div className="flex items-center gap-3">
								<Loader2 
									className="w-5 h-5 animate-spin" 
									style={{
										animation: `spin 1s linear infinite`,
									}}
								/>
								<span>
									{isLogin ? 'Signing you in...' : 'Creating your account...'}
								</span>
							</div>
						) : (
							<div className="flex items-center gap-3">
								<svg className="w-5 h-5" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
								<span>Continue with Google</span>
							</div>
						)}
					</Button>
				</div>
			</form>

			<div 
				className="text-center text-sm"
				style={{ 
					animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				}}
			>
				<p className="text-muted-foreground">
					{isLogin ? (
						<>
							Don&apos;t have an account?{' '}
							<a
								href="/signup"
								className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
								style={{
									transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
								}}
							>
								Create account
							</a>
						</>
					) : (
						<>
							Already have an account?{' '}
							<a
								href="/login"
								className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
								style={{
									transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
								}}
							>
								Sign in
							</a>
						</>
					)}
				</p>
			</div>
		</div>
	)
}
