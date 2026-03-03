'use client'

import { useState } from 'react'
import { BlurFade } from '#components/ui/blur-fade'
import { ConnectAccountStatus } from '#components/connect/connect-account-status'
import { ConnectRequirements } from '#components/connect/connect-requirements'
import { ConnectOnboardingDialog } from '#app/(tenant)/tenant/settings/stripe-connect-onboarding'
import { useConnectedAccount } from '#hooks/api/use-stripe-connect'

export function ConnectAccountSection() {
	const [showOnboarding, setShowOnboarding] = useState(false)
	const { data: connectedAccount } = useConnectedAccount()

	return (
		<>
			<BlurFade delay={0.45} inView>
				<section className="space-y-4">
					<div className="mb-2">
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
							Payment Account
						</h3>
						<p className="text-xs text-muted-foreground mt-1">
							Receive rent payments from your tenants
						</p>
					</div>
					<ConnectAccountStatus onSetupClick={() => setShowOnboarding(true)} />
					{connectedAccount?.requirements_due &&
						connectedAccount.requirements_due.length > 0 && (
							<ConnectRequirements
								requirements={connectedAccount.requirements_due}
							/>
						)}
				</section>
			</BlurFade>

			<ConnectOnboardingDialog
				open={showOnboarding}
				onOpenChange={setShowOnboarding}
			/>
		</>
	)
}
