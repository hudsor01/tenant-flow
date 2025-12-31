'use client'

import { FileText, Check, AlertTriangle, Clock } from 'lucide-react'

interface LeasesStatsCardsProps {
	totalLeases: number
	activeLeases: number
	expiringLeases: number
	pendingLeases: number
}

export function LeasesStatsCards({
	totalLeases,
	activeLeases,
	expiringLeases,
	pendingLeases
}: LeasesStatsCardsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
				<div className="flex items-center justify-between mb-2">
					<p className="text-sm text-muted-foreground">Total Leases</p>
				</div>
				<div className="flex items-end justify-between">
					<p className="text-2xl font-bold text-foreground">{totalLeases}</p>
					<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
						<FileText className="w-4 h-4 text-primary" />
					</div>
				</div>
			</div>
			<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
				<div className="flex items-center justify-between mb-2">
					<p className="text-sm text-muted-foreground">Active</p>
				</div>
				<div className="flex items-end justify-between">
					<p className="text-2xl font-bold text-foreground">{activeLeases}</p>
					<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
						<Check className="w-4 h-4 text-primary" />
					</div>
				</div>
			</div>
			<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
				<div className="flex items-center justify-between mb-2">
					<p className="text-sm text-muted-foreground">Expiring Soon</p>
				</div>
				<div className="flex items-end justify-between">
					<p className="text-2xl font-bold text-foreground">{expiringLeases}</p>
					<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
						<AlertTriangle className="w-4 h-4 text-primary" />
					</div>
				</div>
			</div>
			<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
				<div className="flex items-center justify-between mb-2">
					<p className="text-sm text-muted-foreground">Pending</p>
				</div>
				<div className="flex items-end justify-between">
					<p className="text-2xl font-bold text-foreground">{pendingLeases}</p>
					<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
						<Clock className="w-4 h-4 text-primary" />
					</div>
				</div>
			</div>
		</div>
	)
}
