'use client'

/**
 * Dashboard Filters Compact Variant
 *
 * Mobile-optimised, compact layout for the DashboardFilters component.
 * Renders a condensed dropdown-based UI for date range selection and export.
 */

import { Calendar, Download, FileText, ChevronDown } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import type { DateRangePreset } from './dashboard-filters-utils'
import { getPresetLabel } from './dashboard-filters-utils'

interface DashboardFiltersCompactProps {
	activePreset: DateRangePreset
	disabled: boolean
	hasExportData: boolean
	isExporting: 'csv' | 'pdf' | null
	onPresetChange: (preset: DateRangePreset) => void
	onExportCSV: () => void
	onExportPDF: () => void
}

/**
 * Compact filter bar for mobile viewports.
 * All state and handlers are owned by the parent DashboardFilters component.
 */
export function DashboardFiltersCompact({
	activePreset,
	disabled,
	hasExportData,
	isExporting,
	onPresetChange,
	onExportCSV,
	onExportPDF
}: DashboardFiltersCompactProps) {
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
					<DropdownMenuItem onClick={() => onPresetChange('7d')}>
						Last 7 days
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onPresetChange('30d')}>
						Last 30 days
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onPresetChange('90d')}>
						Last 90 days
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onPresetChange('6m')}>
						Last 6 months
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onPresetChange('1y')}>
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
						disabled={disabled || !hasExportData}
						className="h-9 gap-2"
					>
						<Download className="h-4 w-4" aria-hidden="true" />
						<span className="hidden sm:inline">Export</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={onExportCSV}
						disabled={isExporting === 'csv'}
					>
						<FileText className="h-4 w-4 mr-2" aria-hidden="true" />
						Export CSV
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={onExportPDF}
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
