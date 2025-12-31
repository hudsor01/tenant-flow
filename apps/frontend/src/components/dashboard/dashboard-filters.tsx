'use client'

/**
 * Dashboard Filters Component
 *
 * Provides date range filtering and export functionality for the dashboard.
 * Uses controlled state pattern for flexibility with parent components.
 */

import { useState, useCallback } from 'react'
import { format, subDays, subMonths, startOfMonth } from 'date-fns'
import { Calendar, Download, FileText, ChevronDown } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '#components/ui/popover'
import { toast } from 'sonner'
import { apiRequestRaw } from '#lib/api-request'

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
function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
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
 * Get preset label
 */
function getPresetLabel(preset: DateRangePreset): string {
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
 * Convert data to CSV format
 */
function convertToCSV(
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
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string) {
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

/**
 * Dashboard Filters - Date range picker and export controls
 */
export function DashboardFilters({
	onDateRangeChange,
	exportData,
	disabled = false,
	compact = false
}: DashboardFiltersProps) {
	const [activePreset, setActivePreset] = useState<DateRangePreset>('30d')
	const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null)
	const [showCustomRange, setShowCustomRange] = useState(false)

	// Internal state for custom range
	const [customStart, setCustomStart] = useState('')
	const [customEnd, setCustomEnd] = useState('')

	const handlePresetChange = useCallback(
		(preset: DateRangePreset) => {
			setActivePreset(preset)
			if (preset !== 'custom') {
				const range = getDateRangeFromPreset(preset)
				onDateRangeChange?.(range)
				setShowCustomRange(false)
			} else {
				setShowCustomRange(true)
			}
		},
		[onDateRangeChange]
	)

	const handleCustomRangeApply = useCallback(() => {
		if (customStart && customEnd) {
			onDateRangeChange?.({ start: customStart, end: customEnd })
			setShowCustomRange(false)
		}
	}, [customStart, customEnd, onDateRangeChange])

	const handleExportCSV = useCallback(async () => {
		if (
			!exportData?.propertyPerformance ||
			exportData.propertyPerformance.length === 0
		) {
			toast.error('No data available to export')
			return
		}

		setIsExporting('csv')
		try {
			const csv = convertToCSV(exportData.propertyPerformance, [
				'property',
				'address_line1',
				'totalUnits',
				'occupiedUnits',
				'occupancyRate',
				'monthlyRevenue'
			])
			const timestamp = format(new Date(), 'yyyy-MM-dd')
			downloadFile(csv, `dashboard-report-${timestamp}.csv`, 'text/csv')
			toast.success('Dashboard data exported as CSV')
		} catch {
			toast.error('Failed to export CSV')
		} finally {
			setIsExporting(null)
		}
	}, [exportData])

	const handleExportPDF = useCallback(async () => {
		if (!exportData?.stats) {
			toast.error('No data available to export')
			return
		}

		setIsExporting('pdf')
		try {
			const response = await apiRequestRaw('/api/v1/reports/export/pdf', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Dashboard Report',
					filename: `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}`,
					payload: {
						...exportData.stats,
						propertyPerformance: exportData.propertyPerformance,
						generatedAt: new Date().toISOString()
					}
				})
			})

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(url)

			toast.success('Dashboard report exported as PDF')
		} catch {
			toast.error('Failed to export PDF')
		} finally {
			setIsExporting(null)
		}
	}, [exportData])

	if (compact) {
		return (
			<div className="flex items-center gap-2">
				{/* Compact date range dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={disabled}
							className="h-9 gap-2"
						>
							<Calendar className="h-4 w-4" aria-hidden="true" />
							<span className="hidden sm:inline">
								{getPresetLabel(activePreset)}
							</span>
							<ChevronDown className="h-3 w-3" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => handlePresetChange('7d')}>
							Last 7 days
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handlePresetChange('30d')}>
							Last 30 days
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handlePresetChange('90d')}>
							Last 90 days
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handlePresetChange('6m')}>
							Last 6 months
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handlePresetChange('1y')}>
							Last year
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Export dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={disabled || !exportData}
							className="h-9 gap-2"
						>
							<Download className="h-4 w-4" aria-hidden="true" />
							<span className="hidden sm:inline">Export</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={handleExportCSV}
							disabled={isExporting === 'csv'}
						>
							<FileText className="h-4 w-4 mr-2" aria-hidden="true" />
							Export CSV
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleExportPDF}
							disabled={isExporting === 'pdf'}
						>
							<FileText className="h-4 w-4 mr-2" aria-hidden="true" />
							Export PDF
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-3 flex-wrap">
			{/* Date range presets */}
			<div className="flex items-center gap-1 bg-muted rounded-lg p-1">
				{(['7d', '30d', '90d', '6m', '1y'] as DateRangePreset[]).map(preset => (
					<button
						key={preset}
						onClick={() => handlePresetChange(preset)}
						disabled={disabled}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							activePreset === preset
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						{preset === '7d' && '7D'}
						{preset === '30d' && '30D'}
						{preset === '90d' && '90D'}
						{preset === '6m' && '6M'}
						{preset === '1y' && '1Y'}
					</button>
				))}
			</div>

			{/* Custom date range popover */}
			<Popover open={showCustomRange} onOpenChange={setShowCustomRange}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						disabled={disabled}
						className={`h-9 gap-2 ${activePreset === 'custom' ? 'border-primary' : ''}`}
					>
						<Calendar className="h-4 w-4" aria-hidden="true" />
						Custom
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80" align="end">
					<div className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="custom-start" className="text-sm font-medium">
								Start date
							</label>
							<Input
								id="custom-start"
								type="date"
								value={customStart}
								onChange={e => setCustomStart(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="custom-end" className="text-sm font-medium">
								End date
							</label>
							<Input
								id="custom-end"
								type="date"
								value={customEnd}
								onChange={e => setCustomEnd(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowCustomRange(false)}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleCustomRangeApply}
								disabled={!customStart || !customEnd}
							>
								Apply
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			<div className="h-6 w-px bg-border" />

			{/* Export buttons */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						disabled={disabled || !exportData}
						className="h-9 gap-2"
					>
						<Download className="h-4 w-4" aria-hidden="true" />
						Export
						<ChevronDown className="h-3 w-3" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={handleExportCSV}
						disabled={isExporting === 'csv'}
					>
						<FileText className="h-4 w-4 mr-2" aria-hidden="true" />
						Export as CSV
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleExportPDF}
						disabled={isExporting === 'pdf'}
					>
						<FileText className="h-4 w-4 mr-2" aria-hidden="true" />
						Export as PDF
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
