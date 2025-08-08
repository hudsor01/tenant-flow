"use client"

import { cn } from '@/lib/utils/css.utils'
import { supabase } from '@/lib/clients'
import type { AuthError } from '@repo/shared'
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
import { useRouter } from 'next/navigation'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'

interface SupabaseUpdatePasswordFormProps
	extends React.ComponentPropsWithoutRef<'div'> {
	redirectTo?: string
}

export function SupabaseUpdatePasswordForm({
	className,
	redirectTo = '/dashboard',
	...props
}: SupabaseUpdatePasswordFormProps) {
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [success, setSuccess] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const router = useRouter()

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters long')
			return
		}

		setIsLoading(true)

		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.updateUser({ password })

			if (error) throw error

			setSuccess(true)

			// Navigate to dashboard after successful password update
			setTimeout(() => {
				void router.push(redirectTo)
			}, 2000)
		} catch (error) {
			const authError = error as AuthError
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
							Password Updated!
						</CardTitle>
						<CardDescription className="text-center">
							Your password has been successfully updated
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground text-sm text-center">
							Your password has been updated successfully. You
							will be redirected to your dashboard in a
							moment.
						</p>
						<Button
							onClick={() =>
								void router.push(redirectTo)
							}
							className="w-full h-11"
						>
							Continue to Dashboard
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card className="border-0 shadow-xl">
					<CardHeader className="space-y-1 pb-6">
						<CardTitle className="text-2xl font-bold">
							Update Your Password
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							Please enter your new password below. Make sure it's
							secure and easy to remember.
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
							onSubmit={(e) => void handleUpdatePassword(e)}
							className="space-y-4"
						>
							<div className="space-y-2">
								<Label htmlFor="password">
									New Password
								</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="At least 6 characters"
										required
										value={password}
										onChange={e =>
											setPassword(e.target.value)
										}
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
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirm-password">
									Confirm New Password
								</Label>
								<div className="relative">
									<Input
										id="confirm-password"
										type={showConfirmPassword ? "text" : "password"}
										placeholder="Repeat your new password"
										required
										value={confirmPassword}
										onChange={e =>
											setConfirmPassword(e.target.value)
										}
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
							<Button
								type="submit"
								className="w-full h-11"
								disabled={isLoading}
							>
								{isLoading
									? 'Updating...'
									: 'Update Password'}
							</Button>
						</form>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
