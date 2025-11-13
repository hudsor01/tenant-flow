'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { cn } from '#lib/utils'
import type { ChartContainerProps } from '@repo/shared/types/frontend'

export function ChartContainer({
	title,
	description,
	children,
	height = 300,
	className,
	...props
}: ChartContainerProps) {
	return (
		<Card className={cn('w-full', className)} {...props}>
			<CardHeader>
				<CardTitle className="text-lg font-semibold text-foreground">
					{title}
				</CardTitle>
				{description && (
					<CardDescription className="text-muted-foreground">
						{description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<div
					className="w-full overflow-hidden rounded-lg"
					style={{ height: `${height}px` }}
				>
					{children}
				</div>
			</CardContent>
		</Card>
	)
}

// TenantFlow color palette for charts - consistent across all libraries
export const TENANTFLOW_CHART_COLORS = {
	primary: 'var(--color-primary)',
	secondary: 'var(--color-accent)',
	accent: 'var(--color-accent-main)',
	muted: 'var(--color-gray-secondary)',
	success: 'var(--color-system-green)',
	warning: 'var(--color-system-orange)',
	destructive: 'var(--color-system-red)',
	info: 'var(--color-system-blue)',
	revenue: 'var(--color-system-green)',
	occupancy: 'var(--color-system-blue)',
	maintenance: 'var(--color-system-orange)',
	properties: 'var(--color-primary)'
}

// Consistent chart configuration for all libraries
export const TENANTFLOW_CHART_CONFIG = {
	style: {
		fontSize: '12px',
		fontFamily: 'var(--font-sans)'
	},
	colors: Object.values(TENANTFLOW_CHART_COLORS),
	grid: {
		strokeDasharray: '3 3',
		stroke: 'var(--border)',
		strokeOpacity: 0.5
	},
	tooltip: {
		backgroundColor: 'var(--popover)',
		border: '1px solid var(--border)',
		borderRadius: 'var(--radius-medium)',
		padding: '12px',
		fontSize: '14px',
		fontFamily: 'var(--font-sans)',
		boxShadow:
			'0 4px 6px -1px var(--color-fill-primary), 0 2px 4px -1px var(--color-fill-secondary)'
	},
	legend: {
		fontSize: '12px',
		fontFamily: 'var(--font-sans)',
		color: 'var(--foreground)'
	},
	axis: {
		fontSize: '11px',
		fontFamily: 'var(--font-sans)',
		color: 'var(--muted-foreground)'
	}
}
