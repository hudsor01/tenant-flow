'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { formatPercentage } from '#lib/formatters/currency'

export function TrendPill({ value }: { value: number | null | undefined }) {
	if (value === null || value === undefined) {
		return null
	}

	const isPositive = value >= 0
	const Icon = isPositive ? ArrowUpRight : ArrowDownRight

	return (
		<Badge
			variant={isPositive ? 'outline' : 'destructive'}
			className="flex items-center gap-1 font-medium"
		>
			<Icon className="size-3" />
			{formatPercentage(Math.abs(value), { minimumFractionDigits: 1 })}
		</Badge>
	)
}
