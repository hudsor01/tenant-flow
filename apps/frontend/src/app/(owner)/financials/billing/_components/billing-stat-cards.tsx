'use client'

import { Building, CheckCircle, XCircle, CreditCard, Clock } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import type { ConnectedAccountWithIdentity } from '@repo/shared/types/stripe'

interface BillingStatCardsProps {
	account: ConnectedAccountWithIdentity
	isActive: boolean
	isPending: boolean
}

export function BillingStatCards({
	account,
	isActive,
	isPending
}: BillingStatCardsProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<BlurFade delay={0.15} inView>
				<Stat className="relative overflow-hidden">
					{isActive && (
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
					)}
					<StatLabel>Account Status</StatLabel>
					<StatValue
						className={`flex items-baseline capitalize ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
					>
						{account.identityVerification?.status || 'Incomplete'}
					</StatValue>
					<StatIndicator
						variant="icon"
						color={isActive ? 'success' : 'warning'}
					>
						{isActive ? <CheckCircle /> : isPending ? <Clock /> : <XCircle />}
					</StatIndicator>
					<StatDescription>
						{isActive ? 'Verified & active' : 'Needs attention'}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					{account.charges_enabled && (
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
					)}
					<StatLabel>Charges</StatLabel>
					<StatValue
						className={`flex items-baseline ${account.charges_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
					>
						{account.charges_enabled ? 'Enabled' : 'Disabled'}
					</StatValue>
					<StatIndicator
						variant="icon"
						color={account.charges_enabled ? 'success' : 'destructive'}
					>
						<CreditCard />
					</StatIndicator>
					<StatDescription>
						{account.charges_enabled ? 'Can accept payments' : 'Complete setup'}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					{account.payouts_enabled && (
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
					)}
					<StatLabel>Payouts</StatLabel>
					<StatValue
						className={`flex items-baseline ${account.payouts_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
					>
						{account.payouts_enabled ? 'Enabled' : 'Disabled'}
					</StatValue>
					<StatIndicator
						variant="icon"
						color={account.payouts_enabled ? 'success' : 'destructive'}
					>
						<Building />
					</StatIndicator>
					<StatDescription>
						{account.payouts_enabled ? 'Can receive funds' : 'Complete setup'}
					</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
