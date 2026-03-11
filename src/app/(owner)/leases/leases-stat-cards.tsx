import { FileText, Check, AlertTriangle, Clock } from 'lucide-react'

interface LeasesStatCardsProps {
	totalLeases: number
	activeLeases: number
	expiringLeases: number
	pendingLeases: number
}

export function LeasesStatCards({
	totalLeases,
	activeLeases,
	expiringLeases,
	pendingLeases
}: LeasesStatCardsProps) {
	const cards = [
		{ label: 'Total Leases', value: totalLeases, icon: FileText },
		{ label: 'Active', value: activeLeases, icon: Check },
		{ label: 'Expiring Soon', value: expiringLeases, icon: AlertTriangle },
		{ label: 'Pending', value: pendingLeases, icon: Clock }
	]

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			{cards.map(card => (
				<div
					key={card.label}
					className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group"
				>
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">{card.label}</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{card.value}</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<card.icon className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
