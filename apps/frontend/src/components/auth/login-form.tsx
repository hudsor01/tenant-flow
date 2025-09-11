'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  cn,
  buttonClasses,
  inputClasses,
  cardClasses,
  formFieldClasses,
  formLabelClasses,
  formErrorClasses,
  animationClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { emailSchema, requiredString, supabaseClient } from '@repo/shared'
import { useForm } from '@tanstack/react-form'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Shield, Lock, Mail, User, Building } from 'lucide-react'
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
			{/* Trust Header with Security Indicators */}
			<div 
				className={cn(
					cardClasses('elevated'),
					animationClasses('slide-down'),
					'p-6 text-center space-y-4 border-2 bg-gradient-to-br from-card to-card/50'
				)}
			>
				<div className="flex items-center justify-center gap-2 text-primary">
					<Shield className="w-5 h-5" />
					<span 
						className="font-semibold"
						style={{
							fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
							fontWeight: TYPOGRAPHY_SCALE['body-sm'].fontWeight
						}}
					>
						Secure Authentication
					</span>
				</div>
				<h1 
					className="font-bold tracking-tight text-foreground"
					style={{
						fontSize: TYPOGRAPHY_SCALE['display-xl'].fontSize,
						lineHeight: TYPOGRAPHY_SCALE['display-xl'].lineHeight,
						letterSpacing: TYPOGRAPHY_SCALE['display-xl'].letterSpacing,
						fontWeight: TYPOGRAPHY_SCALE['display-xl'].fontWeight
					}}
				>
					{isLogin ? 'Welcome back' : 'Create your account'}
				</h1>
				<p 
					className="text-muted-foreground leading-relaxed max-w-sm mx-auto"
					style={{
						fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
						lineHeight: TYPOGRAPHY_SCALE['body-md'].lineHeight
					}}
				>
					{isLogin 
						? 'Sign in to access your property management dashboard' 
						: 'Join thousands of property managers using TenantFlow'
					}
				</p>
			</div>

			{/* Main Form Container */}
			<div 
				className={cn(
					cardClasses('elevated'),
					animationClasses('fade-in'),
					'border-2 shadow-xl bg-gradient-to-br from-card to-card/80'
				)}
			>
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="p-8 space-y-8"
				>
				<div className="space-y-6">
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
									<div className={cn(formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched))}>
										<Label 
											htmlFor="firstName"
											className={cn(
												formLabelClasses(true),
												"flex items-center gap-2"
											)}
										>
											<User className="w-4 h-4 text-primary" />
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
												inputClasses(
													field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
													'default'
												),
												'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										{field.state.meta.errors.length > 0 &&
											field.state.meta.isTouched && (
												<div 
													className={cn(
														formErrorClasses(),
														animationClasses('slide-down'),
														"flex items-center gap-2"
													)}
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
									<div className={cn(formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched))}>
										<Label 
											htmlFor="lastName"
											className={cn(
												formLabelClasses(true),
												"flex items-center gap-2"
											)}
										>
											<User className="w-4 h-4 text-primary" />
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
												inputClasses(
													field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
													'default'
												),
												'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										{field.state.meta.errors.length > 0 &&
											field.state.meta.isTouched && (
												<div 
													className={cn(
														formErrorClasses(),
														animationClasses('slide-down'),
														"flex items-center gap-2"
													)}
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
									className={cn(
										formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched),
										animationClasses('slide-up')
									)}
								>
									<Label 
										htmlFor="company"
										className={cn(
											formLabelClasses(true),
											"flex items-center gap-2"
										)}
									>
										<Building className="w-4 h-4 text-primary" />
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
											inputClasses(
												field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
												'default'
											),
											'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
										)}
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
										}}
									/>
									{field.state.meta.errors.length > 0 &&
										field.state.meta.isTouched && (
											<div 
												className={cn(
													formErrorClasses(),
													animationClasses('slide-down'),
													"flex items-center gap-2"
												)}
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
								className={cn(
									formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched),
									animationClasses('slide-up')
								)}
							>
								<Label 
									htmlFor="email"
									className={cn(
										formLabelClasses(true),
										"flex items-center gap-2"
									)}
								>
									<Mail className="w-4 h-4 text-primary" />
									Email address
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="john@company.com"
									autoComplete="email"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={form.state.isSubmitting}
									className={cn(
										inputClasses(
											field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
											'default'
										),
										'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
									)}
									style={{
										transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
									}}
								/>
								{field.state.meta.errors.length > 0 &&
									field.state.meta.isTouched && (
										<div 
											className={cn(
												formErrorClasses(),
												animationClasses('slide-down'),
												"flex items-center gap-2"
											)}
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
								className={cn(
									formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched),
									animationClasses('slide-up')
								)}
							>
								<div className="flex items-center justify-between">
									<Label 
										htmlFor="password"
										className={cn(
											formLabelClasses(true),
											"flex items-center gap-2"
										)}
									>
										<Lock className="w-4 h-4 text-primary" />
										Password
									</Label>
									{isLogin && (
										<a
											href="/auth/forgot-password"
											className={cn(
												"text-sm text-primary hover:text-primary/80 font-medium transition-colors",
												"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
											)}
											style={{
												transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										>
											Forgot password?
										</a>
									)}
								</div>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? 'text' : 'password'}
										placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
										autoComplete={isLogin ? 'current-password' : 'new-password'}
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										disabled={form.state.isSubmitting}
										className={cn(
											inputClasses(
												field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
												'default'
											),
											'pr-10 h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
										)}
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
										}}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className={cn(
											"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
											"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded p-1"
										)}
										aria-label={showPassword ? "Hide password" : "Show password"}
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
											className={cn(
												formErrorClasses(),
												animationClasses('slide-down'),
												"flex items-center gap-2"
											)}
										>
											<AlertCircle className="h-4 w-4" />
											{field.state.meta.errors[0]}
										</div>
									)}
								{!isLogin && (
									<div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
										<Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
										<p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
											Must include uppercase, lowercase, number, and special character (8+ chars)
										</p>
									</div>
								)}
							</div>
						)}
					</form.Field>

					{/* Confirm password for signup */}
					{!isLogin && (
						<form.Field name="confirmPassword">
							{field => (
								<div 
									className={cn(
										formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched),
										animationClasses('slide-up')
									)}
								>
									<Label 
										htmlFor="confirmPassword"
										className={cn(
											formLabelClasses(true),
											"flex items-center gap-2"
										)}
									>
										<Lock className="w-4 h-4 text-primary" />
										Confirm password
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											type={showConfirmPassword ? 'text' : 'password'}
											placeholder="Confirm your password"
											autoComplete="new-password"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={form.state.isSubmitting}
											className={cn(
												inputClasses(
													field.state.meta.errors.length > 0 && field.state.meta.isTouched ? 'invalid' : 'default',
													'default'
												),
												'pr-10 h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword(!showConfirmPassword)}
											className={cn(
												"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
												"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded p-1"
											)}
											aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
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
												className={cn(
													formErrorClasses(),
													animationClasses('slide-down'),
													"flex items-center gap-2"
												)}
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
									className={cn(
										formFieldClasses(field.state.meta.errors.length > 0 && field.state.meta.isTouched),
										animationClasses('slide-up'),
										'pt-2'
									)}
								>
									<div className="flex items-start gap-3">
										<input
											id="terms"
											type="checkbox"
											checked={field.state.value}
											onChange={e => field.handleChange(e.target.checked)}
											onBlur={field.handleBlur}
											disabled={form.state.isSubmitting}
											className={cn(
												"mt-0.5 h-5 w-5 rounded border-2 border-input bg-background text-primary",
												"focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all cursor-pointer",
												"disabled:opacity-50 disabled:cursor-not-allowed"
											)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
											}}
										/>
										<label
											htmlFor="terms"
											className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
											style={{
												fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
												lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
											}}
										>
											I agree to the{' '}
											<a
												href="/legal/terms"
												target="_blank"
												rel="noopener noreferrer"
												className={cn(
													"text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors",
													"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
												)}
												style={{
													transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
												}}
											>
												Terms of Service
											</a>{' '}
											and{' '}
											<a
												href="/legal/privacy"
												target="_blank"
												rel="noopener noreferrer"
												className={cn(
													"text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors",
													"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
												)}
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
												className={cn(
													formErrorClasses(),
													animationClasses('slide-down'),
													"flex items-center gap-2 mt-2"
												)}
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
								cardClasses('elevated'),
								animationClasses('slide-down'),
								'flex items-center gap-3 p-4 border-2',
								error.includes('check your email')
									? 'text-green-700 bg-green-50 border-green-300 dark:text-green-400 dark:bg-green-900/20 dark:border-green-600'
									: 'text-red-700 bg-red-50 border-red-300 dark:text-red-400 dark:bg-red-900/20 dark:border-red-600'
							)}
							role="alert"
							aria-live="polite"
						>
							{error.includes('check your email') ? (
								<CheckCircle className="h-5 w-5 flex-shrink-0" />
							) : (
								<AlertCircle className="h-5 w-5 flex-shrink-0" />
							)}
							<div className="flex-1">
								<span 
									className="font-medium leading-relaxed"
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
										lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
									}}
								>
									{error}
								</span>
								{error.includes('check your email') && (
									<p 
										className="text-xs mt-1 opacity-75"
										style={{
											fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
											lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
										}}
									>
										If you don't see it, check your spam folder
									</p>
								)}
							</div>
						</div>
					)}

					{/* Submit Button */}
					<Button
						type="submit"
						size="lg"
						className={cn(
							buttonClasses('primary', 'lg'),
							'w-full font-semibold bg-gradient-to-r from-primary via-primary to-primary/90',
							'hover:from-primary/90 hover:via-primary/95 hover:to-primary/80',
							'shadow-lg hover:shadow-xl active:shadow-md',
							'transform transition-all hover:scale-[1.02] active:scale-[0.98]',
							'focus:ring-2 focus:ring-primary focus:ring-offset-2',
							'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
							form.state.isSubmitting && 'animate-pulse'
						)}
						disabled={form.state.isSubmitting}
						style={{
							transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
						}}
					>
						{form.state.isSubmitting ? (
							<div className="flex items-center justify-center gap-3">
								<div className="relative">
									<Loader2 className="w-5 h-5 animate-spin" />
									<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30 animate-spin" />
								</div>
								<span 
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
										fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
									}}
								>
									{isLogin ? 'Signing you in...' : 'Creating your account...'}
								</span>
							</div>
						) : (
							<div className="flex items-center justify-center gap-2">
								<Shield className="w-5 h-5" />
								<span 
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
										fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
									}}
								>
									{isLogin ? 'Sign In Securely' : 'Create Account'}
								</span>
							</div>
						)}
					</Button>

					{/* Social Login Divider */}
					<div 
						className={cn(
							"relative flex items-center justify-center py-6",
							animationClasses('fade-in')
						)}
					>
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border opacity-60"></div>
						</div>
						<div className="relative flex justify-center">
							<span 
								className="bg-card px-6 text-muted-foreground font-medium"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									letterSpacing: '0.05em'
								}}
							>
								OR CONTINUE WITH
							</span>
						</div>
					</div>

					{/* Google Sign-In Button */}
					<Button
						type="button"
						variant="outline"
						size="lg"
						className={cn(
							buttonClasses('outline', 'lg'),
							'w-full font-medium border-2 relative overflow-hidden group',
							'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-red-50/30',
							'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
							'dark:hover:from-blue-900/20 dark:hover:to-red-900/10',
							'transform transition-all hover:scale-[1.02] active:scale-[0.98]',
							'focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2',
							'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100'
						)}
						onClick={handleGoogleAuth}
						disabled={isGoogleLoading || form.state.isSubmitting}
						style={{
							transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
						}}
					>
						{isGoogleLoading ? (
							<div className="flex items-center justify-center gap-3">
								<div className="relative">
									<Loader2 className="w-5 h-5 animate-spin text-primary" />
									<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin opacity-30" />
								</div>
								<span>
									{isLogin ? 'Signing you in...' : 'Creating your account...'}
								</span>
							</div>
						) : (
							<div className="flex items-center justify-center gap-3 relative z-10">
								<div className="transform group-hover:scale-110 transition-transform duration-200">
									<svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
										<path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
										<path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
										<path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
										<path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
									</svg>
								</div>
								<span 
									className="group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
										fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
									}}
								>
									Continue with Google
								</span>
							</div>
						)}
						{/* Hover gradient effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-red-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					</Button>
				</div>
			</form>
		</div>

		{/* Footer Section */}
		<div 
			className={cn(
				cardClasses('default'),
				animationClasses('fade-in'),
				'text-center p-6 bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50'
			)}
		>
			<div className="space-y-4">
				<p 
					className="text-muted-foreground"
					style={{
						fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
						lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
					}}
				>
					{isLogin ? (
						<>
							Don&apos;t have an account?{' '}
							<a
								href="/auth/sign-up"
								className={cn(
									"text-primary hover:text-primary/80 underline underline-offset-4 font-semibold transition-colors",
									"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
								)}
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
								href="/auth/login"
								className={cn(
									"text-primary hover:text-primary/80 underline underline-offset-4 font-semibold transition-colors",
									"focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
								)}
								style={{
									transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
								}}
							>
								Sign in
							</a>
						</>
					)}
				</p>
				
				{/* Trust Indicators */}
				<div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground/75">
					<div className="flex items-center gap-1">
						<Shield className="w-3 h-3 text-green-600" />
						<span>256-bit SSL</span>
					</div>
					<div className="flex items-center gap-1">
						<Lock className="w-3 h-3 text-blue-600" />
						<span>SOC 2 Compliant</span>
					</div>
					<div className="flex items-center gap-1">
						<CheckCircle className="w-3 h-3 text-primary" />
						<span>GDPR Ready</span>
					</div>
				</div>
			</div>
		</div>
		</div>
	)
}
