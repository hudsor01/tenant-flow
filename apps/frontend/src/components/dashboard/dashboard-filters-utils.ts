/**
 * Dashboard Filters Utilities
 *
 * Utility functions and types for the DashboardFilters component.
 */

import { format, subDays, subMonths, startOfMonth } from 'date-fns'

export type DateRangePreset = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom'

export interface DateRange {
	start: string
	end: string
}

export interface DashboardFiltersProps {
	/** Controlled date range value */
	dateRange?: DateRange | undefined
	/** Callback when date range changes */
	onDateRangeChange?: (range: DateRange) => void
	/** Data to export (for CSV/PDF) */
	exportData?:
		| {
				stats?: Record<string, unknown>
				propertyPerformance?: Array<Record<string, unknown>>
		  }
		| undefined
	/** Disabled state for loading */
	disabled?: boolean
	/** Compact mode for mobile */
	compact?: boolean
}

/**
 * Calculate date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
	const today = new Date()
	const end = format(today, 'yyyy-MM-dd')

	switch (preset) {
		case '7d':
			return { start: format(subDays(today, 7), 'yyyy-MM-dd'), end }
		case '30d':
			return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end }
		case '90d':
			return { start: format(subDays(today, 90), 'yyyy-MM-dd'), end }
		case '6m':
			return { start: format(subMonths(today, 6), 'yyyy-MM-dd'), end }
		case '1y':
			return { start: format(subMonths(today, 12), 'yyyy-MM-dd'), end }
		default:
			return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end }
	}
}

/**
 * Get human-readable label for a preset
 */
export function getPresetLabel(preset: DateRangePreset): string {
	const labels: Record<DateRangePreset, string> = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'90d': 'Last 90 days',
		'6m': 'Last 6 months',
		'1y': 'Last year',
		custom: 'Custom range'
	}
	return labels[preset]
}

/**
 * Convert an array of records to CSV format
 */
export function convertToCSV(
	data: Array<Record<string, unknown>>,
	headers?: string[]
): string {
	if (data.length === 0) return ''

	const keys = headers ?? Object.keys(data[0]!)
	const headerRow = keys.join(',')
	const rows = data.map(row =>
		keys
			.map(key => {
				const value = row[key]
				if (value === null || value === undefined) return ''
				if (typeof value === 'string' && value.includes(',')) {
					return `"${value.replace(/"/g, '""')}"`
				}
				return String(value)
			})
			.join(',')
	)

	return [headerRow, ...rows].join('\n')
}

/**
 * Trigger a browser file download
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string
) {
	const blob = new Blob([content], { type: mimeType })
	const url = window.URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	window.URL.revokeObjectURL(url)
}
