"use client";

/**
 * Leases Page
 *
 * Uses Zustand store for state management (useLeasesStore).
 * See stores/leases-store.ts for state structure.
 */

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
	LeaseInsightsSection,
	LeaseInsightsSkeleton,
} from "#components/analytics/lease-insights-section";
import { BulkImportDialog } from "#components/bulk-import/bulk-import-dialog";
import { leaseBulkImportConfig } from "#components/leases/bulk-import-config";
import { LeasesDialogs } from "#components/leases/dialogs/leases-dialogs";

import {
	type LeaseDisplay,
	type LeaseWithNestedRelations,
	transformLease,
} from "#components/leases/table/lease-utils";
import { LeasesPageSkeleton } from "#components/leases/table/leases-page-skeleton";
import { LeasesTable } from "#components/leases/table/leases-table";
import { BlurFade } from "#components/ui/blur-fade";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import { useLeaseList } from "#hooks/api/use-lease";
import { useLeasesStore } from "#stores/leases-store";
import { LeasesStatCards } from "./leases-stat-cards";

// Fetch bound for the leases list. The whole realistic dataset is loaded in a
// single page and search / sort / pagination run client-side — client-side
// tenant & property name search (LEASE-01) needs the full set loaded, so a
// per-page server fetch is intentionally NOT used.
// DOCUMENTED LIMIT: an owner with more than 1000 leases would have rows beyond
// this cap unreachable and would need a future dedicated search RPC (server-side
// search + pagination). Realistic owner lease volumes are far below 1000.
const LEASES_FETCH_CAP = 1000;

export default function LeasesPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tabFromUrl = searchParams.get("tab") ?? "overview";

	// Get state and actions from Zustand store
	const {
		activeTab,
		setActiveTab,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		sortField,
		sortDirection,
		toggleSort,
		selectedRows,
		toggleSelectAll,
		toggleSelect,
		clearSelection,
		currentPage,
		setCurrentPage,
		itemsPerPage,
		selectedLeaseId,
		showRenewDialog,
		showTerminateDialog,
		openRenewDialog,
		openTerminateDialog,
		closeRenewDialog,
		closeTerminateDialog,
		closeAllDialogs,
		pruneSelection,
	} = useLeasesStore();

	// Sync URL tab with store when URL changes
	useEffect(() => {
		setActiveTab(tabFromUrl);
	}, [tabFromUrl, setActiveTab]);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		const params = new URLSearchParams(searchParams.toString());
		if (value === "overview") params.delete("tab");
		else params.set("tab", value);
		router.replace(
			`/leases${params.toString() ? `?${params.toString()}` : ""}`,
			{ scroll: false },
		);
	};

	const {
		data: leasesResponse,
		isLoading,
		error,
	} = useLeaseList({ limit: LEASES_FETCH_CAP, offset: 0 });
	const rawLeases = leasesResponse?.data ?? [];

	const leases: LeaseDisplay[] = (() => {
		return rawLeases.map((lease) =>
			transformLease(lease as LeaseWithNestedRelations),
		);
	})();

	// True total from the PostgREST count (accurate even when the fetch is
	// windowed to the cap), never the current-page length.
	const totalLeases = leasesResponse?.total ?? leases.length;
	const activeLeases = leases.filter((l) => l.status === "active").length;
	const expiringLeases = leases.filter((l) => l.status === "expiring").length;
	const pendingLeases = leases.filter(
		(l) => l.status === "pending_signature",
	).length;

	const filteredLeases = leases.filter((l) => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			if (
				!(l.tenantName ?? "").toLowerCase().includes(query) &&
				!(l.propertyName ?? "").toLowerCase().includes(query)
			)
				return false;
		}
		if (statusFilter !== "all" && l.status !== statusFilter) return false;
		return true;
	});

	const sortedLeases = [...filteredLeases].sort((a, b) => {
		const cmp: Record<string, number> = {
			tenant: a.tenantName.localeCompare(b.tenantName),
			property: a.propertyName.localeCompare(b.propertyName),
			startDate:
				new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
			endDate: new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
			rent: a.rentAmount - b.rentAmount,
			status: a.status.localeCompare(b.status),
		};
		return sortDirection === "asc"
			? (cmp[sortField] ?? 0)
			: -(cmp[sortField] ?? 0);
	});

	const totalPages = Math.ceil(sortedLeases.length / itemsPerPage);
	const paginatedLeases = sortedLeases.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const handleView = (id: string) => router.push(`/leases/${id}`);
	const handleEdit = (id: string) => router.push(`/leases/${id}/edit`);

	// Derive the selected lease entity fresh from the query-backed list (STATE-03)
	const selectedLease =
		leases.find((l) => l.id === selectedLeaseId)?.original ?? null;

	// Clamp currentPage to the recomputed totalPages (STATE-01)
	const effectivePage = Math.min(currentPage, Math.max(1, totalPages));

	// Write clamp back to store when they diverge (keeps footer/counter consistent)
	useEffect(() => {
		if (effectivePage !== currentPage) setCurrentPage(effectivePage);
	}, [effectivePage, currentPage, setCurrentPage]);

	// Prune stale selections against the fetched id set (STATE-01/05/12 class fix)
	useEffect(() => {
		// STATE-01: prune against the FULL fetched list, not the filtered/sorted
		// view — a search/status filter must never wipe a selection for rows
		// that are merely hidden; only genuinely absent (deleted) ids drop.
		pruneSelection(leases.map((l) => l.id));
	}, [leases, pruneSelection]);

	// Close dialogs on unmount (STATE-03: kills back/forward auto-reopen)
	useEffect(() => closeAllDialogs, [closeAllDialogs]);

	const handleRenew = (lease: LeaseDisplay) => {
		openRenewDialog(lease.id);
	};

	const handleTerminate = (lease: LeaseDisplay) => {
		openTerminateDialog(lease.id);
	};

	if (isLoading) return <LeasesPageSkeleton />;

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive-text mb-2">
						Error Loading Leases
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : "Failed to load leases"}
					</p>
				</div>
			</div>
		);
	}

	if (leases.length === 0)
		return (
			<BlurFade delay={0.1} inView>
				<Empty>
					<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
						<FileText />
					</EmptyMedia>
					<EmptyHeader>
						<EmptyTitle>No leases yet</EmptyTitle>
						<EmptyDescription>
							Create a lease between one of your properties and a tenant record
							to start tracking dates, rent, and deposits.
						</EmptyDescription>
					</EmptyHeader>
					<div className="flex items-center gap-3 mt-2">
						<Link
							href="/leases/new"
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<Plus className="size-5" />
							Create First Lease
						</Link>
					</div>
				</Empty>
			</BlurFade>
		);

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Leases</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Manage lease agreements and renewals
						</p>
					</div>
					<div className="flex items-center gap-2">
						<BulkImportDialog
							config={leaseBulkImportConfig()}
							triggerLabel="Import Leases"
						/>
						<Link
							href="/leases/new"
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<Plus className="w-4 h-4" />
							New Lease
						</Link>
					</div>
				</div>
			</BlurFade>

			<LeasesStatCards
				totalLeases={totalLeases}
				activeLeases={activeLeases}
				expiringLeases={expiringLeases}
				pendingLeases={pendingLeases}
			/>

			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="mb-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="insights">Insights</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					<LeasesTable
						leases={sortedLeases}
						paginatedLeases={paginatedLeases}
						searchQuery={searchQuery}
						statusFilter={statusFilter}
						sortField={sortField}
						sortDirection={sortDirection}
						selectedRows={selectedRows}
						currentPage={effectivePage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						onSearchChange={setSearchQuery}
						onStatusFilterChange={setStatusFilter}
						onSort={toggleSort}
						onToggleSelectAll={() =>
							toggleSelectAll(sortedLeases.map((l) => l.id))
						}
						onToggleSelect={toggleSelect}
						onPageChange={setCurrentPage}
						onView={handleView}
						onEdit={handleEdit}
						onRenew={handleRenew}
						onTerminate={handleTerminate}
						onClearSelection={clearSelection}
					/>
				</TabsContent>

				<TabsContent value="insights">
					<Suspense fallback={<LeaseInsightsSkeleton />}>
						<LeaseInsightsSection />
					</Suspense>
				</TabsContent>
			</Tabs>

			<LeasesDialogs
				selectedLease={selectedLease}
				showRenewDialog={showRenewDialog}
				showTerminateDialog={showTerminateDialog}
				onRenewOpenChange={(open) => {
					if (!open) closeRenewDialog();
				}}
				onTerminateOpenChange={(open) => {
					if (!open) closeTerminateDialog();
				}}
				onRenewSuccess={closeRenewDialog}
				onTerminateSuccess={closeTerminateDialog}
			/>
		</div>
	);
}
