import { Skeleton } from "#components/ui/skeleton";

/**
 * Admin Routes Loading State
 *
 * Scoped to the authenticated (admin) segment, which fetches data server-side
 * (the layout validates is_admin() and analytics awaits three RPCs). Restores
 * the streamed fallback the deleted root app/loading.tsx used to provide here —
 * without re-imposing a loading overlay on the static public marketing pages.
 */
export default function AdminLoading() {
	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-4 w-72" />
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-lg border border-border/50 p-4">
						<Skeleton className="mb-2 h-4 w-24" />
						<Skeleton className="h-8 w-16" />
					</div>
				))}
			</div>

			<div className="rounded-lg border border-border/50 p-4">
				<Skeleton className="mb-4 h-5 w-48" />
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="flex gap-4 py-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-5 w-24" />
					</div>
				))}
			</div>
		</div>
	);
}
