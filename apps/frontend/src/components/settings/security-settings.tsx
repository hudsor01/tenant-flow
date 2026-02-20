'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { Skeleton } from '#components/ui/skeleton'
import { useMfaStatus } from '#hooks/api/use-mfa'
import { useUserSessions } from '#hooks/api/use-sessions'
import { PasswordSection } from '#components/settings/sections/password-section'
import { TwoFactorSection } from '#components/settings/sections/two-factor-section'
import { ActiveSessionsSection } from '#components/settings/sections/active-sessions-section'
import { AccountDangerSection } from '#components/settings/sections/account-danger-section'

export function SecuritySettings() {
	const { isLoading: mfaLoading } = useMfaStatus()
	const { isLoading: sessionsLoading } = useUserSessions()

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

			<PasswordSection />
			<TwoFactorSection />
			<ActiveSessionsSection />
			<AccountDangerSection />
		</div>
	)
}
