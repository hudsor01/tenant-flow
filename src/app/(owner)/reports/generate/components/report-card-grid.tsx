'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Download } from 'lucide-react'
import type { ReportCard, ReportFormat, ReportType } from './report-types'

interface ReportCardGridProps {
	title: string
	description: string
	reports: ReportCard[]
	generatingReports: Record<string, boolean>
	onGenerate: (reportId: ReportType, format: ReportFormat) => void
}

export function ReportCardGrid({
	title,
	description,
	reports,
	generatingReports,
	onGenerate
}: ReportCardGridProps) {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="font-medium text-foreground">{title}</h2>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{reports.map(report => {
					const Icon = report.icon
					return (
						<Card key={report.id} className="flex flex-col">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon className="size-5" />
									{report.title}
								</CardTitle>
								<CardDescription>{report.description}</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col gap-3">
								<div className="flex-1" />
								<div className="flex gap-2">
									{report.formats.map(format => {
										const reportKey = `${report.id}-${format}`
										const isGenerating = generatingReports[reportKey]
										return (
											<Button
												key={format}
												variant={format === 'pdf' ? 'default' : 'outline'}
												size="sm"
												onClick={() => onGenerate(report.id, format)}
												disabled={isGenerating}
												className="flex-1"
											>
												<Download className="mr-2 size-4" />
												{isGenerating
													? 'Generating...'
													: format.toUpperCase()}
											</Button>
										)
									})}
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
