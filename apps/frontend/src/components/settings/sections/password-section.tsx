'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'

export function PasswordSection() {
	const supabase = createClient()
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	const updatePassword = useMutation({
		mutationFn: async () => {
			if (newPassword !== confirmPassword) {
				throw new Error('Passwords do not match')
			}
			if (newPassword.length < 8) {
				throw new Error('Password must be at least 8 characters')
			}

			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser()
			if (userError || !user?.email) throw new Error('Unable to verify user')

			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword
			})
			if (signInError) throw new Error('Current password is incorrect')

			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Password updated successfully')
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to update password'
			)
		}
	})

	const handlePasswordSubmit = (e: FormEvent) => {
		e.preventDefault()
		updatePassword.mutate()
	}

	return (
		<BlurFade delay={0.15} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Password
				</h3>

				<form onSubmit={handlePasswordSubmit} className="space-y-4">
					<div className="grid gap-2">
						<label htmlFor="currentPassword" className="text-sm font-medium">
							Current Password
						</label>
						<div className="relative">
							<input
								id="currentPassword"
								type={showCurrentPassword ? 'text' : 'password'}
								placeholder="Enter current password"
								value={currentPassword}
								onChange={e => setCurrentPassword(e.target.value)}
								autoComplete="current-password"
								className="h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
							<button
								type="button"
								onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								aria-label={
									showCurrentPassword ? 'Hide password' : 'Show password'
								}
							>
								{showCurrentPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>

					<div className="grid gap-2">
						<label htmlFor="newPassword" className="text-sm font-medium">
							New Password
						</label>
						<input
							id="newPassword"
							data-testid="password-strength"
							type="password"
							placeholder="Enter new password"
							value={newPassword}
							onChange={e => setNewPassword(e.target.value)}
							disabled={updatePassword.isPending}
							className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
						<p className="text-xs text-muted-foreground">
							Must be at least 8 characters with uppercase, lowercase, and
							numbers
						</p>
					</div>

					<div className="grid gap-2">
						<label htmlFor="confirmPassword" className="text-sm font-medium">
							Confirm New Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							placeholder="Confirm new password"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
							className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
						/>
						{confirmPassword && newPassword !== confirmPassword && (
							<p className="text-xs text-destructive flex items-center gap-1">
								<AlertTriangle className="h-3 w-3" />
								Passwords do not match
							</p>
						)}
						{confirmPassword &&
							newPassword === confirmPassword &&
							newPassword.length >= 8 && (
								<p className="text-xs text-primary flex items-center gap-1">
									<CheckCircle className="h-3 w-3" />
									Passwords match
								</p>
							)}
					</div>

					<div className="flex justify-end">
						<button
							type="submit"
							disabled={
								updatePassword.isPending ||
								!currentPassword ||
								!newPassword ||
								!confirmPassword ||
								newPassword !== confirmPassword ||
								newPassword.length < 8
							}
							className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
						>
							{updatePassword.isPending ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									Updating...
								</span>
							) : (
								'Update Password'
							)}
						</button>
					</div>
				</form>
			</section>
		</BlurFade>
	)
}
