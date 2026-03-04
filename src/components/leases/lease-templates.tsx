'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseTemplatesProps } from './lease-template-types'
import { LeaseTemplateDefaultCard } from './lease-template-default-card'
import { LeaseTemplateCard } from './lease-template-card'
import { LeaseTemplateEmptyState } from './lease-template-empty-state'

export function LeaseTemplates({
	templates,
	onCreateTemplate,
	onEditTemplate,
	onDuplicateTemplate,
	onDeleteTemplate,
	onSetDefault,
	onPreviewTemplate,
	onDownloadTemplate
}: LeaseTemplatesProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [openMenuId, setOpenMenuId] = useState<string | null>(null)

	const filteredTemplates = templates.filter(
		template =>
			(template.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
			(template.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
	)

	const defaultTemplate = templates.find(t => t.isDefault)
	const otherTemplates = filteredTemplates.filter(t => !t.isDefault)

	const showDefaultTemplate =
		defaultTemplate !== undefined &&
		(!searchQuery ||
			(defaultTemplate.name ?? '')
				.toLowerCase()
				.includes(searchQuery.toLowerCase()))

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Lease Templates
						</h1>
						<p className="text-muted-foreground">
							Manage and customize your lease agreement templates.
						</p>
					</div>
					<button
						onClick={onCreateTemplate}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Template
					</button>
				</div>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<div className="relative mb-6">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search templates..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full max-w-md pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
			</BlurFade>

			{showDefaultTemplate && (
				<LeaseTemplateDefaultCard
					template={defaultTemplate}
					onPreviewTemplate={onPreviewTemplate}
					onDownloadTemplate={onDownloadTemplate}
					onEditTemplate={onEditTemplate}
				/>
			)}

			{otherTemplates.length > 0 && (
				<BlurFade delay={0.4} inView>
					<div>
						<h2 className="text-sm font-medium text-muted-foreground mb-3">
							All Templates
						</h2>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{otherTemplates.map((template, idx) => (
								<LeaseTemplateCard
									key={template.id}
									template={template}
									index={idx}
									openMenuId={openMenuId}
									onMenuToggle={setOpenMenuId}
									onPreviewTemplate={onPreviewTemplate}
									onEditTemplate={onEditTemplate}
									onDuplicateTemplate={onDuplicateTemplate}
									onSetDefault={onSetDefault}
									onDownloadTemplate={onDownloadTemplate}
									onDeleteTemplate={onDeleteTemplate}
								/>
							))}
						</div>
					</div>
				</BlurFade>
			)}

			{filteredTemplates.length === 0 && (
				<LeaseTemplateEmptyState
					searchQuery={searchQuery}
					onCreateTemplate={onCreateTemplate}
				/>
			)}
		</div>
	)
}
