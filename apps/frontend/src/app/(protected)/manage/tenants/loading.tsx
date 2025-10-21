import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-8 w-48" />
			<div className="grid gap-4 sm:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-24 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-96 rounded-xl" />
		</div>
	)
}
