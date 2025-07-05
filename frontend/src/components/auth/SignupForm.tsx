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
import { useAuthStore } from '@/store/authStore'
import { useGTM } from '@/hooks/useGTM'
import { toast } from 'sonner'
import AuthLayout from './AuthLayout'
import { supabase } from '@/lib/supabase'
import { getAuthCallbackUrl } from '@/lib/auth-utils'

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
	const [error, setError] = useState('')
	const passwordVisibility = useEnhancedBoolean()
	const confirmPasswordVisibility = useEnhancedBoolean()
	const { signUp } = useAuthStore()
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

			await signUp(data.email, data.password, data.name)
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
		startLoading()
		setError('')

		try {
			// Track Google signup attempt in GTM before actual signup
			trackSignup('google')

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: getAuthCallbackUrl('/dashboard'),
					queryParams: {
						access_type: 'offline',
						prompt: 'consent'
					}
				}
			})

			if (error) throw error
		} catch (err: unknown) {
			const error = err as Error
			setError(error.message || 'Failed to sign up with Google')
			toast.error('Google sign-up failed')
			stopLoading()
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
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
				{/* Name Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<Label
						htmlFor="name"
						className="text-foreground mb-3 block text-sm font-semibold"
					>
						Full name
					</Label>
					<div className="relative">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
							<User className="text-muted-foreground h-5 w-5" />
						</div>
						<Input
							id="name"
							type="text"
							placeholder="John Doe"
							className="border-border bg-background/50 focus:ring-primary focus:border-primary w-full rounded-xl border-2 py-3 pr-4 pl-12 text-base backdrop-blur-sm transition-all duration-200 focus:ring-2"
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
						className="text-foreground mb-3 block text-sm font-semibold"
					>
						Email address
					</Label>
					<div className="relative">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
							<Mail className="text-muted-foreground h-5 w-5" />
						</div>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							className="border-border bg-background/50 focus:ring-primary focus:border-primary w-full rounded-xl border-2 py-3 pr-4 pl-12 text-base backdrop-blur-sm transition-all duration-200 focus:ring-2"
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
						className="text-foreground mb-3 block text-sm font-semibold"
					>
						Password
					</Label>
					<div className="relative">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
							<Lock className="text-muted-foreground h-5 w-5" />
						</div>
						<Input
							id="password"
							type={
								passwordVisibility.value ? 'text' : 'password'
							}
							placeholder="••••••••"
							className="border-border bg-background/50 focus:ring-primary focus:border-primary w-full rounded-xl border-2 py-3 pr-12 pl-12 text-base backdrop-blur-sm transition-all duration-200 focus:ring-2"
							{...register('password')}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="absolute inset-y-0 right-0 flex items-center pr-4"
							onClick={passwordVisibility.toggle}
						>
							{passwordVisibility.value ? (
								<EyeOff className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
							) : (
								<Eye className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
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
									className={`h-2 rounded-full transition-all duration-300 ${
										passwordStrength.strength >= 1
											? 'bg-red-500'
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
						className="text-foreground mb-3 block text-sm font-semibold"
					>
						Confirm password
					</Label>
					<div className="relative">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
							<Lock className="text-muted-foreground h-5 w-5" />
						</div>
						<Input
							id="confirmPassword"
							type={
								confirmPasswordVisibility.value
									? 'text'
									: 'password'
							}
							placeholder="••••••••"
							className="border-border bg-background/50 focus:ring-primary focus:border-primary w-full rounded-xl border-2 py-3 pr-12 pl-12 text-base backdrop-blur-sm transition-all duration-200 focus:ring-2"
							{...register('confirmPassword')}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="absolute inset-y-0 right-0 flex items-center pr-4"
							onClick={() => confirmPasswordVisibility.toggle()}
						>
							{confirmPasswordVisibility.value ? (
								<EyeOff className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
							) : (
								<Eye className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
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
						className="mt-0.5 h-5 w-5"
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
						className="w-full"
						loading={isLoading}
						disabled={isLoading}
						icon={<CheckCircle className="h-5 w-5" />}
					>
						{isLoading ? 'Creating account...' : 'Create account'}
					</PremiumButton>
				</motion.div>
			</form>

			{/* Google OAuth - Professional Integration */}
			<motion.div
				className="mt-8"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.7 }}
			>
				<div className="relative mb-6">
					<div className="absolute inset-0 flex items-center">
						<div className="border-border w-full border-t"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="bg-background text-muted-foreground px-4 font-medium">
							Or
						</span>
					</div>
				</div>

				<GoogleContinueButton
					onClick={() =>
						handleSocialLogin(
							new Event('submit') as unknown as React.FormEvent
						)
					}
					disabled={isLoading}
					loading={isLoading}
				/>
			</motion.div>

			{/* Sign In Link */}
			<motion.div
				className="mt-8 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.8 }}
			>
				<p className="text-muted-foreground">
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
