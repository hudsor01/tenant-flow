'use client'

import { Skeleton } from '#components/ui/skeleton'
import { Home } from 'lucide-react'

export function LoadingState() {
	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-sm space-y-8 text-center">
				<div className="size-14 mx-auto">
					<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm animate-pulse">
						<Home className="size-7 text-primary-foreground" />
					</div>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-8 w-48 mx-auto" />
					<Skeleton className="h-4 w-64 mx-auto" />
				</div>
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</div>
		</div>
	)
}
