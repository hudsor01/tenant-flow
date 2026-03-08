import type { ReactNode } from 'react'
import { ArrowUpDown, Eye, Pencil, RefreshCw, XCircle } from 'lucide-react'
import { formatDate } from '#lib/formatters/date'
import { getStatusConfig, type LeaseDisplay, type SortField } from './lease-utils'

export function SortHeader({
	field,
	sortField,
	children,
	className = '',
	onSort
}: {
	field: SortField
	sortField: SortField
	children: ReactNode
	className?: string
	onSort: (field: SortField) => void
}) {
	return (
		<button
			onClick={() => onSort(field)}
			className={`flex items-center gap-1 hover:text-foreground transition-colors group ${className}`}
		>
			{children}
			<ArrowUpDown
				className={`w-3.5 h-3.5 transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`}
			/>
		</button>
	)
}

export function StatusBadge({ status }: { status: string }) {
	const config = getStatusConfig(status)
	return (
		<span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${config.className}`}>
			{config.label}
		</span>
	)
}

interface LeaseRowProps {
	lease: LeaseDisplay
	isSelected: boolean
	onToggleSelect: (id: string) => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onRenew: (lease: LeaseDisplay) => void
	onTerminate: (lease: LeaseDisplay) => void
}

export function LeaseRow({
	lease,
	isSelected,
	onToggleSelect,
	onView,
	onEdit,
	onRenew,
	onTerminate
}: LeaseRowProps) {
	return (
		<tr className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
			<td className="px-4 py-3">
				<input
					type="checkbox"
					checked={isSelected}
					onChange={() => onToggleSelect(lease.id)}
					className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
				/>
			</td>
			<td className="px-4 py-3">
				<button
					onClick={() => onView(lease.id)}
					className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
				>
					{lease.tenantName}
				</button>
				<p className="text-xs text-muted-foreground">
					{formatDate(lease.startDate, { fallback: 'N/A' })} -{' '}
					{formatDate(lease.endDate, { fallback: 'N/A' })}
				</p>
				<p className="text-sm text-muted-foreground lg:hidden">{lease.propertyName}</p>
			</td>
			<td className="px-4 py-3 hidden lg:table-cell">
				<p className="text-sm text-foreground">{lease.propertyName}</p>
				<p className="text-xs text-muted-foreground">Unit {lease.unitNumber}</p>
			</td>
			<td className="px-4 py-3">
				<StatusBadge status={lease.status} />
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center justify-end gap-1">
					<button onClick={() => onView(lease.id)} className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View">
						<Eye className="w-4 h-4" />
					</button>
					<button onClick={() => onEdit(lease.id)} className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
						<Pencil className="w-4 h-4" />
					</button>
					{lease.status === 'active' && (
						<>
							<button onClick={() => onRenew(lease)} className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Renew Lease">
								<RefreshCw className="w-4 h-4" />
							</button>
							<button onClick={() => onTerminate(lease)} className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Terminate Lease">
								<XCircle className="w-4 h-4" />
							</button>
						</>
					)}
				</div>
			</td>
		</tr>
	)
}
