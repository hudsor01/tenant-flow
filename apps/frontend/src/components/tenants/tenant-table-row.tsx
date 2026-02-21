'use client'

import { memo } from 'react'
import { Pencil, Trash2, FileText } from 'lucide-react'
import { Checkbox } from '#components/ui/checkbox'
import { Button } from '#components/ui/button'
import type { TenantItem } from '@repo/shared/types/sections/tenants'
import type { LeaseStatus } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { StatusSelectCell } from './tenant-table-helpers'

const logger = createLogger({ component: 'TenantTableRow' })

interface TenantTableRowProps {
	tenant: TenantItem
	isSelected: boolean
	onSelect: (id: string) => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onViewLease: (leaseId: string) => void
}

export const TenantTableRow = memo(function TenantTableRow({
	tenant,
	isSelected,
	onSelect,
	onView,
	onEdit,
	onDelete,
	onViewLease
}: TenantTableRowProps) {
	return (
		<tr
			className={`hover:bg-muted/50 transition-colors ${
				isSelected ? 'bg-primary/5' : ''
			}`}
		>
			<td className="px-4 py-3">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onSelect(tenant.id)}
					aria-label={`Select ${tenant.fullName}`}
				/>
			</td>
			<td className="px-4 py-3">
				<button
					onClick={() => onView(tenant.id)}
					className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
				>
					{tenant.fullName}
				</button>
			</td>
			<td className="px-4 py-3">
				<span className="text-sm text-muted-foreground">{tenant.email}</span>
			</td>
			<td className="px-4 py-3">
				<span className="text-sm text-muted-foreground">
					{tenant.phone || '—'}
				</span>
			</td>
			<td className="px-4 py-3">
				{tenant.currentProperty ? (
					<div className="text-left">
						<p className="text-sm text-foreground">{tenant.currentProperty}</p>
						{tenant.currentUnit && (
							<p className="text-xs text-muted-foreground">
								Unit {tenant.currentUnit}
							</p>
						)}
					</div>
				) : (
					<span className="text-sm text-muted-foreground">—</span>
				)}
			</td>
			<td className="px-4 py-3">
				<StatusSelectCell
					value={tenant.leaseStatus}
					onChange={(value: LeaseStatus) =>
						logger.info('Status change:', {
							tenantId: tenant.id,
							newStatus: value
						})
					}
				/>
			</td>
			<td className="px-4 py-3">
				{tenant.leaseStatus === 'active' ? (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-primary"
						onClick={() => onViewLease(tenant.id)}
					>
						<FileText className="mr-1 h-3.5 w-3.5" />
						View
					</Button>
				) : (
					<span className="text-sm text-muted-foreground">—</span>
				)}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onEdit(tenant.id)}
					>
						<Pencil className="h-4 w-4" />
						<span className="sr-only">Edit</span>
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => onDelete(tenant.id)}
					>
						<Trash2 className="h-4 w-4" />
						<span className="sr-only">Delete</span>
					</Button>
				</div>
			</td>
		</tr>
	)
})
