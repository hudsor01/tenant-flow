import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
	return (
		<div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
			<Skeleton className="h-9 w-48" />
			<div className="grid gap-4 sm:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-24 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-96 rounded-xl" />
		</div>
	)
}
