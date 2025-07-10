import AuthLayout from '@/components/auth/AuthLayout'
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLoading, useEnhancedBoolean } from '@/hooks/useEnhancedState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react'
import { PremiumButton } from '@/components/ui/button'
import { GoogleContinueButton } from '@/components/ui/google-oauth-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { useGTM } from '@/hooks/useGTM'
import { signInWithGoogle } from '@/lib/supabase-oauth'
import { toast } from 'sonner'


const signupSchema = z
	.object({
		name: z.string().min(2, 'Name must be at least 2 characters'),
		email: z.string().email('Invalid email address'),
		password: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPassword: z.string(),
		terms: z.boolean().refine(val => val === true, {
			message: 'You must accept the terms and conditions'
		})
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupForm() {
	const navigate = useNavigate()
	const {
		loading: isLoading,
		start: startLoading,
		stop: stopLoading
	} = useLoading()
	const [supabaseLoading, setSupabaseLoading] = useState(false)
	const [error, setError] = useState('')
	const passwordVisibility = useEnhancedBoolean()
	const confirmPasswordVisibility = useEnhancedBoolean()
	const { register: registerUser } = useAuth()
	const { trackSignup } = useGTM()

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			terms: false
		}
	})

	const termsAccepted = watch('terms')
	const password = watch('password')

	// Password strength indicator
	const getPasswordStrength = (password: string) => {
		if (!password) return { strength: 0, text: '', color: '' }

		let strength = 0
		if (password.length >= 6) strength += 1
		if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1
		if (password.match(/\d/)) strength += 1
		if (password.match(/[^a-zA-Z\d]/)) strength += 1

		const levels = [
			{ strength: 0, text: '', color: '' },
			{ strength: 1, text: 'Weak', color: 'text-red-500' },
			{ strength: 2, text: 'Fair', color: 'text-orange-500' },
			{ strength: 3, text: 'Good', color: 'text-yellow-500' },
			{ strength: 4, text: 'Strong', color: 'text-green-500' }
		]

		return levels[strength]
	}

	const passwordStrength = getPasswordStrength(password || '')

	const onSubmit = async (data: SignupFormData) => {
		startLoading()
		setError('')

		try {
			// Track signup attempt in GTM before actual signup
			trackSignup('email')

			await registerUser({
				email: data.email,
				password: data.password,
				name: data.name,
				confirmPassword: data.confirmPassword
			})
			toast.success('Account created successfully! Please check your email to verify your account.')
			navigate('/dashboard')
		} catch (err: unknown) {
			const error = err as Error
			setError(error.message || 'Failed to create account')
			toast.error('Signup failed')
		} finally {
			stopLoading()
		}
	}

	const handleSocialLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setSupabaseLoading(true)
		setError('')

		try {
			// Track Google signup attempt in GTM before actual signup
			trackSignup('google')

			// Try Supabase OAuth first
			const supabaseResult = await signInWithGoogle()

			if (supabaseResult.success) {
				toast.success('Redirecting to Google...')
				// signInWithGoogle handles the redirect
				return
			}

			// If Supabase fails, fall back to NestJS backend
			console.warn('Supabase OAuth failed, falling back to NestJS:', supabaseResult.error)
			toast.warning('Trying alternative sign-up method...')

			const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://tenantflow.app/api/v1'
			window.location.href = `${baseUrl}/auth/google`
		} catch (err: unknown) {
			const error = err as Error
			setError(error.message || 'Failed to sign up with Google')
			toast.error('Google sign-up failed')
		} finally {
			setSupabaseLoading(false)
		}
	}

	const formContent = (
		<>
			{/* Error Message */}
			{error && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
				>
					{error}
				</motion.div>
			)}

			{/* Main Form */}
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{/* Name Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<Label
						htmlFor="name"
						className="text-foreground mb-2 block text-sm font-semibold"
					>
						Full name
					</Label>
					<div className="relative">
						<User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="name"
							type="text"
							placeholder="John Doe"
							className="!h-12 pl-12 pr-4 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
							{...register('name')}
							disabled={isLoading}
						/>
					</div>
					{errors.name && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="mt-2 text-sm font-medium text-red-600"
						>
							{errors.name.message}
						</motion.p>
					)}
				</motion.div>

				{/* Email Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<Label
						htmlFor="email"
						className="text-foreground mb-2 block text-sm font-semibold"
					>
						Email address
					</Label>
					<div className="relative">
						<Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							className="!h-12 pl-12 pr-4 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
							{...register('email')}
							disabled={isLoading}
						/>
					</div>
					{errors.email && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="mt-2 text-sm font-medium text-red-600"
						>
							{errors.email.message}
						</motion.p>
					)}
				</motion.div>

				{/* Password Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
				>
					<Label
						htmlFor="password"
						className="text-foreground mb-2 block text-sm font-semibold"
					>
						Password
					</Label>
					<div className="relative">
						<Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="password"
							type={
								passwordVisibility.value ? 'text' : 'password'
							}
							placeholder="••••••••"
							className="!h-12 pl-12 pr-12 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
							{...register('password')}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							onClick={passwordVisibility.toggle}
						>
							{passwordVisibility.value ? (
								<EyeOff className="h-5 w-5" />
							) : (
								<Eye className="h-5 w-5" />
							)}
						</button>
					</div>

					{/* Password Strength Indicator */}
					{password && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							className="mt-2 flex items-center gap-2"
						>
							<div className="bg-muted h-2 flex-1 rounded-full">
								<div
									className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.strength >= 1
										? passwordStrength.strength === 1 ? 'bg-red-500'
											: passwordStrength.strength === 2 ? 'bg-orange-500'
												: passwordStrength.strength === 3 ? 'bg-yellow-500'
													: 'bg-green-500'
										: 'bg-transparent'
										}`}
									style={{
										width: `${(passwordStrength.strength / 4) * 100}%`
									}}
								/>
							</div>
							<span
								className={`text-xs font-medium ${passwordStrength.color}`}
							>
								{passwordStrength.text}
							</span>
						</motion.div>
					)}

					{errors.password && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="mt-2 text-sm font-medium text-red-600"
						>
							{errors.password.message}
						</motion.p>
					)}
				</motion.div>

				{/* Confirm Password Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					<Label
						htmlFor="confirmPassword"
						className="text-foreground mb-2 block text-sm font-semibold"
					>
						Confirm password
					</Label>
					<div className="relative">
						<Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="confirmPassword"
							type={
								confirmPasswordVisibility.value
									? 'text'
									: 'password'
							}
							placeholder="••••••••"
							className="!h-12 pl-12 pr-12 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
							{...register('confirmPassword')}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => confirmPasswordVisibility.toggle()}
						>
							{confirmPasswordVisibility.value ? (
								<EyeOff className="h-5 w-5" />
							) : (
								<Eye className="h-5 w-5" />
							)}
						</button>
					</div>
					{errors.confirmPassword && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="mt-2 text-sm font-medium text-red-600"
						>
							{errors.confirmPassword.message}
						</motion.p>
					)}
				</motion.div>

				{/* Terms Checkbox */}
				<motion.div
					className="flex items-start gap-3"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
				>
					<Checkbox
						id="terms"
						className="mt-1 h-5 w-5"
						checked={termsAccepted}
						onCheckedChange={checked =>
							setValue('terms', checked as boolean)
						}
					/>
					<label
						htmlFor="terms"
						className="text-muted-foreground text-sm leading-relaxed"
					>
						I agree to the{' '}
						<Link
							to="/terms"
							className="text-primary hover:text-primary/80 font-semibold transition-colors"
						>
							Terms and Conditions
						</Link>{' '}
						and{' '}
						<Link
							to="/privacy"
							className="text-primary hover:text-primary/80 font-semibold transition-colors"
						>
							Privacy Policy
						</Link>
					</label>
				</motion.div>
				{errors.terms && (
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-sm font-medium text-red-600"
					>
						{errors.terms.message}
					</motion.p>
				)}

				{/* Create Account Button */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
				>
					<PremiumButton
						type="submit"
						size="lg"
						className="w-full h-12 text-base font-semibold"
						loading={isLoading}
						disabled={isLoading || supabaseLoading}
						icon={<CheckCircle className="h-5 w-5" />}
					>
						{isLoading ? 'Creating account...' : 'Create account'}
					</PremiumButton>
				</motion.div>
			</form>

			{/* Divider */}
			<motion.div
				className="mt-5"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.7 }}
			>
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="border-border w-full border-t"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="bg-background text-muted-foreground px-4 font-medium">
							Or
						</span>
					</div>
				</div>
			</motion.div>

			{/* Google OAuth */}
			<motion.div
				className="mt-5"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8 }}
			>
				<GoogleContinueButton
					onClick={() =>
						handleSocialLogin(
							new Event('submit') as React.FormEvent
						)
					}
					disabled={isLoading || supabaseLoading}
					loading={supabaseLoading}
					className="h-12"
				/>
			</motion.div>

			{/* Sign In Link */}
			<motion.div
				className="mt-5 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.9 }}
			>
				<p className="text-muted-foreground text-sm">
					Already have an account?{' '}
					<Link
						to="/auth/login"
						className="text-primary hover:text-primary/80 font-semibold transition-colors"
					>
						Sign in
					</Link>
				</p>
			</motion.div>
		</>
	)

	return (
		<AuthLayout
			side="right"
			title="Start your journey"
			subtitle="Create your account and join thousands of property owners who trust TenantFlow."
			image={{
				src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
				alt: 'Beautiful modern home with contemporary design'
			}}
			heroContent={{
				title: 'Start Your Journey',
				description:
					'Join thousands of property owners who trust TenantFlow to manage their rentals efficiently. Get started with our 14-day free trial.'
			}}
		>
			{formContent}
		</AuthLayout>
	)
}
