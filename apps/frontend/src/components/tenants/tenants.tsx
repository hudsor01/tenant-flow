'use client'

import { Users, UserPlus } from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { TenantsProps } from '@repo/shared/types/sections/tenants'
import { useTenantsStore } from '#stores/tenants-store'
import { TenantTable } from './tenant-table'
import { TenantGrid } from './tenant-grid'
import { TenantDetailSheet } from './tenant-detail-sheet'
import { TenantActionBar } from './tenant-action-bar'
import { InviteTenantModal } from './invite-tenant-modal'
import { TenantStats } from './tenant-stats'
import { TenantQuickActions } from './tenant-quick-actions'
import { TenantToolbar } from './tenant-toolbar'
import { BlurFade } from '#components/ui/blur-fade'

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

	const handleSelectChange = (ids: string[]) => {
		setSelectedIds(ids)
	}

	const handleSelectAll = () => {
		selectAll(filteredTenants.map(t => t.id))
	}

	const handleDeselectAll = () => {
		clearSelection()
	}

	const handleBulkDelete = () => {
		logger.info('Bulk delete initiated', { selectedIds: Array.from(selectedIds) })
		clearSelection()
	}

	const handleBulkExport = () => {
		logger.info('Bulk export initiated', { selectedIds: Array.from(selectedIds) })
		clearSelection()
	}

	const handleViewTenant = (tenantId: string) => {
		onViewTenant(tenantId)
		openDetailSheet()
	}

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

			<TenantStats
				totalTenants={totalTenants}
				activeTenants={activeTenants}
				pendingTenants={pendingTenants}
				endedTenants={endedTenants}
			/>

			<TenantQuickActions onInvite={openInviteModal} />

			{/* View Toggle & Filters */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<TenantToolbar
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						statusFilter={statusFilter}
						onStatusFilterChange={setStatusFilter}
						viewMode={viewMode}
						onViewModeChange={setViewMode}
						filteredCount={filteredTenants.length}
					/>

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

			<TenantActionBar
				selectedCount={selectedIds.size}
				isVisible={selectedIds.size > 0}
				onDelete={handleBulkDelete}
				onExport={handleBulkExport}
				onClose={handleDeselectAll}
			/>

			<TenantDetailSheet
				tenant={selectedTenant ?? null}
				isOpen={isDetailSheetOpen}
				onOpenChange={setDetailSheetOpen}
				onEdit={onEditTenant}
				onContact={onContactTenant}
				onViewLease={onViewLease}
				onViewPaymentHistory={onViewPaymentHistory}
			/>

			<InviteTenantModal
				isOpen={isInviteModalOpen}
				onClose={closeInviteModal}
				onSubmit={onInviteTenant}
			/>
		</div>
	)
}
