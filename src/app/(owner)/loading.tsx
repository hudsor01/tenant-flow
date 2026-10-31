import { Skeleton } from "#components/ui/skeleton";

/**
 * Owner Routes Loading State
 * Inherited by all child routes: /properties, /tenants, /leases, etc.
 * Shows instantly during navigation for perceived performance.
 */
export default function OwnerLoading() {
	return (
		<div className="flex flex-col gap-(--layout-gap-group)">
			{/* Page Header Skeleton */}
			<div className="py-1">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-96 max-w-full" />
				</div>
			</div>

			{/* Action Bar Skeleton */}
			<div className="flex-between">
				<div className="flex min-w-0 gap-(--layout-gap-items)">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-10 w-32" />
				</div>
				<Skeleton className="h-10 w-36" />
			</div>

			{/* Stats Cards Skeleton */}
			<div className="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-6">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
					>
						<div className="p-(--layout-content-padding-compact)">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-8 w-16" />
						</div>
					</div>
				))}
			</div>

			{/* Table Skeleton */}
			<div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				<div className="p-(--layout-content-padding)">
					{/* Header */}
					<div className="flex gap-(--layout-gap-group) mb-(--layout-gap-items) pb-(--layout-gap-items) border-b border-border/50">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
					{/* Rows */}
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="flex gap-(--layout-gap-group) py-(--layout-gap-items)"
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
	);
}
