'use client'

/**
 * Leases Page
 *
 * Uses Zustand store for state management (useLeasesStore).
 * See stores/leases-store.ts for state structure.
 *
 * @see TODO.md REACT-001 - State consolidated from 13 useState calls
 */

import { useEffect, Suspense } from 'react'
import { Plus } from 'lucide-react'
import { useLeaseList } from '#hooks/api/use-lease'
import { useDeleteLeaseMutation } from '#hooks/api/use-lease-mutations'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { BlurFade } from '#components/ui/blur-fade'
import {
	LeaseInsightsSection,
	LeaseInsightsSkeleton
} from '#components/analytics/lease-insights-section'

import {
	transformLease,
	type LeaseWithNestedRelations,
	type LeaseDisplay
} from '#components/leases/table/lease-utils'
import { LeasesPageSkeleton } from '#components/leases/table/leases-page-skeleton'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { FileText } from 'lucide-react'
import { LeasesTable } from '#components/leases/table/leases-table'
import { LeasesStatCards } from './leases-stat-cards'
import { LeasesDialogs } from '#components/leases/dialogs/leases-dialogs'
import { useLeasesStore } from '#stores/leases-store'

export default function LeasesPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const tabFromUrl = searchParams.get('tab') ?? 'overview'

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
		selectedLease,
		showRenewDialog,
		showTerminateDialog,
		showDeleteDialog,
		openRenewDialog,
		openTerminateDialog,
		closeRenewDialog,
		closeTerminateDialog,
		closeDeleteDialog
	} = useLeasesStore()

	// Sync URL tab with store when URL changes
	useEffect(() => {
		setActiveTab(tabFromUrl)
	}, [tabFromUrl, setActiveTab])

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		const params = new URLSearchParams(searchParams.toString())
		if (value === 'overview') params.delete('tab')
		else params.set('tab', value)
		router.replace(`/leases${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
	}

	const { data: leasesResponse, isLoading, error } = useLeaseList({ limit: 50, offset: 0 })
	const deleteLeaseMutation = useDeleteLeaseMutation()

	const rawLeases = leasesResponse?.data ?? []

	const leases: LeaseDisplay[] = (() => {
		return rawLeases.map(lease =>
			transformLease(lease as LeaseWithNestedRelations)
		)
	})()

	const totalLeases = leases.length
	const activeLeases = leases.filter(l => l.status === 'active').length
	const expiringLeases = leases.filter(l => l.status === 'expiring').length
	const pendingLeases = leases.filter(
		l => l.status === 'pending_signature'
	).length

	const filteredLeases = leases.filter(l => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			if (!(l.tenantName ?? '').toLowerCase().includes(query) && !(l.propertyName ?? '').toLowerCase().includes(query)) return false
		}
		if (statusFilter !== 'all' && l.status !== statusFilter) return false
		return true
	})

	const sortedLeases = [...filteredLeases].sort((a, b) => {
		const cmp: Record<string, number> = {
			tenant: a.tenantName.localeCompare(b.tenantName),
			property: a.propertyName.localeCompare(b.propertyName),
			startDate: new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
			endDate: new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
			rent: a.rentAmount - b.rentAmount,
			status: a.status.localeCompare(b.status)
		}
		return sortDirection === 'asc' ? (cmp[sortField] ?? 0) : -(cmp[sortField] ?? 0)
	})

	const totalPages = Math.ceil(sortedLeases.length / itemsPerPage)
	const paginatedLeases = sortedLeases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

	const handleView = (id: string) => router.push(`/leases/${id}`)
	const handleEdit = (id: string) => router.push(`/leases/${id}/edit`)

	const handleRenew = (lease: LeaseDisplay) => {
		openRenewDialog(lease.original)
	}

	const handleTerminate = (lease: LeaseDisplay) => {
		openTerminateDialog(lease.original)
	}

	if (isLoading) return <LeasesPageSkeleton />

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Leases
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
				</div>
			</div>
		)
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
							Create your first lease to start managing tenant agreements.
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
		)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-bold text-foreground">Leases</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Manage lease agreements and renewals
						</p>
					</div>
					<Link
						href="/leases/new"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Lease
					</Link>
				</div>
			</BlurFade>

			<LeasesStatCards
				totalLeases={totalLeases}
				activeLeases={activeLeases}
				expiringLeases={expiringLeases}
				pendingLeases={pendingLeases}
			/>

			<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						onSearchChange={setSearchQuery}
						onStatusFilterChange={setStatusFilter}
						onSort={toggleSort}
						onToggleSelectAll={() => toggleSelectAll(sortedLeases.map(l => l.id))}
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
				showDeleteDialog={showDeleteDialog}
				isDeleting={deleteLeaseMutation.isPending}
				onRenewOpenChange={open => {
					if (!open) closeRenewDialog()
				}}
				onTerminateOpenChange={open => {
					if (!open) closeTerminateDialog()
				}}
				onDeleteOpenChange={open => {
					if (!open) closeDeleteDialog()
				}}
				onRenewSuccess={closeRenewDialog}
				onTerminateSuccess={closeTerminateDialog}
				onDeleteConfirm={() => {
					if (selectedLease) {
						deleteLeaseMutation.mutate(selectedLease.id)
					}
					closeDeleteDialog()
				}}
			/>
		</div>
	)
}
