import { TenantDetailSkeleton } from './tenant-loading-skeleton'

export function TenantSkeleton() {
	return (
		<div className="space-y-6">
			<TenantDetailSkeleton className="h-32 w-full" />
			<TenantDetailSkeleton className="h-64 w-full" />
		</div>
	)
}
