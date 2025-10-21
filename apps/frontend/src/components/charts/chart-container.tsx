'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
	primary: 'oklch(var(--primary))',
	secondary: 'oklch(var(--secondary))',
	accent: 'oklch(var(--accent))',
	muted: 'oklch(var(--muted))',
	success: 'var(--color-system-green)', // Green for positive metrics
	warning: 'var(--color-system-orange)', // Orange for warnings
	destructive: 'oklch(var(--destructive))',
	info: 'var(--color-system-blue)', // Blue for informational
	revenue: 'var(--color-system-green)', // Green for revenue
	occupancy: 'var(--color-system-blue)', // Blue for occupancy
	maintenance: 'var(--color-system-orange)', // Orange for maintenance
	properties: 'oklch(var(--primary))' // Primary for properties
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
		stroke: 'oklch(var(--border))',
		strokeOpacity: 0.5
	},
	tooltip: {
		backgroundColor: 'oklch(var(--popover))',
		border: '1px solid oklch(var(--border))',
		borderRadius: '8px',
		padding: '12px',
		fontSize: '14px',
		fontFamily: 'var(--font-sans)',
		boxShadow:
			'0 4px 6px -1px var(--color-fill-primary), 0 2px 4px -1px var(--color-fill-secondary)'
	},
	legend: {
		fontSize: '12px',
		fontFamily: 'var(--font-sans)',
		color: 'oklch(var(--foreground))'
	},
	axis: {
		fontSize: '11px',
		fontFamily: 'var(--font-sans)',
		color: 'oklch(var(--muted-foreground))'
	}
}
