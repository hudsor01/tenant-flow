'use client'

/**
 * Dashboard Filters Component
 *
 * Provides date range filtering and export functionality for the dashboard.
 * Uses controlled state pattern for flexibility with parent components.
 */

import { useState } from 'react'
import { format } from 'date-fns'
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
import { callGeneratePdfFromHtml } from '#hooks/api/use-report-mutations'
import type { DateRangePreset, DashboardFiltersProps } from './dashboard-filters-utils'
import {
	getDateRangeFromPreset,
	convertToCSV,
	downloadFile
} from './dashboard-filters-utils'
import { DashboardFiltersCompact } from './dashboard-filters-compact'

/* eslint-disable color-tokens/no-hex-colors -- PDF HTML content uses inline styles intentionally; not rendered by the browser */
function buildDashboardPdfHtml(
	stats: Record<string, unknown>,
	propCount: number
): string {
	const tableRows = Object.entries(stats)
		.map(([key, value]) => {
			const displayValue = value === null || value === undefined
				? ''
				: typeof value === 'object'
					? JSON.stringify(value)
					: String(value)
			return `<tr><td style="border:1px solid #ccc;padding:6px 10px;font-weight:500">${key}</td><td style="border:1px solid #ccc;padding:6px 10px">${displayValue}</td></tr>`
		})
		.join('')
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard Report</title>
</head>
<body style="font-family:Arial,sans-serif;margin:32px;color:#222">
  <h1 style="font-size:20px;margin-bottom:4px">Dashboard Report</h1>
  <p style="color:#666;font-size:13px;margin-bottom:16px">Generated: ${new Date().toLocaleDateString()} &mdash; ${propCount} propert${propCount === 1 ? 'y' : 'ies'}</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <thead><tr>
      <th style="border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left">Metric</th>
      <th style="border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left">Value</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`
}
/* eslint-enable color-tokens/no-hex-colors */

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

	const handlePresetChange = (preset: DateRangePreset) => {
			setActivePreset(preset)
			if (preset !== 'custom') {
				const range = getDateRangeFromPreset(preset)
				onDateRangeChange?.(range)
				setShowCustomRange(false)
			} else {
				setShowCustomRange(true)
			}
		}

	const handleCustomRangeApply = () => {
		if (customStart && customEnd) {
			onDateRangeChange?.({ start: customStart, end: customEnd })
			setShowCustomRange(false)
		}
	}

	const handleExportCSV = async () => {
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
	}

	const handleExportPDF = async () => {
		if (!exportData?.stats) {
			toast.error('No data available to export')
			return
		}

		setIsExporting('pdf')
		try {
			const timestamp = format(new Date(), 'yyyy-MM-dd')
			const filename = `dashboard-report-${timestamp}.pdf`
			const stats = exportData.stats as Record<string, unknown>
			const propCount = exportData.propertyPerformance?.length ?? 0
			const html = buildDashboardPdfHtml(stats, propCount)
			await callGeneratePdfFromHtml(html, filename)
			toast.success('Dashboard report exported as PDF')
		} catch {
			toast.error('Failed to export PDF')
		} finally {
			setIsExporting(null)
		}
	}

	if (compact) {
		return (
			<DashboardFiltersCompact
				activePreset={activePreset}
				disabled={disabled}
				hasExportData={!!exportData}
				isExporting={isExporting}
				onPresetChange={handlePresetChange}
				onExportCSV={handleExportCSV}
				onExportPDF={handleExportPDF}
			/>
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
