'use client'

import { useState } from 'react'
import { Shield, CheckCircle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Skeleton } from '#components/ui/skeleton'
import { useMfaStatus, useMfaFactors } from '#hooks/api/use-mfa'
import { useUserSessions } from '#hooks/api/use-sessions'
import {
	TwoFactorSetupDialog,
	DisableTwoFactorDialog
} from '#components/auth/two-factor-setup-dialog'
import { SecurityPasswordSection } from './security-password-section'
import { SecuritySessionsSection } from './security-sessions-section'

export function SecuritySettings() {
	const { data: mfaStatus, isLoading: mfaLoading } = useMfaStatus()
	const { data: mfaFactors } = useMfaFactors()
	const { isLoading: sessionsLoading } = useUserSessions()

	const [show2FASetup, setShow2FASetup] = useState(false)
	const [show2FADisable, setShow2FADisable] = useState(false)

	const is2FAEnabled = mfaStatus?.isMfaEnabled ?? false
	const verifiedFactor = mfaFactors?.find(f => f.status === 'verified')

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

			<SecurityPasswordSection />

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

			<SecuritySessionsSection />

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
