import { Skeleton } from '#components/ui/skeleton'

export function CashFlowLoading() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-40 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			<Skeleton className="h-24 rounded-lg mb-8" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{[1, 2, 3].map(i => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{[1, 2].map(i => (
					<Skeleton key={i} className="h-80 rounded-lg" />
				))}
			</div>
		</div>
	)
}
