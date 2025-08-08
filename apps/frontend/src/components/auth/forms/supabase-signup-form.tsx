"use client"

import { cn } from '@/lib/utils/css.utils'
import { supabase } from '@/lib/clients'
import type { AuthError } from '@repo/shared'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, X } from 'lucide-react'
import { signInWithGoogle } from '@/lib/clients/supabase-oauth'

interface SupabaseSignupFormProps {
	redirectTo?: string
	className?: string
}

export function SupabaseSignupForm({
	redirectTo = '/dashboard',
	className
}: SupabaseSignupFormProps) {
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [name, setName] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [agreedToTerms, setAgreedToTerms] = useState(false)
	const [success, setSuccess] = useState(false)
	const router = useRouter()
	
	// Password strength indicators
	const passwordStrength = {
		hasMinLength: password.length >= 8,
		hasUpperCase: /[A-Z]/.test(password),
		hasLowerCase: /[a-z]/.test(password),
		hasNumber: /\d/.test(password),
		hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
	}
	
	const isPasswordStrong = Object.values(passwordStrength).filter(Boolean).length >= 4

	const handleSocialSignup = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const result = await signInWithGoogle()
			
			if (!result.success) {
				setError(result.error || 'Failed to sign up with Google')
				setIsLoading(false)
			}
			// If successful, Supabase will redirect to the callback URL
		} catch (error) {
			const authError = error as AuthError
			setError(authError.message || 'An error occurred')
			setIsLoading(false)
		}
	}

	const handleEmailSignup = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		// Validation
		if (password !== confirmPassword) {
			setError('Passwords do not match')
			setIsLoading(false)
			return
		}

		if (!isPasswordStrong) {
			setError('Please choose a stronger password')
			setIsLoading(false)
			return
		}

		if (!agreedToTerms) {
			setError('Please agree to the terms and conditions')
			setIsLoading(false)
			return
		}

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error, data } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&redirect=${redirectTo}`,
					data: {
						name: name,
						full_name: name
					}
				}
			})
			
			if (error) throw error
			
			if (data.user) {
				setSuccess(true)
			}
		} catch (error) {
			const authError = error as AuthError
			setError(authError.message || 'An error occurred during signup')
			setIsLoading(false)
		}
	}

	if (success) {
		return (
			<Card className="border-0 shadow-xl w-full max-w-md">
				<CardHeader className="space-y-1 pb-6">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
						<CheckCircle className="h-6 w-6 text-green-600" />
					</div>
					<CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
					<CardDescription className="text-center">
						We've sent a confirmation link to <strong>{email}</strong>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground text-center">
						Click the link in your email to confirm your account and get started with TenantFlow.
					</p>
					<Button 
						variant="outline" 
						className="w-full"
						onClick={() => router.push('/auth/login')}
					>
						Back to Sign In
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={cn("border-0 shadow-xl w-full max-w-md", className)}>
			<CardHeader className="space-y-1 pb-6">
				<CardTitle className="text-2xl font-bold">Create an account</CardTitle>
				<CardDescription className="text-muted-foreground">
					Enter your details to get started with TenantFlow
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
						<p className="text-destructive text-sm">{error}</p>
					</div>
				)}
				
				<form onSubmit={(e) => void handleEmailSignup(e)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							type="text"
							placeholder="John Doe"
							value={name}
							onChange={e => setName(e.target.value)}
							required
							disabled={isLoading}
							className="h-11"
						/>
					</div>
					
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="name@example.com"
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							disabled={isLoading}
							className="h-11"
						/>
					</div>
					
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<div className="relative">
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="Create a strong password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
								disabled={isLoading}
								className="h-11 pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabIndex={-1}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
						
						{/* Password strength indicator */}
						{password && (
							<div className="space-y-2 text-xs">
								<div className="flex flex-wrap gap-2">
									<span className={cn(
										"flex items-center gap-1",
										passwordStrength.hasMinLength ? "text-green-600" : "text-muted-foreground"
									)}>
										{passwordStrength.hasMinLength ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
										8+ characters
									</span>
									<span className={cn(
										"flex items-center gap-1",
										passwordStrength.hasUpperCase ? "text-green-600" : "text-muted-foreground"
									)}>
										{passwordStrength.hasUpperCase ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
										Uppercase
									</span>
									<span className={cn(
										"flex items-center gap-1",
										passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"
									)}>
										{passwordStrength.hasNumber ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
										Number
									</span>
								</div>
							</div>
						)}
					</div>
					
					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm Password</Label>
						<div className="relative">
							<Input
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Confirm your password"
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								required
								disabled={isLoading}
								className="h-11 pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabIndex={-1}
							>
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
						{confirmPassword && password !== confirmPassword && (
							<p className="text-xs text-destructive">Passwords do not match</p>
						)}
					</div>

					<div className="flex items-start space-x-2">
						<Checkbox 
							id="terms" 
							checked={agreedToTerms}
							onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
							disabled={isLoading}
							className="mt-1"
						/>
						<Label 
							htmlFor="terms" 
							className="text-sm font-normal cursor-pointer leading-relaxed"
						>
							I agree to the{' '}
							<Link href="/terms" className="text-primary hover:underline">
								Terms of Service
							</Link>
							{' '}and{' '}
							<Link href="/privacy" className="text-primary hover:underline">
								Privacy Policy
							</Link>
						</Label>
					</div>

					<Button
						type="submit"
						disabled={isLoading || !agreedToTerms}
						className="w-full h-11"
					>
						{isLoading ? 'Creating account...' : 'Create Account'}
					</Button>
				</form>

				{/* Divider */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">
							Or continue with
						</span>
					</div>
				</div>

				{/* Social Signup */}
				<Button
					type="button"
					variant="outline"
					className="w-full h-11"
					onClick={() => void handleSocialSignup()}
					disabled={isLoading}
				>
					<svg
						className="mr-2 h-4 w-4"
						aria-hidden="true"
						focusable="false"
						data-prefix="fab"
						data-icon="google"
						role="img"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 488 512"
					>
						<path
							fill="currentColor"
							d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
						/>
					</svg>
					{isLoading ? 'Connecting...' : 'Continue with Google'}
				</Button>

				{/* Sign in link */}
				<div className="text-center text-sm">
					Already have an account?{' '}
					<Link 
						href="/auth/login" 
						className="text-primary font-medium hover:underline"
					>
						Sign in
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// Export alias for compatibility
export { SupabaseSignupForm as SignUpForm }