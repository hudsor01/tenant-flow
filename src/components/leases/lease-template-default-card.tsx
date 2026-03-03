'use client'

import { FileText, Star, Eye, Download, Edit } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseTemplate } from './lease-template-types'
import { CLAUSE_LABELS, formatTemplateDate } from './lease-template-types'

interface LeaseTemplateDefaultCardProps {
	template: LeaseTemplate
	onPreviewTemplate: (templateId: string) => void
	onDownloadTemplate: (templateId: string) => void
	onEditTemplate: (templateId: string) => void
}

export function LeaseTemplateDefaultCard({
	template,
	onPreviewTemplate,
	onDownloadTemplate,
	onEditTemplate
}: LeaseTemplateDefaultCardProps) {
	return (
		<BlurFade delay={0.3} inView>
			<div className="mb-6">
				<h2 className="text-sm font-medium text-muted-foreground mb-3">
					Default Template
				</h2>
				<div className="bg-card border-2 border-primary rounded-lg overflow-hidden">
					<div className="p-6">
						<div className="flex items-start justify-between">
							<div className="flex items-start gap-4">
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<FileText className="w-6 h-6 text-primary" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-lg font-medium">
											{template.name}
										</h3>
										<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
											<Star className="w-3 h-3" />
											Default
										</span>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										{template.description}
									</p>
									<div className="flex items-center gap-4 mt-3">
										<span className="text-xs text-muted-foreground">
											{template.leaseTerm === 1
												? 'Month-to-month'
												: `${template.leaseTerm} month term`}
										</span>
										<span className="text-xs text-muted-foreground">
											•
										</span>
										<span className="text-xs text-muted-foreground">
											{template.usageCount} leases created
										</span>
										<span className="text-xs text-muted-foreground">
											•
										</span>
										<span className="text-xs text-muted-foreground">
											Updated {formatTemplateDate(template.lastUpdated)}
										</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => onPreviewTemplate(template.id)}
									className="p-2 hover:bg-muted rounded-lg transition-colors"
									title="Preview"
								>
									<Eye className="w-4 h-4 text-muted-foreground" />
								</button>
								<button
									onClick={() => onDownloadTemplate(template.id)}
									className="p-2 hover:bg-muted rounded-lg transition-colors"
									title="Download"
								>
									<Download className="w-4 h-4 text-muted-foreground" />
								</button>
								<button
									onClick={() => onEditTemplate(template.id)}
									className="p-2 hover:bg-muted rounded-lg transition-colors"
									title="Edit"
								>
									<Edit className="w-4 h-4 text-muted-foreground" />
								</button>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 mt-4">
							{template.clauses.map(clause => (
								<span
									key={clause}
									className="inline-flex items-center px-2.5 py-1 text-xs bg-muted rounded-full"
								>
									{CLAUSE_LABELS[clause] ?? clause}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
