import { Skeleton } from '#components/ui/skeleton'

export function FinancialsLoading() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{[1, 2, 3, 4, 5, 6].map(i => (
					<Skeleton key={i} className="h-40 rounded-lg" />
				))}
			</div>
		</div>
	)
}
