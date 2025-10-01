import { Skeleton } from '@/components/ui/skeleton'

export default function FinancialAnalyticsLoading() {
	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-80" />
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="space-y-3 rounded-xl border p-6">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Skeleton className="h-[320px] w-full rounded-xl" />
				<Skeleton className="h-[320px] w-full rounded-xl" />
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Skeleton className="h-[340px] w-full rounded-xl" />
				<Skeleton className="h-[340px] w-full rounded-xl" />
			</div>
		</div>
	)
}
