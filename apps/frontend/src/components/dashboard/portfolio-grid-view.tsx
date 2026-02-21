'use client'

import Link from 'next/link'
import { formatCents } from '#lib/formatters/currency'
import type { LeaseStatus, PortfolioRow } from './portfolio-types'

function StatusBadge({ status }: { status: LeaseStatus }) {
	const styles: Record<LeaseStatus, string> = {
		active:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
		expiring:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		vacant:
			'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
	}
	const labels: Record<LeaseStatus, string> = {
		active: 'Active',
		expiring: 'Expiring',
		vacant: 'Vacant'
	}
	return (
		<span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[status]}`}>
			{labels[status]}
		</span>
	)
}

interface PortfolioGridViewProps {
	rows: PortfolioRow[]
}

export function PortfolioGridView({ rows }: PortfolioGridViewProps) {
	return (
		<div className="@container p-4">
			<div className="grid gap-4 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
				{rows.map(row => (
					<Link
						key={row.id}
						href={`/properties/${row.id}`}
						className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm transition-all duration-fast group"
					>
						<div className="flex items-start justify-between gap-2 mb-3">
							<div className="min-w-0">
								<div className="font-medium text-foreground truncate">
									{row.property}
								</div>
								<div className="text-xs text-muted-foreground truncate">
									{row.address}
								</div>
							</div>
							<StatusBadge status={row.leaseStatus} />
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<div className="text-muted-foreground text-xs font-medium">
									Units
								</div>
								<div className="tabular-nums text-foreground">
									{row.units.occupied}/{row.units.total}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs font-medium">
									Rent
								</div>
								<div className="tabular-nums text-foreground">
									{formatCents(row.rent)}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs font-medium">
									Tenants
								</div>
								<div className="text-foreground">{row.tenant || '—'}</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs font-medium">
									Status
								</div>
								<div className="text-foreground capitalize">
									{row.leaseStatus}
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	)
}
