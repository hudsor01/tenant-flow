"use client"

import { cn } from '@/lib/utils/css.utils'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GoogleIcon } from '@/components/ui/google-icon'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { signInWithGoogle } from '@/lib/clients/supabase-oauth'
import { supabase } from '@/lib/clients'
import Link from 'next/link'

interface SupabaseLoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
	redirectTo?: string
}

export function SupabaseLoginForm({
	className,
	redirectTo = '/dashboard',
	...props
}: SupabaseLoginFormProps) {
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [rememberMe, setRememberMe] = useState(false)
	const searchParams = useSearchParams()
	const router = useRouter()
	const emailConfirmed = searchParams.get('emailConfirmed') === 'true'

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error, data } = await supabase.auth.signInWithPassword({
				email,
				password
			})

			if (error) throw error

			// If successful, redirect to dashboard
			if (data.user) {
				await router.push(redirectTo)
			}
		} catch (error) {
			const authError = error as Error
			setError(authError.message || 'Invalid email or password')
			setIsLoading(false)
		}
	}

	const handleSocialLogin = async () => {
		setIsLoading(true)
		setError(null)

		try {
			// Use Supabase client-side OAuth flow
			const result = await signInWithGoogle()
			
			if (!result.success) {
				setError(result.error || 'Failed to sign in with Google')
				setIsLoading(false)
			}
			// If successful, Supabase will redirect to the callback URL
		} catch (error) {
			const authError = error as Error
			setError(authError.message || 'An error occurred')
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('flex flex-col gap-6 w-full max-w-md', className)} {...props}>
			<Card className="border-0 shadow-xl">
				<CardHeader className="space-y-1 pb-6">
					<CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
					<CardDescription className="text-muted-foreground">
						Sign in to your account to continue
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{emailConfirmed && (
						<div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
							<CheckCircle className="h-5 w-5 text-green-600" />
							<p className="text-sm text-green-800">
								Email confirmed successfully! Please sign in to continue.
							</p>
						</div>
					)}
					
					{error && (
						<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
							<p className="text-destructive text-sm">
								{error}
							</p>
						</div>
					)}

					{/* Email/Password Login Form */}
					<form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Link 
									href="/auth/forgot-password"
									className="text-sm text-primary hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>

						<div className="flex items-center space-x-2">
							<Checkbox 
								id="remember" 
								checked={rememberMe}
								onCheckedChange={(checked) => setRememberMe(checked as boolean)}
								disabled={isLoading}
							/>
							<Label 
								htmlFor="remember" 
								className="text-sm font-normal cursor-pointer"
							>
								Remember me
							</Label>
						</div>

						<Button 
							type="submit" 
							className="w-full h-11" 
							disabled={isLoading}
						>
							{isLoading ? 'Signing in...' : 'Sign in with Email'}
						</Button>
					</form>

					{/* Divider with proper spacing */}
					<div className="relative flex items-center">
						<div className="flex-grow border-t border-gray-300" />
						<span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase tracking-wider">
							Or continue with
						</span>
						<div className="flex-grow border-t border-gray-300" />
					</div>

					{/* Social Login */}
					<Button
						type="button"
						variant="outline"
						className="w-full h-11"
						onClick={() => void handleSocialLogin()}
						disabled={isLoading}
					>
						<GoogleIcon className="mr-2" size={16} />
						{isLoading ? 'Connecting...' : 'Continue with Google'}
					</Button>

					{/* Sign up link */}
					<div className="text-center text-sm">
						Don't have an account?{' '}
						<Link 
							href="/auth/signup" 
							className="text-primary font-medium hover:underline"
						>
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// Export alias for compatibility
export { SupabaseLoginForm as LoginForm }
