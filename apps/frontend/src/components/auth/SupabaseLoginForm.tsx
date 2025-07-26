import { cn } from '@/lib/utils/css.utils'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useState } from 'react'
import { supabase } from '@/lib/clients'
import type { AuthError } from '@tenantflow/shared'

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

	const handleSocialLogin = async (e: React.FormEvent) => {
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

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.signInWithPassword({
				email,
				password
			})

			if (error) throw error

			// Navigation will be handled by auth state change listener
			window.location.href = redirectTo
		} catch (error) {
			const authError = error as AuthError
			setError(authError.message || 'An error occurred')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Welcome!</CardTitle>
					<CardDescription>
						Sign in to your account to continue
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<p className="text-destructive mb-4 text-sm">{error}</p>
					)}
					<form onSubmit={handleEmailLogin} className="mb-6 space-y-4">
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
						<Button
							type="submit"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? 'Signing in...' : 'Sign in with Email'}
						</Button>
					</form>
					<form onSubmit={handleSocialLogin}>
						<Button
							type="submit"
							variant="outline"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? 'Connecting...' : 'Continue with Google'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
