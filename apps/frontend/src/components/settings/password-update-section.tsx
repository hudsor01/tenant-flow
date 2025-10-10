'use client'

import { PasswordStrength } from '@/components/auth/password-strength'
import { LoadingSpinner } from '@/components/magicui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { cn, TYPOGRAPHY_SCALE } from '@/lib/design-system'
import { supabaseClient } from '@repo/shared/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Shield } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function PasswordUpdateSection() {
	const [currentPassword, setCurrentPassword] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const updatePasswordMutation = useMutation({
		mutationFn: async () => {
			if (password !== confirmPassword) {
				throw new Error('Passwords do not match')
			}
			if (password.length < 8) {
				throw new Error('Password must be at least 8 characters')
			}

			const {
				data: { user },
				error: userError
			} = await supabaseClient.auth.getUser()
			if (userError || !user?.email) throw new Error('Unable to verify user')

			const { error: signInError } =
				await supabaseClient.auth.signInWithPassword({
					email: user.email,
					password: currentPassword
				})
			if (signInError) throw new Error('Current password is incorrect')

			const { error } = await supabaseClient.auth.updateUser({ password })
			if (error) throw error
			return { success: true }
		},
		onSuccess: () => {
			toast.success('Password updated successfully!')
			setCurrentPassword('')
			setPassword('')
			setConfirmPassword('')
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
		<CardLayout
			title="Password & Authentication"
			description="Update your account password and security settings"
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Current Password */}
				<Field>
					<FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
					<InputGroup>
						<InputGroupInput
							id="currentPassword"
							type={showCurrentPassword ? 'text' : 'password'}
							placeholder="Enter your current password"
							value={currentPassword}
							onChange={e => setCurrentPassword(e.target.value)}
							disabled={updatePasswordMutation.isPending}
							required
						/>
						<InputGroupAddon align="inline-end">
							<button
								type="button"
								onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								className="text-muted-foreground hover:text-foreground focus:text-primary transition-colors"
								tabIndex={-1}
							>
								{showCurrentPassword ? <EyeOff /> : <Eye />}
								<span className="sr-only">
									{showCurrentPassword ? 'Hide password' : 'Show password'}
								</span>
							</button>
						</InputGroupAddon>
					</InputGroup>
					<FieldError />
				</Field>

				{/* New Password */}
				<Field>
					<FieldLabel htmlFor="newPassword">New Password</FieldLabel>
					<PasswordStrength
						id="newPassword"
						placeholder="Enter your new password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						disabled={updatePasswordMutation.isPending}
						showStrengthIndicator={true}
						minLength={8}
					/>
					<FieldError />
				</Field>

				{/* Confirm Password */}
				<Field>
					<FieldLabel htmlFor="confirmPassword">
						Confirm New Password
					</FieldLabel>
					<InputGroup>
						<InputGroupInput
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							placeholder="Re-enter your new password"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							disabled={updatePasswordMutation.isPending}
							aria-invalid={
								confirmPassword && password !== confirmPassword
									? 'true'
									: undefined
							}
							required
						/>
						<InputGroupAddon align="inline-end">
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="text-muted-foreground hover:text-foreground focus:text-primary transition-colors"
								tabIndex={-1}
							>
								{showConfirmPassword ? <EyeOff /> : <Eye />}
								<span className="sr-only">
									{showConfirmPassword ? 'Hide password' : 'Show password'}
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

				{updatePasswordMutation.isSuccess && (
					<Alert className="border-accent/20 bg-accent/10 text-accent-foreground">
						<CheckCircle2 className="h-4 w-4 text-accent" />
						<AlertDescription>
							Your password has been successfully updated.
						</AlertDescription>
					</Alert>
				)}

				<Button
					type="submit"
					disabled={
						updatePasswordMutation.isPending ||
						!currentPassword ||
						!password ||
						!confirmPassword ||
						password !== confirmPassword ||
						password.length < 8
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
					className={cn('text-muted-foreground mt-4')}
					style={TYPOGRAPHY_SCALE['ui-caption']}
				>
					Make sure to use a strong, unique password that you don't use for
					other accounts.
				</p>
			</form>
		</CardLayout>
	)
}
