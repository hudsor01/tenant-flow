'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import type { PortfolioRow } from '../dashboard-types'
import { formatDashboardCurrency } from '../dashboard-types'

interface PortfolioTableProps {
	data: PortfolioRow[]
	sortField: string
	sortDirection: 'asc' | 'desc'
	onSort: (field: string) => void
}

function SortIndicator({
	field,
	sortField,
	sortDirection
}: {
	field: string
	sortField: string
	sortDirection: 'asc' | 'desc'
}) {
	if (sortField !== field) return null
	return (
		<span className="ml-1 text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
	)
}

export function PortfolioTable({
	data,
	sortField,
	sortDirection,
	onSort
}: PortfolioTableProps) {
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
					<TableHead>Tenants</TableHead>
					<TableHead
						className="cursor-pointer hover:bg-muted/50"
						onClick={() => onSort('status')}
					>
						Lease Status
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
					<TableHead className="text-right">Maintenance</TableHead>
					<TableHead className="w-[100px]">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.map(row => (
					<TableRow key={row.id} className="group">
						<TableCell>
							<div>
								<div className="font-medium">{row.property}</div>
								<div className="text-xs text-muted-foreground">{row.address}</div>
							</div>
						</TableCell>
						<TableCell>
							<span className="tabular-nums">
								{row.units.occupied}/{row.units.total}
							</span>
							<span className="ml-1 text-xs text-muted-foreground">
								occupied
							</span>
						</TableCell>
						<TableCell>
							{row.tenant ? (
								<span className="text-sm">{row.tenant}</span>
							) : (
								<span className="text-sm text-muted-foreground">—</span>
							)}
						</TableCell>
						<TableCell>
							<span
								className={
									row.leaseStatus === 'active'
										? 'text-sm font-medium text-foreground'
										: row.leaseStatus === 'expiring'
											? 'text-sm font-medium text-amber-600 dark:text-amber-500'
											: 'text-sm text-muted-foreground'
								}
							>
								{row.leaseStatus === 'active' && 'Active'}
								{row.leaseStatus === 'expiring' && 'Expiring Soon'}
								{row.leaseStatus === 'vacant' && 'Vacant'}
							</span>
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatDashboardCurrency(row.rent)}
						</TableCell>
						<TableCell className="text-right">
							{row.maintenanceOpen > 0 ? (
								<span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-500">
									{row.maintenanceOpen} open
								</span>
							) : (
								<span className="text-sm text-muted-foreground">—</span>
							)}
						</TableCell>
						<TableCell>
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button className="p-1.5 text-muted-foreground hover:text-foreground rounded">
									Edit
								</button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
