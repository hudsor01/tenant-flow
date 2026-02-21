'use client'

import { DollarSign, Wallet, Clock, ArrowDownRight } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { NumberTicker } from '#components/ui/number-ticker'

interface PayoutsSummaryStatsProps {
	availableUSD: number
	pendingUSD: number
	totalPaidOut: number
	paidCount: number
	inTransitCount: number
}

export function PayoutsSummaryStats({
	availableUSD,
	pendingUSD,
	totalPaidOut,
	paidCount,
	inTransitCount
}: PayoutsSummaryStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.15} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel>Available Balance</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(availableUSD / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatDescription>ready for payout</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Pending Balance</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(pendingUSD / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>processing</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<StatLabel>Total Paid Out</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(totalPaidOut / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Wallet />
					</StatIndicator>
					<StatDescription>{paidCount} payouts</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>In Transit</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-blue-600 dark:text-blue-400">
						<NumberTicker value={inTransitCount} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<ArrowDownRight />
					</StatIndicator>
					<StatDescription>pending arrival</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
