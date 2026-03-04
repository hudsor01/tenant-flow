import { Skeleton } from '#components/ui/skeleton'

/**
 * Owner Routes Loading State
 * Inherited by all child routes: /properties, /tenants, /leases, etc.
 * Shows instantly during navigation for perceived performance.
 */
export default function OwnerLoading() {
	return (
		<div className="dashboard-content">
			{/* Page Header Skeleton */}
			<div className="dashboard-section">
				<div className="dashboard-section-header">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-96" />
				</div>
			</div>

			{/* Action Bar Skeleton */}
			<div className="flex-between">
				<div className="flex gap-[var(--layout-gap-items)]">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-10 w-32" />
				</div>
				<Skeleton className="h-10 w-36" />
			</div>

			{/* Stats Cards Skeleton */}
			<div className="dashboard-cards-container">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="dashboard-panel">
						<div className="p-[var(--layout-content-padding-compact)]">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-8 w-16" />
						</div>
					</div>
				))}
			</div>

			{/* Table Skeleton */}
			<div className="dashboard-table-wrapper">
				<div className="p-[var(--layout-content-padding)]">
					{/* Header */}
					<div className="flex gap-[var(--layout-gap-group)] mb-[var(--layout-gap-items)] pb-[var(--layout-gap-items)] border-b border-border/50">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
					{/* Rows */}
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="flex gap-[var(--layout-gap-group)] py-[var(--layout-gap-items)]"
						>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-48" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
