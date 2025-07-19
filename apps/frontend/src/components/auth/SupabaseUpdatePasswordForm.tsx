import { cn } from '@/lib/utils'
import { supabase } from '@/lib/api'
import type { AuthError } from '@tenantflow/types'
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
import { useRouter } from '@tanstack/react-router'

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
				router.navigate({ to: redirectTo })
			}, 2000)
		} catch (error) {
			const authError = error as AuthError
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
							Password Updated!
						</CardTitle>
						<CardDescription>
							Your password has been successfully updated
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<p className="text-muted-foreground text-sm">
								Your password has been updated successfully. You
								will be redirected to your dashboard in a
								moment.
							</p>
							<Button
								onClick={() =>
									router.navigate({ to: redirectTo })
								}
								className="w-full"
							>
								Continue to Dashboard
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">
							Update Your Password
						</CardTitle>
						<CardDescription>
							Please enter your new password below. Make sure it's
							secure and easy to remember.
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
								onSubmit={handleUpdatePassword}
								className="flex flex-col gap-4"
							>
								<div className="grid gap-2">
									<Label htmlFor="password">
										New Password
									</Label>
									<Input
										id="password"
										type="password"
										placeholder="At least 6 characters"
										required
										value={password}
										onChange={e =>
											setPassword(e.target.value)
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="confirm-password">
										Confirm New Password
									</Label>
									<Input
										id="confirm-password"
										type="password"
										placeholder="Repeat your new password"
										required
										value={confirmPassword}
										onChange={e =>
											setConfirmPassword(e.target.value)
										}
									/>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={isLoading}
								>
									{isLoading
										? 'Updating...'
										: 'Update password'}
								</Button>
							</form>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
