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
import { Link } from '@tanstack/react-router'

interface SupabaseForgotPasswordFormProps
	extends React.ComponentPropsWithoutRef<'div'> {
	redirectTo?: string
}

export function SupabaseForgotPasswordForm({
	className,
	redirectTo = '/auth/update-password',
	...props
}: SupabaseForgotPasswordFormProps) {
	const [email, setEmail] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [success, setSuccess] = useState(false)

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setIsLoading(true)

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			// Send password reset email with proper redirect URL
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}${redirectTo}`
			})

			if (error) throw error
			setSuccess(true)
		} catch (error) {
			const authError = error as Error
			setError(authError.message || 'An error occurred')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('w-full', className)} {...props}>
			{success ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">
							Check Your Email
						</CardTitle>
						<CardDescription>
							Password reset instructions sent
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<p className="text-muted-foreground text-sm">
								If you registered using your email and password,
								you will receive a password reset email with
								instructions to create a new password.
							</p>
							<div className="pt-4">
								<Link to="/auth/login">
									<Button
										variant="outline"
										className="w-full"
									>
										Back to Login
									</Button>
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">
							Reset Your Password
						</CardTitle>
						<CardDescription>
							Enter your email address and we'll send you a link
							to reset your password
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col gap-6">
							{error && (
								<div className="bg-destructive/15 rounded-md p-3">
									<p className="text-destructive text-sm">
										{error}
									</p>
								</div>
							)}

							<form
								onSubmit={handleForgotPassword}
								className="flex flex-col gap-4"
							>
								<div className="grid gap-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="name@example.com"
										required
										value={email}
										onChange={e => setEmail(e.target.value)}
									/>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={isLoading}
								>
									{isLoading
										? 'Sending...'
										: 'Send reset email'}
								</Button>
							</form>

							<div className="text-center text-sm">
								Remember your password?{' '}
								<Link
									to="/auth/login"
									className="text-primary underline-offset-4 hover:underline"
								>
									Sign in
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
