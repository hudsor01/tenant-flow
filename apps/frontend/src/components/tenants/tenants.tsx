'use client'

/**
 * @todo SIZE-002: Split this component (423 lines) into smaller sub-components.
 *       CLAUDE.md limit is 300 lines per component.
 *       Suggested split: TenantList, TenantFilters, TenantStats.
 *       See TODO.md for details.
 *
 * Uses Zustand store for state management (useTenantsStore).
 * See stores/tenants-store.ts for state structure.
 */

import {
	Users,
	UserPlus,
	LayoutGrid,
	List,
	Check,
	Clock,
	AlertCircle,
	Mail,
	Download,
	BarChart3
} from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	TenantsProps
} from '@repo/shared/types/sections/tenants'
import {
	useTenantsStore,
	type TenantStatusFilter
} from '#stores/tenants-store'
import { TenantTable } from './tenant-table'
import { TenantGrid } from './tenant-grid'
import { TenantDetailSheet } from './tenant-detail-sheet'
import { TenantActionBar } from './tenant-action-bar'
import { InviteTenantModal } from './invite-tenant-modal'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { BorderBeam } from '#components/ui/border-beam'

// ============================================================================
// MAIN TENANTS COMPONENT
// ============================================================================

export function Tenants({
	tenants,
	invitations, // eslint-disable-line @typescript-eslint/no-unused-vars
	selectedTenant,
	onInviteTenant,
	onResendInvitation, // eslint-disable-line @typescript-eslint/no-unused-vars
	onCancelInvitation, // eslint-disable-line @typescript-eslint/no-unused-vars
	onViewTenant,
	onEditTenant,
	onContactTenant,
	onViewLease,
	onViewPaymentHistory
}: TenantsProps) {
	const logger = createLogger({ component: 'Tenants' })

	// Get state and actions from Zustand store
	const {
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		clearFilters,
		selectedIds,
		setSelectedIds,
		selectAll,
		clearSelection,
		isInviteModalOpen,
		openInviteModal,
		closeInviteModal,
		isDetailSheetOpen,
		openDetailSheet,
		setDetailSheetOpen
	} = useTenantsStore()

	// Calculate summary stats
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
			const fullName = t.fullName ?? ''
			const email = t.email ?? ''
			if (
				!fullName.toLowerCase().includes(query) &&
				!email.toLowerCase().includes(query)
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
		setSelectedIds(ids)
	}

	const handleSelectAll = () => {
		selectAll(filteredTenants.map(t => t.id))
	}

	const handleDeselectAll = () => {
		clearSelection()
	}

	// Bulk action handlers
	const handleBulkDelete = () => {
		logger.info('Bulk delete initiated', { selectedIds: Array.from(selectedIds) })
		clearSelection()
	}

	const handleBulkExport = () => {
		logger.info('Bulk export initiated', { selectedIds: Array.from(selectedIds) })
		clearSelection()
	}

	// View tenant detail
	const handleViewTenant = (tenantId: string) => {
		onViewTenant(tenantId)
		openDetailSheet()
	}

	// Empty state
	if (tenants.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="max-w-md mx-auto text-center py-16">
						<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Users className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							No tenants yet
						</h2>
						<p className="text-muted-foreground mb-6">
							Invite your first tenant to get started with lease management.
						</p>
						<button
							onClick={openInviteModal}
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<UserPlus className="w-5 h-5" />
							Invite Your First Tenant
						</button>
					</div>
				</BlurFade>

				<InviteTenantModal
					isOpen={isInviteModalOpen}
					onClose={closeInviteModal}
					onSubmit={onInviteTenant}
				/>
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
					<button
						onClick={openInviteModal}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<UserPlus className="w-4 h-4" />
						Invite Tenant
					</button>
				</div>
			</BlurFade>

			{/* Stats Row - Premium Stat Components */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Total Tenants</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={totalTenants} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Users />
						</StatIndicator>
						<StatDescription>in your portfolio</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Active</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={activeTenants} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Check />
						</StatIndicator>
						<StatDescription>current leases</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						{pendingTenants > 0 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Pending</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={pendingTenants} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting signature</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat>
						<StatLabel>Ended</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={endedTenants} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="muted">
							<AlertCircle />
						</StatIndicator>
						<StatDescription>past tenants</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Quick Actions */}
			<div className="flex items-center gap-3 mb-6">
				<button
					onClick={openInviteModal}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<UserPlus className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Invite Tenant</div>
						<div className="text-xs text-muted-foreground">Send invitation</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Mail className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Message All</div>
						<div className="text-xs text-muted-foreground">Bulk email</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Download className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Export</div>
						<div className="text-xs text-muted-foreground">Download data</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<BarChart3 className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Analytics</div>
						<div className="text-xs text-muted-foreground">View insights</div>
					</div>
				</button>
			</div>

			{/* View Toggle & Filters */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					{/* Standardized Toolbar: Search LEFT, View Toggle RIGHT */}
					<div className="px-4 py-3 border-b border-border flex items-center gap-3">
						{/* LEFT: Search + Filters */}
						<div className="relative w-64">
							<input
								type="text"
								placeholder="Search tenants..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className="w-full pl-3 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
							/>
						</div>

						<select
							value={statusFilter}
							onChange={e => setStatusFilter(e.target.value as TenantStatusFilter)}
							className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
						>
							<option value="all">All Statuses</option>
							<option value="active">Active</option>
							<option value="pending_signature">Pending</option>
							<option value="ended">Ended</option>
							<option value="terminated">Terminated</option>
						</select>

						{/* RIGHT: Count + View Toggle */}
						<div className="flex items-center gap-3 ml-auto">
							<span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
								{filteredTenants.length}{' '}
								{filteredTenants.length === 1 ? 'tenant' : 'tenants'}
							</span>

							<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
								<button
									onClick={() => setViewMode('table')}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
							onEdit={onEditTenant}
							onDelete={id => logger.info('Delete tenant requested', { tenantId: id })}
							onViewLease={onViewLease}
						/>
					) : (
						<TenantGrid
							tenants={filteredTenants}
							selectedIds={selectedIds}
							onSelectChange={handleSelectChange}
							onView={handleViewTenant}
							onEdit={onEditTenant}
							onDelete={id => logger.info('Delete tenant requested', { tenantId: id })}
							onContact={onContactTenant}
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
				onClose={handleDeselectAll}
			/>

			{/* Tenant Detail Sheet */}
			<TenantDetailSheet
				tenant={selectedTenant ?? null}
				isOpen={isDetailSheetOpen}
				onOpenChange={setDetailSheetOpen}
				onEdit={onEditTenant}
				onContact={onContactTenant}
				onViewLease={onViewLease}
				onViewPaymentHistory={onViewPaymentHistory}
			/>

			{/* Invite Modal */}
			<InviteTenantModal
				isOpen={isInviteModalOpen}
				onClose={closeInviteModal}
				onSubmit={onInviteTenant}
			/>
		</div>
	)
}
