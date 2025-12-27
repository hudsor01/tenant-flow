'use client'

import {
	AlertCircle,
	CheckCircle2,
	FileCheck,
	X,
	AlertTriangle,
	FileText
} from 'lucide-react'
import { cn } from '#lib/utils'
import type { ParsedRow } from '@repo/shared/types/api-contracts'
import { Badge } from '#components/ui/badge'

interface BulkImportValidateStepProps {
	file: File
	parsedData: ParsedRow[]
}

export function BulkImportValidateStep({
	file,
	parsedData
}: BulkImportValidateStepProps) {
	const errorCount = parsedData.filter(row => row.errors.length > 0).length
	const validCount = parsedData.length - errorCount
	const hasErrors = errorCount > 0

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
							{(file.size / 1024).toFixed(1)} KB • CSV file
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
				<div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
					<AlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
					<div>
						<p className="typography-small text-warning-foreground">
							{errorCount} row{errorCount > 1 ? 's' : ''} need attention
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Fix the highlighted errors before importing. Rows with errors will
							be skipped.
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
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">
										Name
									</th>
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">
										Address
									</th>
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">
										City
									</th>
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-20">
										State
									</th>
									<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-32">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50">
								{parsedData.map((row, index) => (
									<tr
										key={row.row}
										className={cn(
											'transition-colors',
											row.errors.length > 0
												? 'bg-destructive/5 hover:bg-destructive/10'
												: 'hover:bg-muted/30'
										)}
										style={{ animationDelay: `${index * 30}ms` }}
									>
										<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
											#{row.row}
										</td>
										<td
											className={cn(
												'px-4 py-3 font-medium',
												!row.data.name && 'text-muted-foreground italic'
											)}
										>
											{row.data.name || '—'}
										</td>
										<td
											className={cn(
												'px-4 py-3',
												!row.data.address && 'text-muted-foreground italic'
											)}
										>
											{row.data.address || '—'}
										</td>
										<td
											className={cn(
												'px-4 py-3',
												!row.data.city && 'text-muted-foreground italic'
											)}
										>
											{row.data.city || '—'}
										</td>
										<td
											className={cn(
												'px-4 py-3 font-mono uppercase',
												!row.data.state && 'text-muted-foreground italic'
											)}
										>
											{row.data.state || '—'}
										</td>
										<td className="px-4 py-3">
											{row.errors.length > 0 ? (
												<div className="flex items-center gap-2">
													<div className="icon-container-sm bg-destructive/10 text-destructive shrink-0">
														<X className="size-3" />
													</div>
													<span
														className="text-xs text-destructive font-medium truncate max-w-24"
														title={row.errors[0]}
													>
														{row.errors[0]}
													</span>
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
