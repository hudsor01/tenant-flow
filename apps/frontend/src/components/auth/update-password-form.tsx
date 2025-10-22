'use client'

import { PasswordStrength } from '@/components/auth/password-strength'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { buttonClasses, cardClasses, cn } from '@/lib/design-system'
import { supabaseClient } from '@repo/shared/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
	Shield
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function UpdatePasswordForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const router = useRouter()

	// TanStack Query mutation with enhanced feedback
	const updatePasswordMutation = useMutation({
		mutationFn: async (password: string) => {
			if (password !== confirmPassword) {
				throw new Error('Passwords do not match')
			}
			if (password.length < 8) {
				throw new Error('Password must be at least 8 characters')
			}
			const { error } = await supabaseClient.auth.updateUser({ password })
			if (error) throw error
			return { success: true }
		},
		onSuccess: () => {
			toast.success('Password updated successfully!')
			setTimeout(() => router.push('/dashboard'), 1500)
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to update password'
			)
		}
	})

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		updatePasswordMutation.mutate(password)
	}

	return (
		<div
			className={cn('form-container max-w-md mx-auto animate-fade-in', className)}
			{...props}
		>
			<Card
				className={cn(
					cardClasses(),
					'shadow-xl border-2 hover:shadow-2xl transition-all duration-300 ease-out'
				)}
			>
				<CardHeader className="text-center space-y-4 animate-slide-in-top">
					<div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
						<Lock className="w-6 h-6 text-primary" />
					</div>
					<div className="space-y-2">
						<CardTitle className="font-bold tracking-tight text-3xl">
							Reset Your Password
						</CardTitle>
						<CardDescription className="leading-relaxed">
							Please enter a strong new password to secure your account.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-6 animate-slide-in-bottom">
					<form onSubmit={handleUpdatePassword} className="space-y-6">
						<div className="space-y-4">
							{/* New Password Field with PasswordStrength */}
							<Field>
								<FieldLabel htmlFor="password">New password</FieldLabel>
								<PasswordStrength
									id="password"
									placeholder="Enter your new password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									disabled={updatePasswordMutation.isPending}
									showStrengthIndicator={true}
									minLength={8}
								/>
								<FieldError />
							</Field>

							{/* Confirm Password Field */}
							<Field>
								<FieldLabel htmlFor="confirmPassword">
									Confirm password
								</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										placeholder="Confirm your new password"
										autoComplete="new-password"
										value={confirmPassword}
										onChange={e => setConfirmPassword(e.target.value)}
										disabled={updatePasswordMutation.isPending}
										aria-invalid={
											confirmPassword && password !== confirmPassword
												? 'true'
												: undefined
										}
									/>
									<InputGroupAddon align="inline-end">
										<button
											type="button"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}
											className="text-muted-foreground hover:text-foreground focus:text-primary transition-colors"
											tabIndex={-1}
										>
											{showConfirmPassword ? <EyeOff /> : <Eye />}
											<span className="sr-only">
												{showConfirmPassword
													? 'Hide password'
													: 'Show password'}
											</span>
										</button>
									</InputGroupAddon>
								</InputGroup>
								{confirmPassword && password !== confirmPassword && (
									<p className="text-xs text-destructive flex items-center gap-1">
										<AlertTriangle className="w-3 h-3" />
										Passwords do not match
									</p>
								)}
								{confirmPassword && password === confirmPassword && (
									<p className="text-xs text-primary flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3" />
										Passwords match
									</p>
								)}
							</Field>
						</div>

						{updatePasswordMutation.isError && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									{updatePasswordMutation.error instanceof Error
										? updatePasswordMutation.error.message
										: 'An error occurred while updating your password'}
								</AlertDescription>
							</Alert>
						)}

						<Button
							type="submit"
							className={cn(
								buttonClasses('primary', 'lg'),
								'w-full font-semibold hover:scale-105',
								'transition-fast-transform'
							)}
							disabled={
								updatePasswordMutation.isPending ||
								!password ||
								!confirmPassword ||
								password !== confirmPassword ||
								password.length < 8
							}
						>
							{updatePasswordMutation.isPending ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
									Saving...
								</>
							) : (
								<>
									<Shield className="w-4 h-4 mr-2" />
									Save new password
								</>
							)}
						</Button>
					</form>

					<div className="text-center pt-4 border-t">
						<p className="text-xs text-muted-foreground">
							Your password will be encrypted and stored securely
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
