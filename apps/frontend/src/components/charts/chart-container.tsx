'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { cn } from '#lib/utils'
import type { ReactNode } from 'react'

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string
	description?: string
	children: ReactNode
	height?: number
	className?: string
}

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
	muted: 'var(--color-muted/secondary)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	destructive: 'var(--color-destructive)',
	info: 'var(--color-info)',
	revenue: 'var(--color-success)',
	occupancy: 'var(--color-info)',
	maintenance: 'var(--color-warning)',
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
		stroke: 'var(--color-border)',
		strokeOpacity: 0.5
	},
	tooltip: {
		backgroundColor: 'var(--color-popover)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		padding: '12px',
		fontSize: '14px',
		fontFamily: 'var(--font-sans)',
		boxShadow:
			'0 4px 6px -1px var(--color-fill-primary), 0 2px 4px -1px var(--color-fill-secondary)'
	},
	legend: {
		fontSize: '12px',
		fontFamily: 'var(--font-sans)',
		color: 'var(--color-foreground)'
	},
	axis: {
		fontSize: '11px',
		fontFamily: 'var(--font-sans)',
		color: 'var(--color-muted-foreground)'
	}
}
