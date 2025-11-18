import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-4">
			{/* Search bar skeleton */}
			<div className="flex items-center gap-2">
				<Skeleton className="h-10 flex-1 max-w-xs" />
				<Skeleton className="h-10 w-24" />
			</div>

			{/* Table skeleton */}
			<div className="rounded-md border">
				{/* Header */}
				<div className="border-b bg-muted/50 p-4">
					<div className="flex gap-4">
						<Skeleton className="h-4 w-8" />
						<Skeleton className="h-4 flex-1" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
				</div>

				{/* Rows */}
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className="border-b p-4 last:border-0">
						<div className="flex gap-4 items-center">
							<Skeleton className="h-4 w-8" />
							<Skeleton className="h-4 flex-1" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
						</div>
					</div>
				))}
			</div>

			{/* Pagination skeleton */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-44" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-9" />
				</div>
			</div>
		</div>
	)
}

export function CardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-8 w-36 mt-2" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</CardContent>
		</Card>
	)
}

export function StatsSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<Skeleton className="h-4 w-30" />
						<Skeleton className="h-8 w-24 mt-2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-4 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export function FormSkeleton() {
	return (
		<div className="space-y-6">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
			))}
			<div className="flex gap-2 pt-4">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	)
}

export function ChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-72 mt-2" />
			</CardHeader>
			<CardContent>
				<div className="h-72 flex items-end gap-2">
					{Array.from({ length: 12 }).map((_, i) => (
						<Skeleton
							key={i}
							className="flex-1"
							style={{ height: `${Math.random() * 100}%` }}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export function DetailsSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-72" />
				<Skeleton className="h-4 w-48" />
			</div>

			{/* Content sections */}
			{Array.from({ length: 3 }).map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<Skeleton className="h-6 w-36" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, j) => (
							<div key={j} className="flex items-center justify-between">
								<Skeleton className="h-4 w-30" />
								<Skeleton className="h-4 w-44" />
							</div>
						))}
					</CardContent>
				</Card>
			))}

			{/* Actions */}
			<div className="flex gap-2">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	)
}

export function MobileCardSkeleton() {
	return (
		<div className="animate-pulse space-y-3 rounded-2xl border border-dashed border-border/60 p-4">
			<div className="flex items-center gap-3">
				<Skeleton className="size-12 rounded-2xl" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-3/5" />
					<Skeleton className="h-3 w-4/5" />
				</div>
			</div>
			<Skeleton className="h-8 w-full rounded-xl" />
		</div>
	)
}

export function MobileListSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: rows }).map((_, index) => (
				<div
					key={index}
					className="animate-pulse rounded-2xl border border-border/50 bg-muted/40 p-4"
				>
					<div className="flex items-center justify-between gap-2">
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-3 w-1/2" />
						</div>
						<Skeleton className="h-8 w-16 rounded-full" />
					</div>
				</div>
			))}
		</div>
	)
}
