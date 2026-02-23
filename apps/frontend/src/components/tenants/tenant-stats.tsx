'use client'

import { Users, Check, Clock, AlertCircle } from 'lucide-react'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { BorderBeam } from '#components/ui/border-beam'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'

interface TenantStatsProps {
	totalTenants: number
	activeTenants: number
	pendingTenants: number
	endedTenants: number
}

export function TenantStats({
	totalTenants,
	activeTenants,
	pendingTenants,
	endedTenants
}: TenantStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={80}
						duration={10}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary)/0.3)"
					/>
					<StatLabel>Total Tenants</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={totalTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Users />
					</StatIndicator>
					<StatDescription>in your portfolio</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Active</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						<NumberTicker value={activeTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Check />
					</StatIndicator>
					<StatDescription>current leases</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					{pendingTenants > 0 && (
						<BorderBeam
							size={80}
							duration={6}
							colorFrom="hsl(45 93% 47%)"
							colorTo="hsl(45 93% 47% / 0.3)"
						/>
					)}
					<StatLabel>Pending</StatLabel>
					<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
						<NumberTicker value={pendingTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>awaiting signature</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat>
					<StatLabel>Ended</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={endedTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="muted">
						<AlertCircle />
					</StatIndicator>
					<StatDescription>past tenants</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
