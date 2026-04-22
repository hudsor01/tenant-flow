import {
	AlertCircle,
	CheckCircle2,
	FileCheck,
	X,
	AlertTriangle,
	FileText
} from 'lucide-react'
import { cn } from '#lib/utils'
import type { ParsedRow } from '#types/api-contracts'
import { Badge } from '#components/ui/badge'
import { formatBytes } from '#lib/format-bytes'

interface BulkImportValidateStepProps<T> {
	file: File
	parseResult: {
		rows: ParsedRow<T>[]
		tooManyRows: boolean
		totalRowCount: number
	} | null
	templateHeaders: readonly string[]
}

// Headers render as "Unit Number" rather than "unit_number" — same display
// ruleset the Supabase dashboard uses for column names.
function headerToLabel(header: string): string {
	return header
		.split('_')
		.map(part => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
		.join(' ')
}

export function BulkImportValidateStep<T>({
	file,
	parseResult,
	templateHeaders
}: BulkImportValidateStepProps<T>) {
	const parsedData = parseResult?.rows ?? []
	const errorCount = parsedData.filter(row => row.errors.length > 0).length
	const validCount = parsedData.length - errorCount
	const hasErrors = errorCount > 0

	// Budget four preview columns + the status column. Users who want the
	// full row inspect the CSV file directly; a 10-column table doesn't fit
	// the dialog width on anything smaller than a desktop.
	const previewHeaders = templateHeaders.slice(0, 4)

	return (
		<div className="space-y-5">
			{/* File Info Card */}
			<div className="card-standard p-4 bg-linear-to-r from-success/5 to-transparent">
				<div className="flex items-center gap-3">
					<div className="icon-container-md bg-success/10 text-success border border-success/20">
						<FileCheck className="size-5" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold truncate">{file.name}</p>
						<p className="text-xs text-muted-foreground">
							{formatBytes(file.size)} • CSV file
						</p>
					</div>
					<Badge
						variant="outline"
						className="bg-success/10 text-success border-success/20"
					>
						Uploaded
					</Badge>
				</div>
			</div>

			{/* Too Many Rows Warning */}
			{parseResult?.tooManyRows && (
				<div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
					<AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
					<div>
						<p className="typography-small text-warning-foreground">
							Too many rows
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Your CSV has {parseResult.totalRowCount} rows. Maximum is 100 rows per import. Only the first 100 rows are shown.
						</p>
					</div>
				</div>
			)}

			{/* Validation Summary */}
			<div className="grid grid-cols-2 gap-3">
				<div
					className={cn(
						'card-standard p-3 flex items-center gap-3',
						validCount > 0 ? 'bg-success/5 border-success/20' : 'bg-muted/30'
					)}
				>
					<div className="icon-container-sm bg-success/10 text-success">
						<CheckCircle2 className="size-4" />
					</div>
					<div>
						<p className="text-lg font-bold text-success">{validCount}</p>
						<p className="text-xs text-muted-foreground">Valid rows</p>
					</div>
				</div>
				<div
					className={cn(
						'card-standard p-3 flex items-center gap-3',
						hasErrors ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
					)}
				>
					<div
						className={cn(
							'icon-container-sm',
							hasErrors
								? 'bg-destructive/10 text-destructive'
								: 'bg-muted text-muted-foreground'
						)}
					>
						<AlertTriangle className="size-4" />
					</div>
					<div>
						<p
							className={cn(
								'text-lg font-bold',
								hasErrors ? 'text-destructive' : 'text-muted-foreground'
							)}
						>
							{errorCount}
						</p>
						<p className="text-xs text-muted-foreground">Errors found</p>
					</div>
				</div>
			</div>

			{/* Error Alert Banner */}
			{hasErrors && (
				<div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
					<AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
					<div>
						<p className="typography-small text-destructive">
							{errorCount} row{errorCount > 1 ? 's' : ''} have errors
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Fix errors in your CSV and re-upload. All rows must be valid before importing.
						</p>
					</div>
				</div>
			)}

			{/* Preview Section Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileText className="size-4 text-muted-foreground" />
					<p className="text-sm font-semibold">Data Preview</p>
					<Badge variant="secondary" className="text-xs">
						{parsedData.length} rows
					</Badge>
				</div>
			</div>

			{/* Enhanced Preview Table */}
			{parsedData.length > 0 ? (
				<div className="card-standard overflow-hidden">
					<div className="overflow-x-auto max-h-72">
						<table className="w-full text-sm">
							<thead className="bg-muted/60 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">
										Row
									</th>
									{previewHeaders.map(header => (
										<th
											key={header}
											className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground"
										>
											{headerToLabel(header)}
										</th>
									))}
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-32">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50">
								{parsedData.map(row => (
									<tr
										key={row.row}
										className={cn(
											'transition-colors',
											row.errors.length > 0
												? 'bg-destructive/5 hover:bg-destructive/10'
												: 'hover:bg-muted/30'
										)}
									>
										<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
											#{row.row}
										</td>
										{previewHeaders.map(header => {
											const value = row.data[header]
											const empty = !value
											return (
												<td
													key={header}
													className={cn(
														'px-4 py-3 max-w-48 truncate',
														empty && 'text-muted-foreground italic'
													)}
												>
													{empty ? '\u2014' : value}
												</td>
											)
										})}
										<td className="px-4 py-3">
											{row.errors.length > 0 ? (
												<div className="space-y-1">
													{row.errors.map((err, i) => (
														<div key={i} className="flex items-center gap-1.5 text-xs text-destructive">
															<X className="size-3 shrink-0" />
															<span className="font-medium">{err.field}:</span>
															<span>{err.message}</span>
														</div>
													))}
												</div>
											) : (
												<div className="flex items-center gap-2">
													<div className="icon-container-sm bg-success/10 text-success shrink-0">
														<CheckCircle2 className="size-3" />
													</div>
													<span className="text-xs text-success font-medium">
														Valid
													</span>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				<div className="card-standard p-8 text-center">
					<div className="icon-container-lg bg-muted text-muted-foreground mx-auto mb-3">
						<FileText className="size-6" />
					</div>
					<p className="typography-small text-muted-foreground">
						No data to preview
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						The uploaded file appears to be empty
					</p>
				</div>
			)}
		</div>
	)
}
