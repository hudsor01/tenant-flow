'use client'

import Link from 'next/link'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { formatCents } from '#lib/formatters/currency'
import type { LeaseStatus, PortfolioRow } from './portfolio-types'

interface SortIndicatorProps {
	field: string
	sortField: string
	sortDirection: 'asc' | 'desc'
}

function SortIndicator({ field, sortField, sortDirection }: SortIndicatorProps) {
	if (sortField !== field) return null
	return (
		<span className="ml-1 text-xs">
			{sortDirection === 'asc' ? '↑' : '↓'}
		</span>
	)
}

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

interface PortfolioTableViewProps {
	rows: PortfolioRow[]
	sortField: string
	sortDirection: 'asc' | 'desc'
	onSort: (field: string) => void
}

export function PortfolioTableView({
	rows,
	sortField,
	sortDirection,
	onSort
}: PortfolioTableViewProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead
						className="cursor-pointer hover:bg-muted/50"
						onClick={() => onSort('property')}
					>
						Property
						<SortIndicator
							field="property"
							sortField={sortField}
							sortDirection={sortDirection}
						/>
					</TableHead>
					<TableHead
						className="cursor-pointer hover:bg-muted/50"
						onClick={() => onSort('units')}
					>
						Units
						<SortIndicator
							field="units"
							sortField={sortField}
							sortDirection={sortDirection}
						/>
					</TableHead>
					<TableHead
						className="cursor-pointer hover:bg-muted/50 hidden md:table-cell"
						onClick={() => onSort('status')}
					>
						Status
						<SortIndicator
							field="status"
							sortField={sortField}
							sortDirection={sortDirection}
						/>
					</TableHead>
					<TableHead
						className="text-right cursor-pointer hover:bg-muted/50"
						onClick={() => onSort('rent')}
					>
						Monthly Rent
						<SortIndicator
							field="rent"
							sortField={sortField}
							sortDirection={sortDirection}
						/>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(row => (
					<TableRow key={row.id} className="group">
						<TableCell>
							<Link
								href={`/properties/${row.id}`}
								className="hover:underline"
							>
								<div className="font-medium">{row.property}</div>
								<div className="text-xs text-muted-foreground">
									{row.address}
								</div>
							</Link>
						</TableCell>
						<TableCell>
							<span className="tabular-nums">
								{row.units.occupied}/{row.units.total}
							</span>
							<span className="ml-1 text-xs text-muted-foreground">
								occupied
							</span>
						</TableCell>
						<TableCell className="hidden md:table-cell">
							<StatusBadge status={row.leaseStatus} />
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatCents(row.rent)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
