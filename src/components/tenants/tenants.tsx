"use client";

import { UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { BulkImportDialog } from "#components/bulk-import/bulk-import-dialog";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { createLogger } from "#lib/frontend-logger";
import { useTenantsStore } from "#stores/tenants-store";
import type { TenantsProps } from "#types/sections/tenants";
import { tenantBulkImportConfig } from "./bulk-import-config";
import { TenantActionBar } from "./tenant-action-bar";
import { TenantDetailSheet } from "./tenant-detail-sheet";
import { TenantGrid } from "./tenant-grid";
import { TenantQuickActions } from "./tenant-quick-actions";
import { TenantStats } from "./tenant-stats";
import { TenantTable } from "./tenant-table";
import { TenantToolbar } from "./tenant-toolbar";

const logger = createLogger({ component: "Tenants" });

export function Tenants({
	tenants,
	selectedTenant,
	onViewTenant,
	onEditTenant,
	onContactTenant,
	onViewLease,
	onDeleteTenant,
	onBulkDelete,
}: TenantsProps) {
	const router = useRouter();

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
		isDetailSheetOpen,
		openDetailSheet,
		setDetailSheetOpen,
	} = useTenantsStore();

	const handleAddClick = () => {
		router.push("/tenants/new");
	};

	// Calculate summary stats
	const totalTenants = tenants.length;
	const activeTenants = tenants.filter(
		(t) => t.leaseStatus === "active",
	).length;
	const pendingTenants = tenants.filter(
		(t) => t.leaseStatus === "pending_signature",
	).length;
	// "Past tenants" tile — count both manually ended and naturally expired
	// (cron-set) leases; both are no longer active. DATA-03 widened the status so
	// expired no longer folds into 'ended' at the transform.
	const endedTenants = tenants.filter(
		(t) => t.leaseStatus === "ended" || t.leaseStatus === "expired",
	).length;

	// Filter tenants
	const filteredTenants = tenants.filter((t) => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			const fullName = t.fullName ?? "";
			const email = t.email ?? "";
			if (
				!fullName.toLowerCase().includes(query) &&
				!email.toLowerCase().includes(query)
			) {
				return false;
			}
		}
		if (statusFilter !== "all" && t.leaseStatus !== statusFilter) {
			return false;
		}
		return true;
	});

	const handleSelectChange = (ids: string[]) => {
		setSelectedIds(ids);
	};

	const handleSelectAll = () => {
		selectAll(filteredTenants.map((t) => t.id));
	};

	const handleDeselectAll = () => {
		clearSelection();
	};

	const handleBulkDelete = () => {
		// Clear the selection only after the delete is CONFIRMED (passed as the
		// onConfirmed callback), not on dialog-open — otherwise cancelling the
		// confirm dialog would wipe the selection with nothing deleted.
		onBulkDelete(Array.from(selectedIds), clearSelection);
	};

	const handleBulkExport = () => {
		logger.info("Bulk export initiated", {
			selectedIds: Array.from(selectedIds),
		});
		clearSelection();
	};

	const handleViewTenant = (tenantId: string) => {
		onViewTenant(tenantId);
		openDetailSheet();
	};

	if (tenants.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<Empty>
						<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
							<Users />
						</EmptyMedia>
						<EmptyHeader>
							<EmptyTitle>No tenants yet</EmptyTitle>
							<EmptyDescription>
								Tenants are records you keep for your own tracking — they
								don&apos;t log in. Add one to start building a lease.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={handleAddClick}>
								<UserPlus className="w-5 h-5 mr-2" />
								Add Your First Tenant
							</Button>
						</EmptyContent>
					</Empty>
				</BlurFade>
			</div>
		);
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Page Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Tenants</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Manage your tenant records
						</p>
					</div>
					<div className="flex items-center gap-2">
						<BulkImportDialog
							config={tenantBulkImportConfig()}
							triggerLabel="Import Tenants"
						/>
						<button
							onClick={handleAddClick}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<UserPlus className="w-4 h-4" />
							Add Tenant
						</button>
					</div>
				</div>
			</BlurFade>

			<TenantStats
				totalTenants={totalTenants}
				activeTenants={activeTenants}
				pendingTenants={pendingTenants}
				endedTenants={endedTenants}
			/>

			<TenantQuickActions onAdd={handleAddClick} />

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
					{viewMode === "table" ? (
						<TenantTable
							tenants={filteredTenants}
							selectedIds={selectedIds}
							onSelectChange={handleSelectChange}
							onSelectAll={handleSelectAll}
							onDeselectAll={handleDeselectAll}
							onView={handleViewTenant}
							onEdit={onEditTenant}
							onDelete={onDeleteTenant}
							onViewLease={onViewLease}
						/>
					) : (
						<TenantGrid
							tenants={filteredTenants}
							selectedIds={selectedIds}
							onSelectChange={handleSelectChange}
							onView={handleViewTenant}
							onEdit={onEditTenant}
							onDelete={onDeleteTenant}
							onContact={onContactTenant}
						/>
					)}

					{/* No results */}
					{filteredTenants.length === 0 && tenants.length > 0 && (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No tenants match your filters</EmptyTitle>
							</EmptyHeader>
							<EmptyContent>
								<Button variant="ghost" size="sm" onClick={clearFilters}>
									Clear filters
								</Button>
							</EmptyContent>
						</Empty>
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
			/>
		</div>
	);
}
