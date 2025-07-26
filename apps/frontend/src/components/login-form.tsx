import { cn } from '@/lib/utils/css.utils'
import { supabase } from '@/lib/clients'
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
import { useState } from 'react'
import GoogleOneTapButton from '@/components/auth/GoogleOneTapButton'
import { Link } from '@tanstack/react-router'

export function LoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		console.log('[LoginForm] Form submitted, preventDefault called')
		setIsLoading(true)
		setError(null)

		try {
			console.log('[LoginForm] Starting authentication process')
			console.log('[LoginForm] Supabase client available:', !!supabase)
			
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			console.log('[LoginForm] Calling supabase.auth.signInWithPassword')
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			})
			
			console.log('[LoginForm] Supabase response received:', { 
				hasData: !!data, 
				hasError: !!error,
				hasSession: !!data?.session 
			})
			
			if (error) {
				console.error('[LoginForm] Supabase error:', error)
				throw error
			}
			
			if (data.session) {
				console.log('[LoginForm] Session created successfully for:', data.session.user.email)
				// Use window.location for hard navigation to ensure session is picked up
				window.location.href = '/dashboard'
			} else {
				throw new Error('Login succeeded but no session was created')
			}
		} catch (error: unknown) {
			console.error('[LoginForm] Login error:', error)
			setError(
				error instanceof Error ? error.message : 'An error occurred'
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('w-full', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Login</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Google Login Button */}
					<div className="mb-6">
						<GoogleOneTapButton text="signin_with" />
					</div>

					{/* Divider */}
					<div className="relative mb-6">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background text-muted-foreground px-2">
								Or continue with email
							</span>
						</div>
					</div>

					{/* Email Login Form */}
					<form onSubmit={handleLogin}>
						<div className="flex flex-col gap-6">
							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="m@tenantflow.app"
									required
									value={email}
									onChange={e => setEmail(e.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<div className="flex items-center">
									<Label htmlFor="password">Password</Label>
									<Link
										to="/auth/forgot-password"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Forgot your password?
									</Link>
								</div>
								<Input
									id="password"
									type="password"
									required
									value={password}
									onChange={e => setPassword(e.target.value)}
								/>
							</div>
							{error && (
								<p className="text-sm text-red-500">{error}</p>
							)}
							<Button
								type="submit"
								className="w-full"
								disabled={isLoading}
							>
								{isLoading
									? 'Logging in...'
									: 'Login with Email'}
							</Button>
						</div>
						<div className="mt-4 text-center text-sm">
							Don&apos;t have an account?{' '}
							<Link
								to="/auth/signup"
								className="underline underline-offset-4"
							>
								Sign up
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
