'use client'

/**
 * Tenants Component - Design-OS UI
 *
 * Pure UI component that receives all data via props.
 * Wired to production API via the page component.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import {
	Users,
	UserPlus,
	LayoutGrid,
	List,
	Check,
	Clock,
	AlertCircle,
	AlertTriangle,
	Mail,
	Download,
	Eye,
	Pencil,
	Trash2,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	X,
	Phone,
	MapPin,
	CreditCard,
	FileText,
	Search
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Checkbox } from '#components/ui/checkbox'
import { Button } from '#components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '#components/ui/sheet'

// ============================================================================
// TYPES
// ============================================================================

export type LeaseStatus =
	| 'draft'
	| 'pending_signature'
	| 'active'
	| 'ended'
	| 'terminated'

export interface TenantItem {
	id: string
	fullName: string
	email: string
	phone: string | undefined
	currentProperty: string | undefined
	currentUnit: string | undefined
	leaseStatus: LeaseStatus | undefined
	leaseId: string | undefined
	totalPaid: number
}

export interface TenantDetail extends TenantItem {
	emergencyContactName: string | undefined
	emergencyContactPhone: string | undefined
	emergencyContactRelationship: string | undefined
	identityVerified: boolean
	currentLease:
		| {
				id: string
				propertyName: string
				unitNumber: string
				startDate: string
				endDate: string | null
				rentAmount: number
				autopayEnabled: boolean
		  }
		| undefined
	paymentHistory?: Array<{
		id: string
		amount: number
		status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
		dueDate: string
		paidDate?: string
	}>
	leaseHistory?: Array<{
		id: string
		propertyName: string
		unitNumber: string
		startDate: string
		endDate: string
		rentAmount: number
		status: LeaseStatus
	}>
	createdAt: string
	updatedAt: string
}

export interface TenantsProps {
	tenants: TenantItem[]
	selectedTenant: TenantDetail | undefined
	isLoading?: boolean
	onInviteTenant?: () => void
	onViewTenant?: (tenantId: string) => void
	onEditTenant?: (tenantId: string) => void
	onDeleteTenant?: (tenantId: string) => void
	onContactTenant?: (tenantId: string, method: 'email' | 'phone') => void
	onViewLease?: (leaseId: string) => void
	onExport?: () => void
	onMessageAll?: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(cents / 100)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

type PaymentStatus =
	| 'pending'
	| 'processing'
	| 'succeeded'
	| 'failed'
	| 'canceled'

function PaymentStatusIcon({ status }: { status: PaymentStatus }) {
	switch (status) {
		case 'succeeded':
			return <Check className="w-4 h-4 text-emerald-500" />
		case 'pending':
		case 'processing':
			return <Clock className="w-4 h-4 text-amber-500" />
		case 'failed':
		case 'canceled':
			return <AlertTriangle className="w-4 h-4 text-red-500" />
		default:
			return null
	}
}

// ============================================================================
// SORTABLE COLUMN HEADER
// ============================================================================

type SortField = 'fullName' | 'email' | 'property' | 'leaseStatus' | null
type SortDirection = 'asc' | 'desc' | null

function SortableHeader({
	title,
	field,
	currentSort,
	currentDirection,
	onSort
}: {
	title: string
	field: SortField
	currentSort: SortField
	currentDirection: SortDirection
	onSort: (field: SortField) => void
}) {
	const isActive = currentSort === field

	return (
		<button
			onClick={() => onSort(field)}
			className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
		>
			{title}
			{isActive ? (
				currentDirection === 'asc' ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)
			) : (
				<ChevronsUpDown className="h-4 w-4 opacity-50" />
			)}
		</button>
	)
}

// ============================================================================
// STATUS SELECT
// ============================================================================

function getStatusBadge(status: LeaseStatus | undefined) {
	const config: Record<LeaseStatus, { className: string; label: string }> = {
		draft: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending'
		},
		active: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		}
	}

	const statusConfig = config[status ?? 'draft'] ?? config.draft

	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
		>
			{statusConfig.label}
		</span>
	)
}

// ============================================================================
// TENANT TABLE
// ============================================================================

interface TenantTableProps {
	tenants: TenantItem[]
	selectedIds: Set<string>
	onSelectChange: (ids: string[]) => void
	onSelectAll: () => void
	onDeselectAll: () => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onViewLease: ((leaseId: string) => void) | undefined
}

function TenantTable({
	tenants,
	selectedIds,
	onSelectChange,
	onSelectAll,
	onDeselectAll,
	onView,
	onEdit,
	onDelete,
	onViewLease
}: TenantTableProps) {
	const [sortField, setSortField] = React.useState<SortField>(null)
	const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
	const [pageIndex, setPageIndex] = React.useState(0)
	const pageSize = 10

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			if (sortDirection === 'asc') {
				setSortDirection('desc')
			} else if (sortDirection === 'desc') {
				setSortField(null)
				setSortDirection(null)
			}
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const sortedTenants = React.useMemo(() => {
		if (!sortField || !sortDirection) return tenants

		return [...tenants].sort((a, b) => {
			let aVal = ''
			let bVal = ''

			switch (sortField) {
				case 'fullName':
					aVal = a.fullName
					bVal = b.fullName
					break
				case 'email':
					aVal = a.email
					bVal = b.email
					break
				case 'property':
					aVal = a.currentProperty || ''
					bVal = b.currentProperty || ''
					break
				case 'leaseStatus':
					aVal = a.leaseStatus || ''
					bVal = b.leaseStatus || ''
					break
			}

			const comparison = aVal.localeCompare(bVal)
			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [tenants, sortField, sortDirection])

	const paginatedTenants = sortedTenants.slice(
		pageIndex * pageSize,
		(pageIndex + 1) * pageSize
	)

	const totalPages = Math.ceil(sortedTenants.length / pageSize)

	const allSelected =
		paginatedTenants.length > 0 &&
		paginatedTenants.every(t => selectedIds.has(t.id))
	const someSelected =
		paginatedTenants.some(t => selectedIds.has(t.id)) && !allSelected

	const handleSelectAll = () => {
		if (allSelected) {
			onDeselectAll()
		} else {
			onSelectAll()
		}
	}

	const handleSelectOne = (id: string) => {
		const newIds = new Set(selectedIds)
		if (newIds.has(id)) {
			newIds.delete(id)
		} else {
			newIds.add(id)
		}
		onSelectChange(Array.from(newIds))
	}

	return (
		<div className="w-full">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="border-b border-border bg-muted/30">
						<tr>
							<th className="w-12 px-4 py-3">
								<Checkbox
									checked={
										allSelected ? true : someSelected ? 'indeterminate' : false
									}
									onCheckedChange={handleSelectAll}
									aria-label="Select all"
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Tenant"
									field="fullName"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left hidden md:table-cell">
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Contact
								</span>
							</th>
							<th className="px-4 py-3 text-left hidden lg:table-cell">
								<SortableHeader
									title="Property"
									field="property"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Status"
									field="leaseStatus"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
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
						{paginatedTenants.map(tenant => (
							<tr
								key={tenant.id}
								className={`hover:bg-muted/50 transition-colors ${
									selectedIds.has(tenant.id) ? 'bg-primary/5' : ''
								}`}
							>
								<td className="px-4 py-3">
									<Checkbox
										checked={selectedIds.has(tenant.id)}
										onCheckedChange={() => handleSelectOne(tenant.id)}
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
										<p className="text-sm text-muted-foreground">
											{tenant.phone}
										</p>
									)}
								</td>
								<td className="px-4 py-3 hidden lg:table-cell">
									{tenant.currentProperty ? (
										<div className="text-left">
											<p className="text-sm text-foreground">
												{tenant.currentProperty}
											</p>
											{tenant.currentUnit && (
												<p className="text-xs text-muted-foreground">
													Unit {tenant.currentUnit}
												</p>
											)}
										</div>
									) : (
										<span className="text-sm text-muted-foreground">-</span>
									)}
								</td>
								<td className="px-4 py-3">
									{getStatusBadge(tenant.leaseStatus)}
								</td>
								<td className="px-4 py-3 hidden xl:table-cell">
									{tenant.leaseId && onViewLease ? (
										<button
											onClick={() => onViewLease(tenant.leaseId!)}
											className="text-sm text-primary hover:underline flex items-center gap-1"
										>
											<FileText className="w-3.5 h-3.5" />
											View
										</button>
									) : (
										<span className="text-sm text-muted-foreground">-</span>
									)}
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center justify-end gap-1">
										<button
											onClick={() => onView(tenant.id)}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="View tenant"
											aria-label="View tenant"
										>
											<Eye className="w-4 h-4" />
										</button>
										<button
											onClick={() => onEdit(tenant.id)}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="Edit tenant"
											aria-label="Edit tenant"
										>
											<Pencil className="w-4 h-4" />
										</button>
										<button
											onClick={() => onDelete(tenant.id)}
											className="p-2 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
											title="Delete tenant"
											aria-label="Delete tenant"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between px-4 py-3 border-t border-border">
					<span className="text-sm text-muted-foreground">
						Showing {pageIndex * pageSize + 1}-
						{Math.min((pageIndex + 1) * pageSize, sortedTenants.length)} of{' '}
						{sortedTenants.length}
					</span>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
							disabled={pageIndex === 0}
							className="p-2 rounded-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Previous page"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						{Array.from({ length: totalPages }, (_, i) => i).map(page => (
							<button
								key={page}
								onClick={() => setPageIndex(page)}
								className={`min-w-8 h-8 px-2 text-sm font-medium rounded-sm transition-colors ${
									page === pageIndex
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-muted text-muted-foreground'
								}`}
							>
								{page + 1}
							</button>
						))}
						<button
							onClick={() =>
								setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
							}
							disabled={pageIndex >= totalPages - 1}
							className="p-2 rounded-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Next page"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

// ============================================================================
// TENANT GRID
// ============================================================================

interface TenantGridProps {
	tenants: TenantItem[]
	selectedIds: Set<string>
	onSelectChange: (ids: string[]) => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onContact: (id: string, method: 'email' | 'phone') => void
}

function TenantGrid({
	tenants,
	selectedIds,
	onSelectChange,
	onView,
	onEdit,
	onDelete,
	onContact
}: TenantGridProps) {
	const toggleSelect = (id: string) => {
		const newSelected = new Set(selectedIds)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		onSelectChange(Array.from(newSelected))
	}

	return (
		<div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{tenants.map((tenant, idx) => {
				const isActive = tenant.leaseStatus === 'active'
				const isSelected = selectedIds.has(tenant.id)

				return (
					<BlurFade key={tenant.id} delay={0.05 + idx * 0.03} inView>
						<div
							className={`bg-card border rounded-lg p-4 transition-all hover:shadow-md relative overflow-hidden ${
								isSelected
									? 'border-primary ring-2 ring-primary/20'
									: 'border-border'
							}`}
						>
							{isActive && (
								<BorderBeam
									size={100}
									duration={12}
									colorFrom="oklch(from var(--color-primary) l c h / 0.5)"
									colorTo="transparent"
								/>
							)}

							{/* Header */}
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleSelect(tenant.id)}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
									<button
										onClick={() => onView(tenant.id)}
										className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
									>
										{tenant.fullName}
									</button>
									{isActive && (
										<span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
											<Check className="w-3 h-3" />
											Active
										</span>
									)}
								</div>
							</div>

							{/* Contact Info */}
							<div className="space-y-2 mb-4">
								<button
									onClick={() => onContact(tenant.id, 'email')}
									className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full group"
								>
									<Mail className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
									<span className="truncate">{tenant.email}</span>
								</button>
								{tenant.phone && (
									<button
										onClick={() => onContact(tenant.id, 'phone')}
										className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full group"
									>
										<Phone className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
										<span>{tenant.phone}</span>
									</button>
								)}
							</div>

							{/* Property */}
							{tenant.currentProperty && (
								<div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
									<MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-foreground">{tenant.currentProperty}</p>
										{tenant.currentUnit && (
											<p className="text-xs">Unit {tenant.currentUnit}</p>
										)}
									</div>
								</div>
							)}

							{/* Actions */}
							<div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
								<button
									onClick={() => onView(tenant.id)}
									className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
									title="View"
									aria-label="View tenant"
								>
									<Eye className="w-4 h-4" />
								</button>
								<button
									onClick={() => onEdit(tenant.id)}
									className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
									title="Edit"
									aria-label="Edit tenant"
								>
									<Pencil className="w-4 h-4" />
								</button>
								<button
									onClick={() => onDelete(tenant.id)}
									className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
									title="Delete"
									aria-label="Delete tenant"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					</BlurFade>
				)
			})}
		</div>
	)
}

// ============================================================================
// FLOATING ACTION BAR
// ============================================================================

interface TenantActionBarProps {
	selectedCount: number
	isVisible: boolean
	onDelete: () => void
	onExport: () => void
	onMessageAll?: () => void
	onClose: () => void
}

function TenantActionBar({
	selectedCount,
	isVisible,
	onDelete,
	onExport,
	onMessageAll,
	onClose
}: TenantActionBarProps) {
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		setMounted(true)
	}, [])

	if (!isVisible || !mounted) return null

	return createPortal(
		<div
			role="toolbar"
			aria-orientation="horizontal"
			className="fixed z-50 rounded-lg border bg-card shadow-lg outline-none fade-in-0 zoom-in-95 animate-in duration-250 slide-in-from-bottom-4 flex flex-row items-center gap-2 px-2 py-1.5"
			style={{
				bottom: '24px',
				left: '50%',
				transform: 'translateX(-50%)'
			}}
		>
			<div className="flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-sm tabular-nums">
				{selectedCount}
				<div className="h-4 w-px bg-border ml-0.5" aria-hidden="true" />
				selected
			</div>

			<div className="h-6 w-px bg-border" aria-hidden="true" />

			<div role="group" className="flex gap-2 outline-none items-center">
				<Button variant="outline" size="sm" onClick={onExport}>
					<Download className="h-4 w-4 mr-1" />
					Export
				</Button>
				{onMessageAll && (
					<Button variant="outline" size="sm" onClick={onMessageAll}>
						<Mail className="h-4 w-4 mr-1" />
						Message All
					</Button>
				)}
				<Button
					variant="outline"
					size="sm"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={onDelete}
				>
					<Trash2 className="h-4 w-4 mr-1" />
					Delete
				</Button>
			</div>

			<div className="h-6 w-px bg-border" aria-hidden="true" />

			<button
				type="button"
				onClick={onClose}
				aria-label="Deselect all"
				className="rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring p-1"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>,
		document.body
	)
}

// ============================================================================
// TENANT DETAIL SHEET
// ============================================================================

interface TenantDetailSheetProps {
	tenant: TenantDetail | null
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onEdit: (tenantId: string) => void
	onContact: (tenantId: string, method: 'email' | 'phone') => void
	onViewLease: (leaseId: string) => void
	onViewPaymentHistory?: (tenantId: string) => void
}

function TenantDetailSheet({
	tenant,
	isOpen,
	onOpenChange,
	onEdit,
	onContact,
	onViewLease,
	onViewPaymentHistory
}: TenantDetailSheetProps) {
	if (!tenant) return null

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{tenant.fullName}</SheetTitle>
					<SheetDescription>Tenant Profile</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{/* Contact Information */}
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
							Contact Information
						</h3>
						<div className="space-y-3">
							<button
								onClick={() => onContact(tenant.id, 'email')}
								className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors"
							>
								<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
									<Mail className="w-4 h-4 text-primary" />
								</div>
								<div className="text-left">
									<p className="text-sm font-medium text-foreground">
										{tenant.email}
									</p>
									<p className="text-xs text-muted-foreground">Email</p>
								</div>
							</button>
							{tenant.phone && (
								<button
									onClick={() => onContact(tenant.id, 'phone')}
									className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors"
								>
									<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
										<Phone className="w-4 h-4 text-primary" />
									</div>
									<div className="text-left">
										<p className="text-sm font-medium text-foreground">
											{tenant.phone}
										</p>
										<p className="text-xs text-muted-foreground">Phone</p>
									</div>
								</button>
							)}
						</div>
					</section>

					{/* Current Lease */}
					{tenant.currentLease && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Current Lease
							</h3>
							<button
								onClick={() => onViewLease(tenant.currentLease!.id)}
								className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
							>
								<div className="flex items-start justify-between mb-2">
									<div className="flex items-center gap-2">
										<MapPin className="w-4 h-4 text-muted-foreground" />
										<span className="font-medium text-foreground">
											{tenant.currentLease.propertyName}
										</span>
									</div>
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									Unit {tenant.currentLease.unitNumber}
								</p>
								<div className="flex items-center gap-4 text-sm">
									<span className="text-foreground font-medium">
										{formatCurrency(tenant.currentLease.rentAmount)}/mo
									</span>
									<span className="text-muted-foreground">
										{formatDate(tenant.currentLease.startDate)} —{' '}
										{tenant.currentLease.endDate
											? formatDate(tenant.currentLease.endDate)
											: 'Ongoing'}
									</span>
								</div>
								{tenant.currentLease.autopayEnabled && (
									<div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
										<CreditCard className="w-3 h-3" />
										Autopay enabled
									</div>
								)}
							</button>
						</section>
					)}

					{/* Emergency Contact */}
					{tenant.emergencyContactName && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Emergency Contact
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border border-border">
								<p className="font-medium text-foreground">
									{tenant.emergencyContactName}
								</p>
								{tenant.emergencyContactRelationship && (
									<p className="text-sm text-muted-foreground">
										{tenant.emergencyContactRelationship}
									</p>
								)}
								{tenant.emergencyContactPhone && (
									<p className="text-sm text-muted-foreground mt-1">
										{tenant.emergencyContactPhone}
									</p>
								)}
							</div>
						</section>
					)}

					{/* Recent Payments */}
					{tenant.paymentHistory && tenant.paymentHistory.length > 0 && (
						<section>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
									Recent Payments
								</h3>
								{onViewPaymentHistory && (
									<button
										onClick={() => onViewPaymentHistory(tenant.id)}
										className="text-xs text-primary hover:underline"
									>
										View all
									</button>
								)}
							</div>
							<div className="space-y-2">
								{tenant.paymentHistory.slice(0, 3).map(payment => (
									<div
										key={payment.id}
										className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
									>
										<div className="flex items-center gap-3">
											<PaymentStatusIcon status={payment.status} />
											<div>
												<p className="text-sm font-medium text-foreground">
													{formatCurrency(payment.amount)}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatDate(payment.dueDate)}
												</p>
											</div>
										</div>
										<span className="text-xs text-muted-foreground capitalize">
											{payment.status}
										</span>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Lease History */}
					{tenant.leaseHistory && tenant.leaseHistory.length > 0 && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Lease History
							</h3>
							<div className="space-y-2">
								{tenant.leaseHistory.map(lease => (
									<button
										key={lease.id}
										onClick={() => onViewLease(lease.id)}
										className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors text-left"
									>
										<div>
											<p className="text-sm font-medium text-foreground">
												{lease.propertyName} - Unit {lease.unitNumber}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDate(lease.startDate)} —{' '}
												{formatDate(lease.endDate)}
											</p>
										</div>
										<span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
											{lease.status}
										</span>
									</button>
								))}
							</div>
						</section>
					)}

					{/* Account Info */}
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
							Account Info
						</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Member since</p>
								<p className="font-medium text-foreground">
									{formatDate(tenant.createdAt)}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Total paid</p>
								<p className="font-medium text-foreground">
									{formatCurrency(tenant.totalPaid)}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Identity</p>
								<p className="font-medium text-foreground">
									{tenant.identityVerified ? (
										<span className="text-emerald-600 flex items-center gap-1">
											<Check className="w-3 h-3" /> Verified
										</span>
									) : (
										<span className="text-amber-600">Not verified</span>
									)}
								</p>
							</div>
						</div>
					</section>
				</div>

				{/* Footer */}
				<div className="mt-6 flex gap-3">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="flex-1"
					>
						Close
					</Button>
					<Button onClick={() => onEdit(tenant.id)} className="flex-1">
						Edit Profile
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}

// ============================================================================
// MAIN TENANTS COMPONENT
// ============================================================================

export function Tenants({
	tenants,
	selectedTenant,
	onInviteTenant,
	onViewTenant,
	onEditTenant,
	onDeleteTenant,
	onContactTenant,
	onViewLease,
	onExport,
	onMessageAll
}: TenantsProps) {
	// View state
	const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
	const [searchQuery, setSearchQuery] = React.useState('')
	const [statusFilter, setStatusFilter] = React.useState<string>('all')

	// Selection state
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

	// Detail sheet state
	const [isDetailSheetOpen, setIsDetailSheetOpen] = React.useState(false)

	// Calculate stats
	const totalTenants = tenants.length
	const activeTenants = tenants.filter(t => t.leaseStatus === 'active').length
	const pendingTenants = tenants.filter(
		t => t.leaseStatus === 'pending_signature'
	).length
	const endedTenants = tenants.filter(t => t.leaseStatus === 'ended').length

	// Filter tenants
	const filteredTenants = tenants.filter(t => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			if (
				!t.fullName.toLowerCase().includes(query) &&
				!t.email.toLowerCase().includes(query)
			) {
				return false
			}
		}
		if (statusFilter !== 'all' && t.leaseStatus !== statusFilter) {
			return false
		}
		return true
	})

	// Selection handlers
	const handleSelectChange = (ids: string[]) => {
		setSelectedIds(new Set(ids))
	}

	const handleSelectAll = () => {
		setSelectedIds(new Set(filteredTenants.map(t => t.id)))
	}

	const handleDeselectAll = () => {
		setSelectedIds(new Set())
	}

	// Bulk actions
	const handleBulkDelete = () => {
		// TODO: Implement bulk delete functionality
		setSelectedIds(new Set())
	}

	const handleBulkExport = () => {
		onExport?.()
		setSelectedIds(new Set())
	}

	// View tenant detail
	const handleViewTenant = (tenantId: string) => {
		onViewTenant?.(tenantId)
		setIsDetailSheetOpen(true)
	}

	const clearFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
	}

	// Empty state
	if (tenants.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="max-w-md mx-auto text-center py-16">
						<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Users className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							No tenants yet
						</h2>
						<p className="text-muted-foreground mb-6">
							Invite your first tenant to get started with lease management.
						</p>
						<button
							onClick={onInviteTenant}
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<UserPlus className="w-5 h-5" />
							Invite Your First Tenant
						</button>
					</div>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Page Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-bold text-foreground">Tenants</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Manage tenants and send invitations
						</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
						<button
							onClick={onInviteTenant}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<UserPlus className="w-4 h-4" />
							Invite Tenant
						</button>
						<button
							type="button"
							onClick={onMessageAll}
							disabled={!onMessageAll}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted/50 text-foreground font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
						>
							Message All
						</button>
						<button
							type="button"
							onClick={onExport}
							disabled={!onExport}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted/50 text-foreground font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
						>
							Export
						</button>
						<button
							type="button"
							disabled
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card text-foreground font-medium rounded-md opacity-60 cursor-not-allowed"
							title="Coming soon"
						>
							Analytics
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Stats Row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.2} inView>
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Total Tenants</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">{totalTenants}</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Users className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>
				</BlurFade>
				<BlurFade delay={0.3} inView>
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Active</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{activeTenants}
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Check className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>
				</BlurFade>
				<BlurFade delay={0.4} inView>
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Pending</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{pendingTenants}
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Clock className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>
				</BlurFade>
				<BlurFade delay={0.5} inView>
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Ended</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{endedTenants}
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<AlertCircle className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>
				</BlurFade>
			</div>

			{/* View Toggle & Filters */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-sm overflow-hidden">
					{/* Toolbar: Search LEFT, Filters RIGHT */}
					<div className="px-4 py-3 border-b border-border flex items-center gap-3">
						{/* LEFT: Search */}
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<input
								type="text"
								placeholder="Search tenants..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
							/>
						</div>

						{/* RIGHT: Filter */}
						<div className="flex items-center gap-3 ml-auto">
							{(searchQuery || statusFilter !== 'all') && (
								<button
									onClick={clearFilters}
									className="text-sm text-muted-foreground hover:text-foreground"
								>
									Clear
								</button>
							)}

							<div className="relative">
								<select
									value={statusFilter}
									onChange={e => setStatusFilter(e.target.value)}
									className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
								>
									<option value="all">All Statuses</option>
									<option value="active">Active</option>
									<option value="pending_signature">Pending</option>
									<option value="ended">Ended</option>
									<option value="terminated">Terminated</option>
								</select>
								<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							</div>

							<span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
								{filteredTenants.length}{' '}
								{filteredTenants.length === 1 ? 'tenant' : 'tenants'}
							</span>

							<div className="flex items-center gap-1 p-1 bg-muted rounded-sm">
								<button
									onClick={() => setViewMode('table')}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
										viewMode === 'table'
											? 'bg-background text-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									<List className="w-4 h-4" />
									Table
								</button>
								<button
									onClick={() => setViewMode('grid')}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
										viewMode === 'grid'
											? 'bg-background text-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									<LayoutGrid className="w-4 h-4" />
									Grid
								</button>
							</div>
						</div>
					</div>

					{/* Content Area */}
					{viewMode === 'table' ? (
						<TenantTable
							tenants={filteredTenants}
							selectedIds={selectedIds}
							onSelectChange={handleSelectChange}
							onSelectAll={handleSelectAll}
							onDeselectAll={handleDeselectAll}
							onView={handleViewTenant}
							onEdit={id => onEditTenant?.(id)}
							onDelete={id => onDeleteTenant?.(id)}
							onViewLease={onViewLease}
						/>
					) : (
						<TenantGrid
							tenants={filteredTenants}
							selectedIds={selectedIds}
							onSelectChange={handleSelectChange}
							onView={handleViewTenant}
							onEdit={id => onEditTenant?.(id)}
							onDelete={id => onDeleteTenant?.(id)}
							onContact={(id, method) => onContactTenant?.(id, method)}
						/>
					)}

					{/* No results */}
					{filteredTenants.length === 0 && tenants.length > 0 && (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								No tenants match your filters
							</p>
							<button
								onClick={clearFilters}
								className="mt-3 text-sm text-primary hover:underline"
							>
								Clear filters
							</button>
						</div>
					)}
				</div>
			</BlurFade>

			{/* Bulk Action Bar */}
			<TenantActionBar
				selectedCount={selectedIds.size}
				isVisible={selectedIds.size > 0}
				onDelete={handleBulkDelete}
				onExport={handleBulkExport}
				{...(onMessageAll ? { onMessageAll } : {})}
				onClose={handleDeselectAll}
			/>

			{/* Tenant Detail Sheet */}
			<TenantDetailSheet
				tenant={selectedTenant ?? null}
				isOpen={isDetailSheetOpen}
				onOpenChange={setIsDetailSheetOpen}
				onEdit={id => onEditTenant?.(id)}
				onContact={(id, method) => onContactTenant?.(id, method)}
				onViewLease={id => onViewLease?.(id)}
			/>
		</div>
	)
}
