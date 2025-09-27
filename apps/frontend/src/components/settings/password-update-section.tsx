'use client'

import { LoadingSpinner } from '@/components/magicui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/design-system'
import { supabaseClient, TYPOGRAPHY_SCALE } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	EyeOff,
	Key,
	Shield
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function PasswordUpdateSection() {
	const [currentPassword, setCurrentPassword] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [passwordStrength, setPasswordStrength] = useState(0)

	// Password strength validation using backend RPC
	const validatePasswordStrength = async (pwd: string) => {
		if (!pwd) return 0

		try {
			const { data, error } = await (supabaseClient as { rpc: (name: string, params: { p_password: string }) => Promise<{ data: { strength: number } | null; error: unknown }> })
				.rpc('validate_password_strength', { p_password: pwd })

			if (error) {
				// Password validation error
				return 0
			}

			return (data as { strength: number } | null)?.strength || 0
		} catch {
			// Password validation failed
			return 0
		}
	}

	const handlePasswordChange = async (value: string) => {
		setPassword(value)
		const strength = await validatePasswordStrength(value)
		setPasswordStrength(strength)
	}

	const getStrengthColor = (strength: number) => {
		switch (strength) {
			case 0:
			case 1:
				return 'bg-destructive'
			case 2:
				return 'bg-destructive/60'
			case 3:
				return 'bg-primary/60'
			case 4:
				return 'bg-primary'
			case 5:
				return 'bg-accent'
			default:
				return 'bg-muted'
		}
	}

	const getStrengthText = (strength: number) => {
		switch (strength) {
			case 0:
			case 1:
				return 'Weak'
			case 2:
				return 'Fair'
			case 3:
				return 'Good'
			case 4:
				return 'Strong'
			case 5:
				return 'Very Strong'
			default:
				return 'Enter password'
		}
	}

	// TanStack Query mutation
	const updatePasswordMutation = useMutation({
		mutationFn: async () => {
			// Validate passwords match
			if (password !== confirmPassword) {
				throw new Error('Passwords do not match')
			}

			// Use backend RPC for password validation
			const { data: validationResult, error: validationError } = await (supabaseClient as { rpc: (name: string, params: { p_password: string }) => Promise<{ data: { isValid: boolean; reason?: string } | null; error: unknown }> })
				.rpc('validate_password_strength', { p_password: password })

			if (validationError || !(validationResult as { isValid: boolean; reason?: string } | null)?.isValid) {
				throw new Error((validationResult as { isValid: boolean; reason?: string } | null)?.reason || 'Password is too weak. Please use a stronger password.')
			}

			// First verify current password by reauthenticating
			const {
				data: { user },
				error: userError
			} = await supabaseClient.auth.getUser()
			if (userError || !user?.email) throw new Error('Unable to verify user')

			// Try to sign in with current password to verify it
			const { error: signInError } =
				await supabaseClient.auth.signInWithPassword({
					email: user.email,
					password: currentPassword
				})

			if (signInError) {
				throw new Error('Current password is incorrect')
			}

			// Update the password
			const { error } = await supabaseClient.auth.updateUser({
				password: password
			})

			if (error) throw error
			return { success: true }
		},
		onSuccess: () => {
			toast.success('Password updated successfully!')
			// Reset form
			setCurrentPassword('')
			setPassword('')
			setConfirmPassword('')
			setPasswordStrength(0)
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to update password'
			)
		}
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		updatePasswordMutation.mutate()
	}

	return (
		<Card className="p-6 border shadow-sm">
			<h3
				className="mb-4 flex items-center gap-2 font-semibold"
				style={TYPOGRAPHY_SCALE['heading-lg']}
			>
				<Key className="size-5" />
				Password & Authentication
			</h3>

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Current Password */}
				<div className="space-y-2">
					<Label htmlFor="currentPassword">Current Password</Label>
					<div className="relative">
						<Input
							id="currentPassword"
							type={showCurrentPassword ? 'text' : 'password'}
							placeholder="Enter your current password"
							value={currentPassword}
							onChange={e => setCurrentPassword(e.target.value)}
							disabled={updatePasswordMutation.isPending}
							className="pr-10"
							required
						/>
						<button
							type="button"
							onClick={() => setShowCurrentPassword(!showCurrentPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							tabIndex={-1}
						>
							{showCurrentPassword ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>
				</div>

				{/* New Password */}
				<div className="space-y-2">
					<Label htmlFor="newPassword">New Password</Label>
					<div className="relative">
						<Input
							id="newPassword"
							type={showPassword ? 'text' : 'password'}
							placeholder="Enter your new password"
							value={password}
							onChange={e => handlePasswordChange(e.target.value)}
							disabled={updatePasswordMutation.isPending}
							className="pr-10"
							required
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							tabIndex={-1}
						>
							{showPassword ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>

					{/* Password Strength Indicator */}
					{password && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span
									className="text-muted-foreground"
									style={TYPOGRAPHY_SCALE['ui-caption']}
								>
									Password strength:
								</span>
								<span
									className={cn(
										'font-semibold',
										passwordStrength < 3
											? 'text-destructive'
											: passwordStrength < 4
												? 'text-primary'
												: 'text-accent'
									)}
									style={TYPOGRAPHY_SCALE['ui-caption']}
								>
									{getStrengthText(passwordStrength)}
								</span>
							</div>
							<div className="h-1 bg-muted rounded-full overflow-hidden">
								<div
									className={cn(
										'h-full transition-all duration-300',
										getStrengthColor(passwordStrength)
									)}
									style={{
										width: `${(passwordStrength / 5) * 100}%`
									}}
								/>
							</div>
							<p
								className="text-muted-foreground"
								style={TYPOGRAPHY_SCALE['ui-caption']}
							>
								Use at least 8 characters with uppercase, lowercase, numbers,
								and symbols
							</p>
						</div>
					)}
				</div>

				{/* Confirm Password */}
				<div className="space-y-2">
					<Label htmlFor="confirmPassword">Confirm New Password</Label>
					<div className="relative">
						<Input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							placeholder="Re-enter your new password"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							disabled={updatePasswordMutation.isPending}
							className={cn(
								'pr-10',
								confirmPassword &&
									password !== confirmPassword &&
									'border-destructive focus:border-destructive'
							)}
							required
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							tabIndex={-1}
						>
							{showConfirmPassword ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>

					{/* Password Match Indicator */}
					{confirmPassword && (
						<div>
							{password !== confirmPassword ? (
								<p
									className="text-destructive flex items-center gap-1"
									style={TYPOGRAPHY_SCALE['ui-caption']}
								>
									<AlertTriangle className="w-3 h-3" />
									Passwords do not match
								</p>
							) : (
								<p
									className="text-accent flex items-center gap-1"
									style={TYPOGRAPHY_SCALE['ui-caption']}
								>
									<CheckCircle2 className="w-3 h-3" />
									Passwords match
								</p>
							)}
						</div>
					)}
				</div>

				{/* Error Alert */}
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

				{/* Success Alert */}
				{updatePasswordMutation.isSuccess && (
					<Alert className="border-accent/20 bg-accent/10 text-accent-foreground">
						<CheckCircle2 className="h-4 w-4 text-accent" />
						<AlertDescription>
							Your password has been successfully updated.
						</AlertDescription>
					</Alert>
				)}

				{/* Submit Button */}
				<Button
					type="submit"
					disabled={
						updatePasswordMutation.isPending ||
						!currentPassword ||
						!password ||
						!confirmPassword ||
						password !== confirmPassword ||
						passwordStrength < 3
					}
					className="w-full sm:w-auto"
				>
					{updatePasswordMutation.isPending ? (
						<>
							<LoadingSpinner size="sm" className="mr-2" />
							Updating Password...
						</>
					) : (
						<>
							<Shield className="w-4 h-4 mr-2" />
							Update Password
						</>
					)}
				</Button>

				<p
					className="text-muted-foreground mt-4"
					style={TYPOGRAPHY_SCALE['ui-caption']}
				>
					Make sure to use a strong, unique password that you don't use for
					other accounts.
				</p>
			</form>
		</Card>
	)
}
