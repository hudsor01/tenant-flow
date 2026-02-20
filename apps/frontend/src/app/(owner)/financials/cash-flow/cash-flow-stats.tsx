import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface CashFlowStatsProps {
	totalInflows: number
	totalOutflows: number
	netCashFlow: number
}

export function CashFlowStats({
	totalInflows,
	totalOutflows,
	netCashFlow
}: CashFlowStatsProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel>Total Inflows</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						${Math.floor(totalInflows).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<ArrowUpCircle />
					</StatIndicator>
					<StatDescription>money received</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Total Outflows</StatLabel>
					<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
						${Math.floor(totalOutflows).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<ArrowDownCircle />
					</StatIndicator>
					<StatDescription>money spent</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					{netCashFlow > 0 && (
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="var(--color-primary)"
							colorTo="oklch(from var(--color-primary) l c h / 0.3)"
						/>
					)}
					<StatLabel>Net Cash Flow</StatLabel>
					<StatValue
						className={`flex items-baseline ${netCashFlow >= 0 ? '' : 'text-destructive'}`}
					>
						{netCashFlow >= 0 ? '+' : '-'}$
						{Math.abs(Math.floor(netCashFlow)).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Wallet />
					</StatIndicator>
					<StatDescription>net change</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
