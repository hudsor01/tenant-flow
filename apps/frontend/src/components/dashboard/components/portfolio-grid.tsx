'use client'

import type { PortfolioRow } from '../dashboard-types'
import { formatDashboardCurrency } from '../dashboard-types'

interface PortfolioGridProps {
	data: PortfolioRow[]
}

export function PortfolioGrid({ data }: PortfolioGridProps) {
	return (
		<div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{data.map(row => (
				<div
					key={row.id}
					className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
				>
					<div className="flex items-start justify-between mb-3">
						<div>
							<div className="font-medium">{row.property}</div>
							<div className="text-xs text-muted-foreground">{row.address}</div>
						</div>
						<span
							className={`text-xs font-medium px-2 py-0.5 rounded ${
								row.leaseStatus === 'active'
									? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
									: row.leaseStatus === 'expiring'
										? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
										: 'bg-muted text-muted-foreground'
							}`}
						>
							{row.leaseStatus === 'active' && 'Active'}
							{row.leaseStatus === 'expiring' && 'Expiring'}
							{row.leaseStatus === 'vacant' && 'Vacant'}
						</span>
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<div className="text-muted-foreground text-xs">Units</div>
							<div className="tabular-nums">
								{row.units.occupied}/{row.units.total}
							</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Rent</div>
							<div className="tabular-nums">
								{formatDashboardCurrency(row.rent)}
							</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Tenants</div>
							<div>{row.tenant || '—'}</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Maintenance</div>
							<div
								className={
									row.maintenanceOpen > 0
										? 'text-red-600 dark:text-red-500'
										: ''
								}
							>
								{row.maintenanceOpen > 0 ? `${row.maintenanceOpen} open` : '—'}
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
