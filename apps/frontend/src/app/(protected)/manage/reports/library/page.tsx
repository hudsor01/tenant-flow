'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
// reportsClient intentionally not imported here; used by hooks
import { useReports } from '#hooks/api/use-reports'
import { format } from 'date-fns'
import { Download, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ReportLibraryPage() {
	// Local UI state: pagination and dialogs
	const [offset, setOffset] = useState(0)
	const [deleteReportId, setDeleteReportId] = useState<string | null>(null)

	const limit = 20

	const {
		reports,
		total,
		isLoading,
		deleteMutation,
		downloadingIds,
		deletingIds,
		downloadReport,
		deleteReport
	} = useReports({
		offset,
		limit
	})

	function handleDownload(reportId: string) {
		downloadReport(reportId)
	}

	function handleDelete() {
		if (!deleteReportId) return
		deleteReport(deleteReportId)
	}

	function getReportTypeBadge(reportType: string) {
		const labels: Record<string, string> = {
			'executive-monthly': 'Executive Monthly',
			'financial-performance': 'Financial',
			'property-portfolio': 'Property',
			'lease-portfolio': 'Lease',
			'maintenance-operations': 'Maintenance',
			'tax-preparation': 'Tax'
		}
		return labels[reportType] || reportType
	}

	function getStatusBadge(status: string) {
		const variants: Record<
			string,
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			completed: 'default',
			generating: 'secondary',
			failed: 'destructive'
		}
		return (
			<Badge variant={variants[status] || 'outline'}>
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</Badge>
		)
	}

	function formatFileSize(bytes: number | null) {
		if (!bytes) return 'N/A'
		const kb = bytes / 1024
		const mb = kb / 1024
		return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`
	}

	const hasMore = offset + limit < total
	const hasPrevious = offset > 0

	return (
		<div className="@container/main flex min-h-screen w-full flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Report Library</h1>
				<p className="text-muted-foreground">
					View and download your generated reports
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Generated Reports</CardTitle>
					<CardDescription>
						{total} {total === 1 ? 'report' : 'reports'} total
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-muted-foreground">Loading reports...</div>
						</div>
					) : reports.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FileText />
								</EmptyMedia>
								<EmptyTitle>No reports yet</EmptyTitle>
								<EmptyDescription>
									Generate your first report to see it here
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild>
									<Link href="/manage/reports/generate">Generate Report</Link>
								</Button>
							</EmptyContent>
						</Empty>
					) : (
						<div className="space-y-4">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Report Name</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Format</TableHead>
										<TableHead>Date Range</TableHead>
										<TableHead>Size</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Created</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{reports.map(report => (
										<TableRow key={report.id}>
											<TableCell className="font-medium">
												{report.reportName}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{getReportTypeBadge(report.reportType)}
												</Badge>
											</TableCell>
											<TableCell className="uppercase">
												{report.format}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{format(new Date(report.start_date), 'MMM d, yyyy')} -{' '}
												{format(new Date(report.end_date), 'MMM d, yyyy')}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{formatFileSize(report.fileSize)}
											</TableCell>
											<TableCell>{getStatusBadge(report.status)}</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{format(
													new Date(report.created_at),
													'MMM d, yyyy h:mm a'
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleDownload(report.id)}
														disabled={
															report.status !== 'completed' ||
															downloadingIds.has(report.id)
														}
													>
														<Download className="mr-2 size-4" />
														{downloadingIds.has(report.id)
															? 'Downloading...'
															: 'Download'}
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => setDeleteReportId(report.id)}
													>
														<Trash2 className="mr-2 size-4" />
														Delete
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{(hasMore || hasPrevious) && (
								<div className="flex items-center justify-between">
									<div className="text-sm text-muted-foreground">
										Showing {offset + 1} to {Math.min(offset + limit, total)} of{' '}
										{total} reports
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setOffset(Math.max(0, offset - limit))}
											disabled={!hasPrevious}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setOffset(offset + limit)}
											disabled={!hasMore}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={!!deleteReportId}
				onOpenChange={() => setDeleteReportId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Report</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this report? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={
								deleteMutation.isPending ||
								(!!deleteReportId && deletingIds.has(deleteReportId))
							}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{(!!deleteReportId && deletingIds.has(deleteReportId)) ||
							deleteMutation.isPending
								? 'Deleting...'
								: 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
