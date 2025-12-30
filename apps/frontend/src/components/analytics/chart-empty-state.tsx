'use client'

import { Badge } from '#components/ui/badge'
import { CardDescription } from '#components/ui/card'

type ChartEmptyStateProps = {
	message: string
}

export function ChartEmptyState({ message }: ChartEmptyStateProps) {
	return (
		<div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="max-w-sm text-center text-muted">
				{message}
			</CardDescription>
		</div>
	)
}
