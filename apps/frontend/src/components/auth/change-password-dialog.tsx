'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { useChangePasswordMutation } from '#hooks/api/use-auth'
import { logger } from '@repo/shared/lib/frontend-logger'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'

interface ChangePasswordDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
	open,
	onOpenChange
}: ChangePasswordDialogProps) {
	const changePassword = useChangePasswordMutation()

	const [formData, setFormData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	})

	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false
	})

	const [validationErrors, setValidationErrors] = useState<string[]>([])

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
		// Clear validation errors when user types
		setValidationErrors([])
	}

	const validatePassword = (password: string): string[] => {
		const errors: string[] = []

		if (password.length < 8) {
			errors.push('Password must be at least 8 characters long')
		}

		if (!/[A-Z]/.test(password)) {
			errors.push('Password must contain at least one uppercase letter')
		}

		if (!/[a-z]/.test(password)) {
			errors.push('Password must contain at least one lowercase letter')
		}

		if (!/[0-9]/.test(password)) {
			errors.push('Password must contain at least one number')
		}

		if (!/[^A-Za-z0-9]/.test(password)) {
			errors.push('Password must contain at least one special character')
		}

		return errors
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validation
		const errors: string[] = []

		if (!formData.currentPassword) {
			errors.push('Current password is required')
		}

		if (!formData.newPassword) {
			errors.push('New password is required')
		} else {
			errors.push(...validatePassword(formData.newPassword))
		}

		if (formData.newPassword !== formData.confirmPassword) {
			errors.push('New passwords do not match')
		}

		if (formData.currentPassword === formData.newPassword) {
			errors.push('New password must be different from current password')
		}

		if (errors.length > 0) {
			setValidationErrors(errors)
			return
		}

		try {
			await changePassword.mutateAsync({
				currentPassword: formData.currentPassword,
				newPassword: formData.newPassword
			})

			// Success - reset form and close dialog
			setFormData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			})
			setValidationErrors([])
			onOpenChange(false)
		} catch (error) {
			logger.error('Failed to change password', {
				action: 'change_password',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			// Error toast is handled by mutation hook
		}
	}

	const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
		setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
	}

	const handleCancel = () => {
		setFormData({
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		})
		setValidationErrors([])
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" intent="edit">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-[var(--spacing-2)]">
						<Lock className="size-[var(--spacing-5)]" />
						Change Password
					</DialogTitle>
					<DialogDescription>
						Enter your current password and choose a new secure password
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-[var(--spacing-6)]">
					<DialogBody>
						{/* Current Password */}
						<Field>
							<FieldLabel>Current Password *</FieldLabel>
							<div className="relative">
								<input
									type={showPasswords.current ? 'text' : 'password'}
									className="input w-full pr-[var(--spacing-10)]"
									value={formData.currentPassword}
									onChange={e =>
										handleChange('currentPassword', e.target.value)
									}
									disabled={changePassword.isPending}
									required
									autoComplete="current-password"
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('current')}
									className="absolute right-[var(--spacing-3)] top-[50%] -translate-y-[50%] text-muted-foreground hover:text-foreground"
									disabled={changePassword.isPending}
									aria-label={
										showPasswords.current
											? 'Hide current password'
											: 'Show current password'
									}
								>
									{showPasswords.current ? (
										<EyeOff className="size-[var(--spacing-4)]" />
									) : (
										<Eye className="size-[var(--spacing-4)]" />
									)}
								</button>
							</div>
						</Field>

						{/* New Password */}
						<Field>
							<FieldLabel>New Password *</FieldLabel>
							<div className="relative">
								<input
									type={showPasswords.new ? 'text' : 'password'}
									className="input w-full pr-[var(--spacing-10)]"
									value={formData.newPassword}
									onChange={e => handleChange('newPassword', e.target.value)}
									disabled={changePassword.isPending}
									required
									autoComplete="new-password"
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('new')}
									className="absolute right-[var(--spacing-3)] top-[50%] -translate-y-[50%] text-muted-foreground hover:text-foreground"
									disabled={changePassword.isPending}
									aria-label={
										showPasswords.new
											? 'Hide new password'
											: 'Show new password'
									}
								>
									{showPasswords.new ? (
										<EyeOff className="size-[var(--spacing-4)]" />
									) : (
										<Eye className="size-[var(--spacing-4)]" />
									)}
								</button>
							</div>
							<p className="text-caption mt-[var(--spacing-1)]">
								Must be at least 8 characters with uppercase, lowercase, number,
								and special character
							</p>
						</Field>

						{/* Confirm Password */}
						<Field>
							<FieldLabel>Confirm New Password *</FieldLabel>
							<div className="relative">
								<input
									type={showPasswords.confirm ? 'text' : 'password'}
									className="input w-full pr-[var(--spacing-10)]"
									value={formData.confirmPassword}
									onChange={e =>
										handleChange('confirmPassword', e.target.value)
									}
									disabled={changePassword.isPending}
									required
									autoComplete="new-password"
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('confirm')}
									className="absolute right-[var(--spacing-3)] top-[50%] -translate-y-[50%] text-muted-foreground hover:text-foreground"
									disabled={changePassword.isPending}
									aria-label={
										showPasswords.confirm
											? 'Hide confirm password'
											: 'Show confirm password'
									}
								>
									{showPasswords.confirm ? (
										<EyeOff className="size-[var(--spacing-4)]" />
									) : (
										<Eye className="size-[var(--spacing-4)]" />
									)}
								</button>
							</div>
						</Field>

						{/* Validation Errors */}
						{validationErrors.length > 0 && (
							<div className="rounded-[var(--radius-lg)] border border-destructive/50 bg-destructive/10 p-4">
								<p className="font-semibold text-destructive mb-2">
									Please fix the following errors:
								</p>
								<ul className="list-[disc] list-inside space-y-1 text-xs text-destructive">
									{validationErrors.map(error => (
										<li key={error}>{error}</li>
									))}
								</ul>
							</div>
						)}
					</DialogBody>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={changePassword.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={changePassword.isPending}>
							{changePassword.isPending ? 'Changing...' : 'Change Password'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
