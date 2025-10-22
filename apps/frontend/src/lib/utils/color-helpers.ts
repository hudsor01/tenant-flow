import { cn } from '@/lib/utils'

/**
 * Activity type color mapping
 * Maps activity entity types to their semantic color classes
 */
export function getActivityColorClass(type: string): string {
	const colorMap: Record<string, string> = {
		payment: 'text-[var(--color-metric-success)] bg-[var(--color-metric-success-bg)]',
		maintenance: 'text-[var(--color-metric-info)] bg-[var(--color-metric-info-bg)]',
		lease: 'text-[var(--color-metric-primary)] bg-[var(--color-metric-primary-bg)]',
		property: 'text-[var(--color-metric-revenue)] bg-[var(--color-metric-revenue-bg)]',
		tenant: 'text-[var(--color-metric-warning)] bg-[var(--color-metric-warning-bg)]'
	}
	return colorMap[type] || 'text-[var(--color-metric-neutral)] bg-[var(--color-metric-neutral-bg)]'
}

/**
 * Activity badge color mapping
 * Returns border color classes for activity badges
 */
export function getActivityBadgeClass(type: string): string {
	const colorMap: Record<string, string> = {
		payment: 'text-[var(--color-metric-success)] bg-[var(--color-metric-success-bg)] border-[var(--color-metric-success-border)]',
		maintenance: 'text-[var(--color-metric-info)] bg-[var(--color-metric-info-bg)] border-[var(--color-metric-info-border)]',
		lease: 'text-[var(--color-metric-primary)] bg-[var(--color-metric-primary-bg)] border-[var(--color-metric-primary-border)]',
		property: 'text-[var(--color-metric-revenue)] bg-[var(--color-metric-revenue-bg)] border-[var(--color-metric-revenue-border)]',
		tenant: 'text-[var(--color-metric-warning)] bg-[var(--color-metric-warning-bg)] border-[var(--color-metric-warning-border)]'
	}
	return colorMap[type] || 'text-[var(--color-metric-neutral)] bg-[var(--color-metric-neutral-bg)] border-[var(--color-metric-neutral-border)]'
}

/**
 * Trend color mapping
 * Returns color classes based on positive/negative/neutral trend
 */
export function getTrendColorClass(trend: 'up' | 'down' | 'stable' | string): string {
	switch (trend) {
		case 'up':
			return 'text-[var(--color-metric-success)]'
		case 'down':
			return 'text-[var(--color-metric-warning)]'
		default:
			return 'text-[var(--color-label-secondary)]'
	}
}

/**
 * Occupancy rate badge class
 * Returns badge color classes based on occupancy percentage
 */
export function getOccupancyBadgeClass(rate: number): string {
	if (rate >= 90) {
		return 'text-[var(--color-metric-success)] border-[var(--color-metric-success-border)]'
	} else if (rate >= 80) {
		return 'text-[var(--color-metric-info)] border-[var(--color-metric-info-border)]'
	} else {
		return 'text-[var(--color-metric-warning)] border-[var(--color-metric-warning-border)]'
	}
}

/**
 * Status color mapping
 * Generic status badge color classes
 */
export function getStatusColorClass(status: string): string {
	const colorMap: Record<string, string> = {
		ACTIVE: 'text-[var(--color-metric-success)] bg-[var(--color-metric-success-bg)] border-[var(--color-metric-success-border)]',
		PENDING: 'text-[var(--color-metric-warning)] bg-[var(--color-metric-warning-bg)] border-[var(--color-metric-warning-border)]',
		INACTIVE: 'text-[var(--color-label-secondary)] bg-[var(--color-fill-secondary)] border-[var(--color-fill-tertiary)]',
		OVERDUE: 'text-[var(--color-system-red)] bg-[var(--color-system-red-10)] border-[var(--color-system-red-15)]',
		complete: 'text-[var(--color-success)] bg-[var(--color-success-bg)]',
		error: 'text-[var(--color-error)] bg-[var(--color-error-background)]'
	}
	return colorMap[status] || 'text-[var(--color-label-secondary)] bg-[var(--color-fill-secondary)] border-[var(--color-fill-tertiary)]'
}

/**
 * Icon background class helper
 * Creates consistent icon background with color and border
 */
export function getIconBgClass(type: string): string {
	const baseClass = 'flex h-10 w-10 items-center justify-center rounded-full border'
	const colorClass = getActivityColorClass(type)
	return cn(baseClass, colorClass)
}
