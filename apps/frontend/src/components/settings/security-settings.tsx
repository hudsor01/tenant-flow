'use client'

import * as React from 'react'
import {
	Shield,
	CheckCircle,
	Eye,
	EyeOff,
	Loader2,
	AlertTriangle,
	User,
	LogOut
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Skeleton } from '#components/ui/skeleton'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { useUserSessions, useRevokeSession } from '#hooks/api/use-sessions'
import { useMfaStatus, useMfaFactors } from '#hooks/api/use-mfa'
import {
	TwoFactorSetupDialog,
	DisableTwoFactorDialog
} from '#components/auth/two-factor-setup-dialog'

export function SecuritySettings() {
	const supabase = createClient()
	const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
	const [currentPassword, setCurrentPassword] = React.useState('')
	const [newPassword, setNewPassword] = React.useState('')
	const [confirmPassword, setConfirmPassword] = React.useState('')

	// Real MFA status from API
	const { data: mfaStatus, isLoading: mfaLoading } = useMfaStatus()
	const { data: mfaFactors } = useMfaFactors()

	// Real sessions from API
	const { data: sessions, isLoading: sessionsLoading } = useUserSessions()
	const revokeSession = useRevokeSession()

	// 2FA dialogs
	const [show2FASetup, setShow2FASetup] = React.useState(false)
	const [show2FADisable, setShow2FADisable] = React.useState(false)

	const is2FAEnabled = mfaStatus?.isMfaEnabled ?? false
	const verifiedFactor = mfaFactors?.find(f => f.status === 'verified')

	// Password update mutation
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

			// Verify current password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword
			})
			if (signInError) throw new Error('Current password is incorrect')

			// Update password
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

	const handlePasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		updatePassword.mutate()
	}

	const handleRevokeSession = (sessionId: string) => {
		revokeSession.mutate(sessionId)
	}

	const isLoading = mfaLoading || sessionsLoading

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-48 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Security Settings</h2>
					<p className="text-sm text-muted-foreground">
						Manage your password and authentication methods
					</p>
				</div>
			</BlurFade>

			{/* Password Section */}
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

			{/* Two-Factor Authentication */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={80}
						duration={10}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Two-Factor Authentication
					</h3>

					{is2FAEnabled ? (
						<div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
									<Shield className="h-5 w-5 text-success" />
								</div>
								<div>
									<p className="text-sm font-medium flex items-center gap-2">
										2FA is Enabled
										<CheckCircle className="h-4 w-4 text-success" />
									</p>
									<p className="text-xs text-muted-foreground">
										Your account is protected with authenticator app
									</p>
								</div>
							</div>
							<button
								className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
								onClick={() => setShow2FADisable(true)}
							>
								Disable
							</button>
						</div>
					) : (
						<div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
									<Shield className="h-5 w-5 text-amber-600" />
								</div>
								<div>
									<p className="text-sm font-medium">2FA is Not Enabled</p>
									<p className="text-xs text-muted-foreground">
										Add an extra layer of security to your account
									</p>
								</div>
							</div>
							<button
								className="px-3 py-1.5 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
								onClick={() => setShow2FASetup(true)}
							>
								Enable
							</button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Active Sessions */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
							Active Sessions
						</h3>
						<button className="text-sm font-medium text-destructive hover:underline">
							Sign Out All Other Devices
						</button>
					</div>

					<div className="space-y-3">
						{sessions && sessions.length > 0 ? (
							sessions.map((session, idx) => (
								<BlurFade key={session.id} delay={0.4 + idx * 0.05} inView>
									<div
										className={`flex items-center justify-between p-3 rounded-lg border ${
											session.is_current
												? 'bg-primary/5 border-primary/20'
												: 'hover:bg-muted/30'
										} transition-colors`}
									>
										<div className="flex items-center gap-3">
											<User className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium flex items-center gap-2">
													{session.browser || 'Unknown Browser'} on{' '}
													{session.os || 'Unknown OS'}
													{session.is_current && (
														<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
															Current
														</span>
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{session.device === 'mobile'
														? 'Mobile'
														: session.device === 'tablet'
															? 'Tablet'
															: 'Desktop'}{' '}
													· Last active:{' '}
													{new Date(session.updated_at).toLocaleDateString()}
												</p>
											</div>
										</div>
										{!session.is_current && (
											<button
												onClick={() => handleRevokeSession(session.id)}
												disabled={revokeSession.isPending}
												className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
												aria-label="Sign out this device"
											>
												{revokeSession.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<LogOut className="h-4 w-4" />
												)}
											</button>
										)}
									</div>
								</BlurFade>
							))
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">
								No active sessions found
							</p>
						)}
					</div>
				</section>
			</BlurFade>

			{/* 2FA Dialogs */}
			<TwoFactorSetupDialog
				open={show2FASetup}
				onOpenChange={setShow2FASetup}
			/>

			{verifiedFactor && (
				<DisableTwoFactorDialog
					open={show2FADisable}
					onOpenChange={setShow2FADisable}
					factorId={verifiedFactor.id}
				/>
			)}
		</div>
	)
}
