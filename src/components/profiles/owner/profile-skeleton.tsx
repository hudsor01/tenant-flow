'use client'

import { Skeleton } from '#components/ui/skeleton'

export function ProfileSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-48 mb-2" />
				<Skeleton className="h-5 w-64" />
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-1">
					<div className="rounded-lg border bg-card p-6">
						<div className="flex flex-col items-center">
							<Skeleton className="h-24 w-24 rounded-full" />
							<Skeleton className="h-6 w-32 mt-4" />
							<Skeleton className="h-4 w-24 mt-2" />
							<Skeleton className="h-3 w-40 mt-2" />
						</div>
						<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
							<Skeleton className="h-16" />
							<Skeleton className="h-16" />
						</div>
						<Skeleton className="h-10 w-full mt-6" />
					</div>
				</div>

				<div className="space-y-6 lg:col-span-2">
					<div className="rounded-lg border bg-card p-6">
						<Skeleton className="h-6 w-48 mb-4" />
						<div className="grid gap-4 sm:grid-cols-2">
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</div>
					</div>
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-48 rounded-lg" />
				</div>
			</div>
		</div>
	)
}
