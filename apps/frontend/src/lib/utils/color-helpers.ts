import { cn } from '#lib/utils'

/**
 * Activity type color mapping
 * Maps activity entity types to their semantic color classes
 */
export function getActivityColorClass(type: string): string {
	const colorMap: Record<string, string> = {
		payment: 'text-success bg-success/10',
		maintenance: 'text-info bg-info/10',
		lease: 'text-primary bg-primary/10',
		property: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
		tenant: 'text-warning bg-warning/10'
	}
	return colorMap[type] || 'text-muted-foreground bg-muted'
}

/**
 * Activity badge color mapping
 * Returns border color classes for activity badges
 */
export function getActivityBadgeClass(type: string): string {
	const colorMap: Record<string, string> = {
		payment: 'text-success bg-success/10 border-success/20',
		maintenance: 'text-info bg-info/10 border-info/20',
		lease: 'text-primary bg-primary/10 border-primary/20',
		property: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
		tenant: 'text-warning bg-warning/10 border-warning/20'
	}
	return colorMap[type] || 'text-muted-foreground bg-muted border-border'
}

/**
 * Trend color mapping
 * Returns color classes based on positive/negative/neutral trend
 */
export function getTrendColorClass(trend: 'up' | 'down' | 'stable' | string): string {
	switch (trend) {
		case 'up':
			return 'text-success'
		case 'down':
			return 'text-warning'
		default:
			return 'text-muted-foreground'
	}
}

/**
 * Occupancy rate badge class
 * Returns badge color classes based on occupancy percentage
 */
export function getOccupancyBadgeClass(rate: number): string {
	if (rate >= 90) {
		return 'text-success border-success/20'
	} else if (rate >= 80) {
		return 'text-info border-info/20'
	} else {
		return 'text-warning border-warning/20'
	}
}

/**
 * Status color mapping
 * Generic status badge color classes
 */
export function getStatusColorClass(status: string): string {
	const colorMap: Record<string, string> = {
		ACTIVE: 'text-success bg-success/10 border-success/20',
		PENDING: 'text-warning bg-warning/10 border-warning/20',
		INACTIVE: 'text-muted-foreground bg-muted border-border',
		OVERDUE: 'text-destructive bg-destructive/10 border-destructive/20',
		complete: 'text-success bg-success/10',
		error: 'text-destructive bg-destructive/10'
	}
	return colorMap[status] || 'text-muted-foreground bg-muted border-border'
}

/**
 * Icon background class helper
 * Creates consistent icon background with color and border
 */
export function getIconBgClass(type: string): string {
	const baseClass = 'flex size-10 items-center justify-center rounded-full border'
	const colorClass = getActivityColorClass(type)
	return cn(baseClass, colorClass)
}
