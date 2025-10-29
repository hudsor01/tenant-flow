import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import type { HTMLAttributes } from 'react'

export function TenantFormSkeleton() {
	return (
		<CardLayout
			title="Loading tenant information..."
			description="Please wait while we fetch the tenant details"
		>
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		</CardLayout>
	)
}

export function TenantTableSkeleton() {
	return (
		<CardLayout
			title="Loading tenants..."
			description="Please wait while we fetch tenant data"
		>
			<div className="space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 rounded-lg border p-4"
					>
						<Skeleton className="size-12 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
						<div className="hidden space-y-2 sm:block">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-20" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-8 w-16" />
							<Skeleton className="h-8 w-16" />
							<Skeleton className="size-8" />
						</div>
					</div>
				))}
			</div>
		</CardLayout>
	)
}

export function TenantDetailSkeleton({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`mx-auto w-full max-w-4xl space-y-6 ${className ?? ''}`}
			{...rest}
		>
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
			<CardLayout
				title="Tenant Information"
				description="Loading tenant details"
			>
				<div className="space-y-6">
					<div className="flex items-center gap-4">
						<Skeleton className="size-16 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-48" />
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
