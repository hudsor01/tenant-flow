"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { OwnerErrorBox } from "#components/shared/owner-error-box";
import { Tenants } from "#components/tenants/tenants";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { useDeleteTenantMutation } from "#hooks/api/use-tenant-mutations";
import {
	transformToTenantItem,
	transformToTenantSectionDetail,
} from "./components/tenant-transforms";
import { TenantsLoadingSkeleton } from "./components/tenants-loading-skeleton";

export default function TenantsPage() {
	const router = useRouter();
	const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
	const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
	const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
	// Clears the tenants-list selection — invoked ONLY when a bulk delete is
	// confirmed (not on cancel), so a cancelled confirm keeps the selection.
	const bulkClearRef = useRef<(() => void) | null>(null);

	// Fetch tenants list
	const {
		data: tenantsResponse,
		isLoading,
		error,
	} = useQuery(tenantQueries.list());
	const rawTenants = tenantsResponse?.data ?? [];

	const totalPaidByTenant = new Map<string, number>();
	const tenants = rawTenants.map((tenant) =>
		transformToTenantItem(tenant, totalPaidByTenant),
	);

	// The single delete's confirmation names its tenant.
	const tenantToDeleteName =
		tenants.find((tenant) => tenant.id === tenantToDelete)?.fullName ?? null;

	// Get selected tenant detail
	const selectedTenant = (() => {
		if (!selectedTenantId) return undefined;
		const raw = rawTenants.find((t) => t.id === selectedTenantId);
		return raw
			? transformToTenantSectionDetail(raw, totalPaidByTenant)
			: undefined;
	})();

	// Delete mutation — consolidated hook with active-lease guard
	const { mutate: deleteTenant } = useDeleteTenantMutation();

	// Callbacks
	const handleViewTenant = (tenantId: string) => {
		setSelectedTenantId(tenantId);
	};

	const handleEditTenant = (tenantId: string) => {
		router.push(`/tenants/${tenantId}/edit`);
	};

	const confirmDeleteTenant = () => {
		if (tenantToDelete) {
			deleteTenant(tenantToDelete);
			setTenantToDelete(null);
		}
	};

	// Bulk delete: fire the mutation per id. Each call invalidates the list on
	// success and toasts the Phase-26 active-lease block on failure, so blocked
	// tenants surface an error toast while the rest delete — do NOT swallow.
	const confirmBulkDelete = () => {
		if (bulkDeleteIds) {
			bulkDeleteIds.forEach((id) => deleteTenant(id));
			bulkClearRef.current?.();
			bulkClearRef.current = null;
			setBulkDeleteIds(null);
		}
	};

	const handleContactTenant = (tenantId: string, method: "email" | "phone") => {
		const tenant = rawTenants.find((t) => t.id === tenantId);
		if (!tenant) return;

		if (method === "email" && tenant.email) {
			window.location.href = `mailto:${tenant.email}`;
		} else if (method === "phone" && tenant.phone) {
			window.location.href = `tel:${tenant.phone}`;
		}
	};

	const handleViewLease = (leaseId: string) => {
		router.push(`/leases/${leaseId}`);
	};

	if (isLoading) {
		return <TenantsLoadingSkeleton />;
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<OwnerErrorBox
					title="Error Loading Tenants"
					message="Failed to load tenants"
				/>
			</div>
		);
	}

	return (
		<>
			<Tenants
				tenants={tenants}
				selectedTenant={selectedTenant}
				onViewTenant={handleViewTenant}
				onEditTenant={handleEditTenant}
				onContactTenant={handleContactTenant}
				onViewLease={handleViewLease}
				onDeleteTenant={(id) => setTenantToDelete(id)}
				onBulkDelete={(ids, onConfirmed) => {
					setBulkDeleteIds(ids);
					bulkClearRef.current = onConfirmed;
				}}
			/>

			<AlertDialog
				open={tenantToDelete !== null}
				onOpenChange={(open) => !open && setTenantToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{tenantToDeleteName
								? `Delete tenant ${tenantToDeleteName}?`
								: "Delete this tenant?"}
						</AlertDialogTitle>
						{/* A soft delete (status 'inactive'), refused for a tenant on an
						    active lease (useDeleteTenantMutation). */}
						<AlertDialogDescription className="mb-0">
							This marks the tenant as inactive, so they leave your tenant list.
							Their leases are kept. A tenant on an active lease can't be
							deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteTenant}
							variant="destructive"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={bulkDeleteIds !== null}
				onOpenChange={(open) => {
					if (!open) {
						// Cancel/dismiss: drop the pending clear callback so the
						// selection is preserved (nothing was deleted).
						bulkClearRef.current = null;
						setBulkDeleteIds(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {bulkDeleteIds?.length ?? 0} tenant
							{(bulkDeleteIds?.length ?? 0) === 1 ? "" : "s"}?
						</AlertDialogTitle>
						<AlertDialogDescription className="mb-0">
							This marks the selected tenants as inactive, so they leave your
							tenant list. Their leases are kept. A tenant on an active lease is
							skipped, with an error.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmBulkDelete}
							variant="destructive"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
