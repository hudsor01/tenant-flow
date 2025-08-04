import { supabase } from '@/lib/clients'
import type { AuthError } from '@repo/shared'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useState } from 'react'

interface SupabaseSignupFormProps {
	redirectTo?: string
	className?: string
}

export function SupabaseSignupForm({
	redirectTo = '/get-started',
	className
}: SupabaseSignupFormProps) {
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	
	// Remove sendWelcomeEmail as it doesn't exist in the auth router

	const handleSocialSignup = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
				}
			})

			if (error) throw error
			// The redirect will happen automatically
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
						name: name
					}
				}
			})
			if (error) throw error
			
			// Welcome email can be handled by Supabase or backend webhooks
			if (data.user && name) {
				// Email sending is handled by Supabase auth hooks
			}
			
			// Show success message to check email for confirmation
			setError('Please check your email to confirm your account!')
		} catch (error) {
			const authError = error as AuthError
			setError(authError.message || 'An error occurred')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className={className || "w-full"}>
			<CardHeader>
				<CardTitle className="text-2xl">Create your account</CardTitle>
				<CardDescription>
					Sign up with email or Google to get started
				</CardDescription>
			</CardHeader>
			<CardContent>
				{error && (
					<p className="text-destructive mb-4 text-sm">{error}</p>
				)}
				<form onSubmit={(e) => void handleEmailSignup(e)} className="mb-6 space-y-4">
					<input
						type="text"
						placeholder="Full Name"
						value={name}
						onChange={e => setName(e.target.value)}
						required
						className="w-full rounded border px-3 py-2"
						disabled={isLoading}
					/>
					<input
						type="email"
						placeholder="Email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						className="w-full rounded border px-3 py-2"
						disabled={isLoading}
					/>
					<input
						type="password"
						placeholder="Password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						className="w-full rounded border px-3 py-2"
						disabled={isLoading}
					/>
					<button
						type="submit"
						disabled={isLoading}
						className="bg-primary w-full rounded py-2 font-semibold text-white"
					>
						{isLoading ? 'Signing up...' : 'Sign up with Email'}
					</button>
				</form>
				<form onSubmit={(e) => void handleSocialSignup(e)}>
					<button
						type="submit"
						disabled={isLoading}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '100%',
							maxWidth: 360,
							margin: '0 auto',
							background: '#fff',
							color: 'rgba(60,64,67,1)',
							border: '1px solid #dadce0',
							borderRadius: 4,
							fontWeight: 500,
							fontSize: 16,
							height: 48,
							boxShadow: '0 1px 2px rgba(60,64,67,.08)',
							cursor: isLoading ? 'not-allowed' : 'pointer',
							transition: 'box-shadow 0.2s',
							gap: 12
						}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							style={{ marginRight: 8 }}
						>
							<g>
								<path
									fill="#4285F4"
									d="M21.805 10.023h-9.18v3.955h5.463c-.236 1.267-1.42 3.72-5.463 3.72-3.29 0-5.98-2.72-5.98-6.08s2.69-6.08 5.98-6.08c1.87 0 3.13.8 3.85 1.48l2.63-2.56C17.14 3.7 15.23 2.7 13.02 2.7c-5.01 0-9.08 4.07-9.08 9.08s4.07 9.08 9.08 9.08c5.24 0 8.7-3.68 8.7-8.87 0-.59-.07-1.04-.15-1.48z"
								/>
								<path
									fill="#34A853"
									d="M3.15 7.58l3.25 2.38c.7-1.34 2.01-2.7 4.62-2.7 1.32 0 2.5.45 3.42 1.34l2.56-2.56C15.23 3.7 13.02 2.7 10.82 2.7c-3.61 0-6.62 2.94-6.62 6.62 0 1.04.27 2.02.75 2.86z"
								/>
								<path
									fill="#FBBC05"
									d="M13.02 21.16c2.21 0 4.07-.73 5.43-2.01l-2.65-2.17c-.74.5-1.7.8-2.78.8-2.14 0-3.96-1.44-4.61-3.37l-3.23 2.5c1.34 2.65 4.13 4.25 7.84 4.25z"
								/>
								<path
									fill="#EA4335"
									d="M21.805 10.023h-9.18v3.955h5.463c-.236 1.267-1.42 3.72-5.463 3.72-3.29 0-5.98-2.72-5.98-6.08s2.69-6.08 5.98-6.08c1.87 0 3.13.8 3.85 1.48l2.63-2.56C17.14 3.7 15.23 2.7 13.02 2.7c-5.01 0-9.08 4.07-9.08 9.08s4.07 9.08 9.08 9.08c5.24 0 8.7-3.68 8.7-8.87 0-.59-.07-1.04-.15-1.48z"
								/>
							</g>
						</svg>
						{isLoading ? 'Connecting...' : 'Continue with Google'}
					</button>
				</form>
			</CardContent>
		</Card>
	)
}

// Export alias for compatibility
export { SupabaseSignupForm as SignUpForm }
