'use client'

import { useState } from 'react'
import {
	FileText,
	Plus,
	MoreVertical,
	Edit,
	Copy,
	Trash2,
	Star,
	Clock,
	Search,
	Download,
	Eye
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface LeaseTemplate {
	id: string
	name: string
	description: string
	leaseTerm: number
	isDefault: boolean
	clauses: string[]
	lastUpdated: string
	usageCount: number
}

interface LeaseTemplatesProps {
	templates: LeaseTemplate[]
	onCreateTemplate: () => void
	onEditTemplate: (templateId: string) => void
	onDuplicateTemplate: (templateId: string) => void
	onDeleteTemplate: (templateId: string) => void
	onSetDefault: (templateId: string) => void
	onPreviewTemplate: (templateId: string) => void
	onDownloadTemplate: (templateId: string) => void
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}

const CLAUSE_LABELS: Record<string, string> = {
	security_deposit: 'Security Deposit',
	late_fees: 'Late Fees',
	maintenance: 'Maintenance Responsibilities',
	utilities: 'Utilities',
	pets_prohibited: 'No Pets',
	pets_allowed: 'Pets Allowed',
	pet_deposit: 'Pet Deposit',
	breed_restrictions: 'Breed Restrictions',
	subletting_prohibited: 'No Subletting',
	'30_day_notice': '30-Day Notice',
	renewal_option: 'Renewal Option'
}

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
			template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			template.description.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const defaultTemplate = templates.find(t => t.isDefault)
	const otherTemplates = filteredTemplates.filter(t => !t.isDefault)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
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

			{/* Search */}
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

			{/* Default Template */}
			{defaultTemplate &&
				(!searchQuery ||
					defaultTemplate.name
						.toLowerCase()
						.includes(searchQuery.toLowerCase())) && (
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
														{defaultTemplate.name}
													</h3>
													<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
														<Star className="w-3 h-3" />
														Default
													</span>
												</div>
												<p className="text-sm text-muted-foreground mt-1">
													{defaultTemplate.description}
												</p>
												<div className="flex items-center gap-4 mt-3">
													<span className="text-xs text-muted-foreground">
														{defaultTemplate.leaseTerm === 1
															? 'Month-to-month'
															: `${defaultTemplate.leaseTerm} month term`}
													</span>
													<span className="text-xs text-muted-foreground">
														•
													</span>
													<span className="text-xs text-muted-foreground">
														{defaultTemplate.usageCount} leases created
													</span>
													<span className="text-xs text-muted-foreground">
														•
													</span>
													<span className="text-xs text-muted-foreground">
														Updated {formatDate(defaultTemplate.lastUpdated)}
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => onPreviewTemplate(defaultTemplate.id)}
												className="p-2 hover:bg-muted rounded-lg transition-colors"
												title="Preview"
											>
												<Eye className="w-4 h-4 text-muted-foreground" />
											</button>
											<button
												onClick={() => onDownloadTemplate(defaultTemplate.id)}
												className="p-2 hover:bg-muted rounded-lg transition-colors"
												title="Download"
											>
												<Download className="w-4 h-4 text-muted-foreground" />
											</button>
											<button
												onClick={() => onEditTemplate(defaultTemplate.id)}
												className="p-2 hover:bg-muted rounded-lg transition-colors"
												title="Edit"
											>
												<Edit className="w-4 h-4 text-muted-foreground" />
											</button>
										</div>
									</div>
									<div className="flex flex-wrap gap-2 mt-4">
										{defaultTemplate.clauses.map(clause => (
											<span
												key={clause}
												className="inline-flex items-center px-2.5 py-1 text-xs bg-muted rounded-full"
											>
												{CLAUSE_LABELS[clause] || clause}
											</span>
										))}
									</div>
								</div>
							</div>
						</div>
					</BlurFade>
				)}

			{/* Other Templates */}
			{otherTemplates.length > 0 && (
				<BlurFade delay={0.4} inView>
					<div>
						<h2 className="text-sm font-medium text-muted-foreground mb-3">
							All Templates
						</h2>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{otherTemplates.map((template, idx) => (
								<BlurFade key={template.id} delay={0.45 + idx * 0.05} inView>
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
														setOpenMenuId(
															openMenuId === template.id ? null : template.id
														)
													}
													className="p-1.5 hover:bg-muted rounded-lg transition-colors"
												>
													<MoreVertical className="w-4 h-4 text-muted-foreground" />
												</button>
												{openMenuId === template.id && (
													<div className="absolute right-0 top-8 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
														<div className="py-1">
															<button
																onClick={() => {
																	onPreviewTemplate(template.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
															>
																<Eye className="w-4 h-4" />
																Preview
															</button>
															<button
																onClick={() => {
																	onEditTemplate(template.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
															>
																<Edit className="w-4 h-4" />
																Edit
															</button>
															<button
																onClick={() => {
																	onDuplicateTemplate(template.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
															>
																<Copy className="w-4 h-4" />
																Duplicate
															</button>
															<button
																onClick={() => {
																	onSetDefault(template.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
															>
																<Star className="w-4 h-4" />
																Set as Default
															</button>
															<button
																onClick={() => {
																	onDownloadTemplate(template.id)
																	setOpenMenuId(null)
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
																	setOpenMenuId(null)
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
												{formatDate(template.lastUpdated)}
											</span>
										</div>
										<div className="flex flex-wrap gap-1.5 mt-3">
											{template.clauses.slice(0, 4).map(clause => (
												<span
													key={clause}
													className="inline-flex items-center px-2 py-0.5 text-xs bg-muted rounded-full"
												>
													{CLAUSE_LABELS[clause] || clause}
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
							))}
						</div>
					</div>
				</BlurFade>
			)}

			{/* Empty State */}
			{filteredTemplates.length === 0 && (
				<BlurFade delay={0.3} inView>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<FileText className="w-8 h-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-medium mb-1">No templates found</h3>
						<p className="text-sm text-muted-foreground mb-4">
							{searchQuery
								? 'Try adjusting your search to find more results.'
								: 'Create your first lease template to get started.'}
						</p>
						{!searchQuery && (
							<button
								onClick={onCreateTemplate}
								className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create Template
							</button>
						)}
					</div>
				</BlurFade>
			)}
		</div>
	)
}
