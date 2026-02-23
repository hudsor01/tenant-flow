'use client'

import {
	FileText,
	MoreVertical,
	Edit,
	Copy,
	Trash2,
	Star,
	Clock,
	Download,
	Eye
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseTemplate } from './lease-template-types'
import { CLAUSE_LABELS, formatTemplateDate } from './lease-template-types'

interface LeaseTemplateCardProps {
	template: LeaseTemplate
	index: number
	openMenuId: string | null
	onMenuToggle: (templateId: string | null) => void
	onPreviewTemplate: (templateId: string) => void
	onEditTemplate: (templateId: string) => void
	onDuplicateTemplate: (templateId: string) => void
	onSetDefault: (templateId: string) => void
	onDownloadTemplate: (templateId: string) => void
	onDeleteTemplate: (templateId: string) => void
}

export function LeaseTemplateCard({
	template,
	index,
	openMenuId,
	onMenuToggle,
	onPreviewTemplate,
	onEditTemplate,
	onDuplicateTemplate,
	onSetDefault,
	onDownloadTemplate,
	onDeleteTemplate
}: LeaseTemplateCardProps) {
	return (
		<BlurFade delay={0.45 + index * 0.05} inView>
			<div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
							<FileText className="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<h3 className="font-medium">{template.name}</h3>
							<p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
								{template.description}
							</p>
						</div>
					</div>
					<div className="relative">
						<button
							onClick={() =>
								onMenuToggle(openMenuId === template.id ? null : template.id)
							}
							className="p-1.5 hover:bg-muted rounded-lg transition-colors"
							aria-label="Template actions"
						>
							<MoreVertical className="w-4 h-4 text-muted-foreground" />
						</button>
						{openMenuId === template.id && (
							<div className="absolute right-0 top-8 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
								<div className="py-1">
									<button
										onClick={() => {
											onPreviewTemplate(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
									>
										<Eye className="w-4 h-4" />
										Preview
									</button>
									<button
										onClick={() => {
											onEditTemplate(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
									>
										<Edit className="w-4 h-4" />
										Edit
									</button>
									<button
										onClick={() => {
											onDuplicateTemplate(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
									>
										<Copy className="w-4 h-4" />
										Duplicate
									</button>
									<button
										onClick={() => {
											onSetDefault(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
									>
										<Star className="w-4 h-4" />
										Set as Default
									</button>
									<button
										onClick={() => {
											onDownloadTemplate(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
									>
										<Download className="w-4 h-4" />
										Download
									</button>
									<div className="border-t border-border my-1" />
									<button
										onClick={() => {
											onDeleteTemplate(template.id)
											onMenuToggle(null)
										}}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
									>
										<Trash2 className="w-4 h-4" />
										Delete
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
					<span>
						{template.leaseTerm === 1
							? 'Month-to-month'
							: `${template.leaseTerm}mo`}
					</span>
					<span>•</span>
					<span>{template.usageCount} uses</span>
					<span>•</span>
					<span className="flex items-center gap-1">
						<Clock className="w-3 h-3" />
						{formatTemplateDate(template.lastUpdated)}
					</span>
				</div>
				<div className="flex flex-wrap gap-1.5 mt-3">
					{template.clauses.slice(0, 4).map(clause => (
						<span
							key={clause}
							className="inline-flex items-center px-2 py-0.5 text-xs bg-muted rounded-full"
						>
							{CLAUSE_LABELS[clause] ?? clause}
						</span>
					))}
					{template.clauses.length > 4 && (
						<span className="inline-flex items-center px-2 py-0.5 text-xs bg-muted rounded-full">
							+{template.clauses.length - 4} more
						</span>
					)}
				</div>
			</div>
		</BlurFade>
	)
}
