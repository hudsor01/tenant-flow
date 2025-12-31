'use client'

import { useState } from 'react'
import {
	ArrowUpDown,
	FileText,
	Eye,
	MoreHorizontal,
	Pencil,
	Trash2
} from 'lucide-react'
import type { TenantItem } from '@repo/shared/types/sections/tenants'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { SortField, SortDirection } from '../tenant-list-types'
import { getStatusBadge } from '../tenant-list-types'

const logger = createLogger({ component: 'TenantTable' })

interface TenantTableProps {
	tenants: TenantItem[]
	selectedRows: Set<string>
	sortField: SortField
	sortDirection: SortDirection
	onSort: (field: SortField) => void
	onToggleSelectAll: () => void
	onToggleSelect: (id: string) => void
	onView?: ((id: string) => void) | undefined
	onEdit?: ((id: string) => void) | undefined
	onDelete?: ((id: string) => void) | undefined
}

function SortHeader({
	field,
	sortField,
	sortDirection: _sortDirection,
	onSort,
	children,
	className = ''
}: {
	field: SortField
	sortField: SortField
	sortDirection: SortDirection
	onSort: (field: SortField) => void
	children: React.ReactNode
	className?: string
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

function StatusBadge({ status }: { status: TenantItem['leaseStatus'] }) {
	const { className, label } = getStatusBadge(status)
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
		>
			{label}
		</span>
	)
}

export function TenantTable({
	tenants,
	selectedRows,
	sortField,
	sortDirection,
	onSort,
	onToggleSelectAll,
	onToggleSelect,
	onView,
	onEdit,
	onDelete
}: TenantTableProps) {
	const [openMenuId, setOpenMenuId] = useState<string | null>(null)

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border bg-muted/30">
						<th className="w-12 px-4 py-3">
							<input
								type="checkbox"
								checked={
									selectedRows.size === tenants.length && tenants.length > 0
								}
								onChange={onToggleSelectAll}
								className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
							/>
						</th>
						<th className="px-4 py-3 text-left">
							<SortHeader
								field="name"
								sortField={sortField}
								sortDirection={sortDirection}
								onSort={onSort}
								className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Tenant
							</SortHeader>
						</th>
						<th className="px-4 py-3 text-left hidden md:table-cell">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Contact
							</span>
						</th>
						<th className="px-4 py-3 text-left hidden lg:table-cell">
							<SortHeader
								field="property"
								sortField={sortField}
								sortDirection={sortDirection}
								onSort={onSort}
								className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Property
							</SortHeader>
						</th>
						<th className="px-4 py-3 text-left">
							<SortHeader
								field="status"
								sortField={sortField}
								sortDirection={sortDirection}
								onSort={onSort}
								className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Status
							</SortHeader>
						</th>
						<th className="px-4 py-3 text-left hidden xl:table-cell">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Lease
							</span>
						</th>
						<th className="w-20 px-4 py-3"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{tenants.map(tenant => (
						<tr
							key={tenant.id}
							className={`hover:bg-muted/50 transition-colors ${selectedRows.has(tenant.id) ? 'bg-primary/5' : ''}`}
						>
							<td className="px-4 py-3">
								<input
									type="checkbox"
									checked={selectedRows.has(tenant.id)}
									onChange={() => onToggleSelect(tenant.id)}
									className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
								/>
							</td>
							<td className="px-4 py-3">
								<button
									onClick={() => onView?.(tenant.id)}
									className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
								>
									{tenant.fullName}
								</button>
								<p className="text-sm text-muted-foreground truncate md:hidden">
									{tenant.email}
								</p>
							</td>
							<td className="px-4 py-3 hidden md:table-cell">
								<a
									href={`mailto:${tenant.email}`}
									className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
								>
									{tenant.email}
								</a>
								{tenant.phone && (
									<p className="text-sm text-muted-foreground">{tenant.phone}</p>
								)}
							</td>
							<td className="px-4 py-3 hidden lg:table-cell">
								{tenant.currentProperty ? (
									<button
										onClick={() =>
											logger.info('View property clicked', {
												property: tenant.currentProperty
											})
										}
										className="text-left hover:text-primary transition-colors group"
									>
										<p className="text-sm text-foreground group-hover:text-primary group-hover:underline">
											{tenant.currentProperty}
										</p>
										{tenant.currentUnit && (
											<p className="text-xs text-muted-foreground">
												Unit {tenant.currentUnit}
											</p>
										)}
									</button>
								) : (
									<span className="text-sm text-muted-foreground">—</span>
								)}
							</td>
							<td className="px-4 py-3">
								<StatusBadge status={tenant.leaseStatus} />
							</td>
							<td className="px-4 py-3 hidden xl:table-cell">
								{tenant.leaseId ? (
									<button className="text-sm text-primary hover:underline flex items-center gap-1">
										<FileText className="w-3.5 h-3.5" />
										View
									</button>
								) : (
									<span className="text-sm text-muted-foreground">—</span>
								)}
							</td>
							<td className="px-4 py-3">
								<div className="flex items-center justify-end gap-1">
									<button
										onClick={() => onView?.(tenant.id)}
										className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
										title="View tenant"
										aria-label="View tenant"
									>
										<Eye className="w-4 h-4" />
									</button>
									<div className="relative">
										<button
											onClick={() =>
												setOpenMenuId(
													openMenuId === tenant.id ? null : tenant.id
												)
											}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="More actions"
											aria-label="More actions"
											aria-expanded={openMenuId === tenant.id}
										>
											<MoreHorizontal className="w-4 h-4" />
										</button>
										{openMenuId === tenant.id && (
											<>
												<div
													className="fixed inset-0 z-10"
													onClick={() => setOpenMenuId(null)}
												/>
												<div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-sm shadow-lg z-20 py-1">
													<button
														onClick={() => {
															onEdit?.(tenant.id)
															setOpenMenuId(null)
														}}
														className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
													>
														<Pencil className="w-4 h-4" />
														Edit
													</button>
													<button
														onClick={() => {
															onDelete?.(tenant.id)
															setOpenMenuId(null)
														}}
														className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
													>
														<Trash2 className="w-4 h-4" />
														Delete
													</button>
												</div>
											</>
										)}
									</div>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
