'use client'

import { FileText, Download, MoreHorizontal, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { RecentReport } from './types'

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

interface ReportsRecentTableProps {
	recentReports: RecentReport[]
	onDownloadReport: ((reportId: string) => void) | undefined
}

export function ReportsRecentTable({
	recentReports,
	onDownloadReport
}: ReportsRecentTableProps) {
	return (
		<BlurFade delay={0.9} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
				<div className="p-6 border-b border-border">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-foreground">Recent Reports</h3>
							<p className="text-sm text-muted-foreground">
								Recently generated reports
							</p>
						</div>
					</div>
				</div>

				<div className="divide-y divide-border">
					{recentReports.map((report, idx) => (
						<BlurFade key={report.id} delay={1 + idx * 0.05} inView>
							<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
								<div className="flex items-center gap-4">
									<div
										className={`w-10 h-10 rounded-lg flex items-center justify-center ${
											report.status === 'completed'
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
												: report.status === 'generating'
													? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
													: 'bg-muted text-muted-foreground'
										}`}
									>
										{report.status === 'generating' ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											<FileText className="w-5 h-5" />
										)}
									</div>
									<div>
										<p className="font-medium text-foreground">{report.name}</p>
										<p className="text-sm text-muted-foreground">
											{formatDate(report.generatedAt)} •{' '}
											{formatFileSize(report.size)}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs px-2 py-1 bg-muted rounded uppercase text-muted-foreground">
										{report.format}
									</span>
									{report.status === 'completed' && (
										<button
											onClick={() => onDownloadReport?.(report.id)}
											className="p-2 hover:bg-muted rounded-lg transition-colors"
										>
											<Download className="w-4 h-4 text-muted-foreground" />
										</button>
									)}
									<button className="p-2 hover:bg-muted rounded-lg transition-colors">
										<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
									</button>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
