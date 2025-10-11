import { Skeleton } from '@/components/ui/skeleton'

export function TenantSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-64 w-full" />
		</div>
	)
}
