"use client"

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
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

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
		<div className={cn('w-full max-w-md', className)} {...props}>
			{success ? (
				<Card className="border-0 shadow-xl">
					<CardHeader className="space-y-1 pb-6">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
							<CheckCircle className="h-6 w-6 text-green-600" />
						</div>
						<CardTitle className="text-2xl font-bold text-center">
							Check Your Email
						</CardTitle>
						<CardDescription className="text-center">
							Password reset instructions sent to <strong>{email}</strong>
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground text-sm text-center">
							If you registered using your email and password,
							you will receive a password reset email with
							instructions to create a new password.
						</p>
						<Button
							asChild
							variant="outline"
							className="w-full h-11"
						>
							<Link href="/auth/login">
								Back to Sign In
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card className="border-0 shadow-xl">
					<CardHeader className="space-y-1 pb-6">
						<CardTitle className="text-2xl font-bold">
							Reset Your Password
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							Enter your email address and we'll send you a link
							to reset your password
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{error && (
							<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
								<p className="text-destructive text-sm">
									{error}
								</p>
							</div>
						)}

						<form
							onSubmit={(e) => void handleForgotPassword(e)}
							className="space-y-4"
						>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="name@example.com"
									required
									value={email}
									onChange={e => setEmail(e.target.value)}
									disabled={isLoading}
									className="h-11"
								/>
							</div>
							<Button
								type="submit"
								className="w-full h-11"
								disabled={isLoading}
							>
								{isLoading
									? 'Sending...'
									: 'Send Reset Email'}
							</Button>
						</form>

						<div className="text-center text-sm">
							Remember your password?{' '}
							<Link
								href="/auth/login"
								className="text-primary font-medium hover:underline"
							>
								Sign in
							</Link>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
