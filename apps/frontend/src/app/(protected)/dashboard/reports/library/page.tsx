'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { reportsClient, type GeneratedReport } from '@/lib/api/reports-client'
import { format } from 'date-fns'
import { Download, FileText, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ReportLibraryPage() {
	const [reports, setReports] = useState<GeneratedReport[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [total, setTotal] = useState(0)
	const [offset, setOffset] = useState(0)
	const [deleteReportId, setDeleteReportId] = useState<string | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isDownloading, setIsDownloading] = useState<string | null>(null)

	const limit = 20

	useEffect(() => {
		loadReports()
	}, [offset])

	async function loadReports() {
		try {
			setIsLoading(true)
			const response = await reportsClient.listReports({ limit, offset })
			setReports(response.data)
			setTotal(response.pagination.total)
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to load reports'
			)
		} finally {
			setIsLoading(false)
		}
	}

	async function handleDownload(reportId: string) {
		try {
			setIsDownloading(reportId)
			await reportsClient.downloadReport(reportId)
			toast.success('Report downloaded successfully')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to download report'
			)
		} finally {
			setIsDownloading(null)
		}
	}

	async function handleDelete() {
		if (!deleteReportId) return

		try {
			setIsDeleting(true)
			await reportsClient.deleteReport(deleteReportId)
			toast.success('Report deleted successfully')
			setDeleteReportId(null)
			loadReports()
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to delete report'
			)
		} finally {
			setIsDeleting(false)
		}
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
		<div className="space-y-6">
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
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<FileText className="mb-4 size-12 text-muted-foreground" />
							<h3 className="mb-2 text-lg font-semibold">No reports yet</h3>
							<p className="mb-4 text-sm text-muted-foreground">
								Generate your first report to see it here
							</p>
							<Button asChild>
								<a href="/dashboard/reports/generate">Generate Report</a>
							</Button>
						</div>
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
												{format(new Date(report.startDate), 'MMM d, yyyy')} -{' '}
												{format(new Date(report.endDate), 'MMM d, yyyy')}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{formatFileSize(report.fileSize)}
											</TableCell>
											<TableCell>{getStatusBadge(report.status)}</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{format(
													new Date(report.createdAt),
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
															isDownloading === report.id
														}
													>
														<Download className="mr-2 size-4" />
														{isDownloading === report.id
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
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
