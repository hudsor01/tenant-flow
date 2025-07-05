import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useBoolean } from 'ahooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
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
// Note: supabase import will be needed if using OAuth

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
	const navigate = useNavigate()
	const [isLoading, { setTrue: startLoading, setFalse: stopLoading }] =
		useBoolean(false)
	const [error, setError] = useState('')
	const [showPassword, { toggle: togglePassword }] = useBoolean(false)
	const { signIn } = useAuthStore()
	const { trackLogin } = useGTM()

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema)
	})

	const onSubmit = async (data: LoginFormData) => {
		startLoading()
		setError('')

		try {
			// Track login attempt in GTM before actual login
			trackLogin('email')

			await signIn(data.email, data.password)
			// Remove toast notification for cleaner UX - user will see dashboard load
			navigate('/dashboard')
		} catch (err: unknown) {
			const error = err as Error
			setError(error.message || 'Invalid email or password')
			// Keep error toast for failed attempts
			toast.error('Login failed')
		} finally {
			stopLoading()
		}
	}

	const handleSocialLogin = async () => {
		startLoading()
		setError('')

		try {
			// Track Google login attempt in GTM before actual login
			trackLogin('google')

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent'
					}
				}
			})

			if (error) throw error
		} catch (err: unknown) {
			const error = err as Error
			setError(error.message || 'Failed to sign in with Google')
			toast.error('Google sign-in failed')
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
				{/* Email Field */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
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
					transition={{ delay: 0.2 }}
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
							type={showPassword ? 'text' : 'password'}
							placeholder="••••••••"
							className="border-border bg-background/50 focus:ring-primary focus:border-primary w-full rounded-xl border-2 py-3 pr-12 pl-12 text-base backdrop-blur-sm transition-all duration-200 focus:ring-2"
							{...register('password')}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="absolute inset-y-0 right-0 flex items-center pr-4"
							onClick={togglePassword}
						>
							{showPassword ? (
								<EyeOff className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
							) : (
								<Eye className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors" />
							)}
						</button>
					</div>
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

				{/* Remember Me & Forgot Password */}
				<motion.div
					className="flex items-center justify-between"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
				>
					<div className="flex items-center space-x-2">
						<Checkbox id="remember" className="h-5 w-5" />
						<label
							htmlFor="remember"
							className="text-muted-foreground text-sm font-medium"
						>
							Remember me
						</label>
					</div>
					<Link
						to="/auth/forgot-password"
						className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors"
					>
						Forgot password?
					</Link>
				</motion.div>

				{/* Sign In Button */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					<PremiumButton
						type="submit"
						size="lg"
						className="w-full"
						loading={isLoading}
						disabled={isLoading}
					>
						{isLoading ? 'Signing in...' : 'Sign in'}
					</PremiumButton>
				</motion.div>
			</form>

			{/* Google OAuth - Professional Integration */}
			<motion.div
				className="mt-8"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5 }}
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
					onClick={handleSocialLogin}
					disabled={isLoading}
					loading={isLoading}
				/>
			</motion.div>

			{/* Sign Up Link */}
			<motion.div
				className="mt-8 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.6 }}
			>
				<p className="text-muted-foreground">
					Don't have an account?{' '}
					<Link
						to="/auth/signup"
						className="text-primary hover:text-primary/80 font-semibold transition-colors"
					>
						Start your free trial
					</Link>
				</p>
			</motion.div>
		</>
	)

	return (
		<AuthLayout
			side="left"
			title="Welcome back"
			subtitle="Sign in to your account to continue managing your properties."
			image={{
				src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
				alt: 'Modern property management dashboard'
			}}
			heroContent={{
				title: 'Manage Properties with Ease',
				description:
					'Streamline your property management workflow with our comprehensive platform. Track tenants, manage leases, and handle maintenance all in one place.'
			}}
		>
			{formContent}
		</AuthLayout>
	)
}
