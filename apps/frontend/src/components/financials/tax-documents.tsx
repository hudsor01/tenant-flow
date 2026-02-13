'use client'

import { useState } from 'react'
import {
	FileText,
	Download,
	Clock,
	CheckCircle,
	Calendar,
	Search
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface TaxDocument {
	id: string
	name: string
	year: number
	status: 'ready' | 'pending' | 'filed'
	downloadUrl?: string
	estimatedDate?: string
}

interface TaxDocumentsProps {
	documents: TaxDocument[]
	onDownload?: (documentId: string) => void
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}

export function TaxDocuments({ documents, onDownload }: TaxDocumentsProps) {
	const [yearFilter, setYearFilter] = useState<'all' | number>('all')
	const [statusFilter, setStatusFilter] = useState<
		'all' | 'ready' | 'pending' | 'filed'
	>('all')
	const [searchQuery, setSearchQuery] = useState('')

	// Get unique years for filter
	const years = [...new Set(documents.map(d => d.year))].sort((a, b) => b - a)

	// Filter documents
	const filteredDocuments = documents.filter(doc => {
		if (yearFilter !== 'all' && doc.year !== yearFilter) return false
		if (statusFilter !== 'all' && doc.status !== statusFilter) return false
		if (
			searchQuery &&
			!(doc.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
		)
			return false
		return true
	})

	// Group documents by year
	const documentsByYear = filteredDocuments.reduce(
		(acc, doc) => {
			const yearDocs = acc[doc.year] ?? []
			yearDocs.push(doc)
			acc[doc.year] = yearDocs
			return acc
		},
		{} as Record<number, TaxDocument[]>
	)

	const statusConfig = {
		ready: {
			icon: CheckCircle,
			label: 'Ready',
			className:
				'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
			iconClass: 'text-emerald-600'
		},
		pending: {
			icon: Clock,
			label: 'Pending',
			className:
				'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
			iconClass: 'text-amber-600'
		},
		filed: {
			icon: CheckCircle,
			label: 'Filed',
			className:
				'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
			iconClass: 'text-blue-600'
		}
	}

	// Summary counts
	const readyCount = documents.filter(d => d.status === 'ready').length
	const pendingCount = documents.filter(d => d.status === 'pending').length
	const filedCount = documents.filter(d => d.status === 'filed').length

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Tax Documents
						</h1>
						<p className="text-muted-foreground">
							Download and manage tax-related documents.
						</p>
					</div>
				</div>
			</BlurFade>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<BlurFade delay={0.2} inView>
					<button
						onClick={() =>
							setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')
						}
						className={`w-full p-4 rounded-lg border transition-colors text-left ${
							statusFilter === 'ready'
								? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
								: 'border-border bg-card hover:bg-muted/50'
						}`}
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
								<CheckCircle className="w-5 h-5 text-emerald-600" />
							</div>
							<div>
								<p className="text-2xl font-semibold">{readyCount}</p>
								<p className="text-sm text-muted-foreground">
									Ready to Download
								</p>
							</div>
						</div>
					</button>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<button
						onClick={() =>
							setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')
						}
						className={`w-full p-4 rounded-lg border transition-colors text-left ${
							statusFilter === 'pending'
								? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
								: 'border-border bg-card hover:bg-muted/50'
						}`}
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
								<Clock className="w-5 h-5 text-amber-600" />
							</div>
							<div>
								<p className="text-2xl font-semibold">{pendingCount}</p>
								<p className="text-sm text-muted-foreground">
									Pending Generation
								</p>
							</div>
						</div>
					</button>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<button
						onClick={() =>
							setStatusFilter(statusFilter === 'filed' ? 'all' : 'filed')
						}
						className={`w-full p-4 rounded-lg border transition-colors text-left ${
							statusFilter === 'filed'
								? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
								: 'border-border bg-card hover:bg-muted/50'
						}`}
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
								<FileText className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<p className="text-2xl font-semibold">{filedCount}</p>
								<p className="text-sm text-muted-foreground">
									Filed / Archived
								</p>
							</div>
						</div>
					</button>
				</BlurFade>
			</div>

			{/* Filters */}
			<BlurFade delay={0.5} inView>
				<div className="flex flex-col sm:flex-row gap-3 mb-6">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search documents..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
					<select
						value={yearFilter}
						onChange={e =>
							setYearFilter(
								e.target.value === 'all' ? 'all' : Number(e.target.value)
							)
						}
						className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg"
					>
						<option value="all">All Years</option>
						{years.map(year => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
			</BlurFade>

			{/* Documents List */}
			<div className="space-y-6">
				{Object.entries(documentsByYear)
					.sort(([a], [b]) => Number(b) - Number(a))
					.map(([year, docs], groupIdx) => (
						<BlurFade key={year} delay={0.6 + groupIdx * 0.1} inView>
							<div className="bg-card border border-border rounded-lg overflow-hidden">
								<div className="p-4 border-b border-border bg-muted/30">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />
										<h3 className="font-medium text-foreground">
											Tax Year {year}
										</h3>
										<span className="text-sm text-muted-foreground">
											({docs.length} documents)
										</span>
									</div>
								</div>
								<div className="divide-y divide-border">
									{docs.map((doc, idx) => {
										const status = statusConfig[doc.status]
										const StatusIcon = status.icon
										return (
											<BlurFade
												key={doc.id}
												delay={0.65 + groupIdx * 0.1 + idx * 0.03}
												inView
											>
												<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
													<div className="flex items-center gap-4">
														<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
															<FileText className="w-5 h-5 text-muted-foreground" />
														</div>
														<div>
															<p className="text-sm font-medium">{doc.name}</p>
															{doc.status === 'pending' &&
																doc.estimatedDate && (
																	<p className="text-xs text-muted-foreground">
																		Expected: {formatDate(doc.estimatedDate)}
																	</p>
																)}
														</div>
													</div>
													<div className="flex items-center gap-3">
														<span
															className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.className}`}
														>
															<StatusIcon className="w-3.5 h-3.5" />
															{status.label}
														</span>
														{doc.status !== 'pending' && (
															<button
																onClick={() => onDownload?.(doc.id)}
																className="p-2 hover:bg-muted rounded-lg transition-colors"
																title="Download"
															>
																<Download className="w-4 h-4 text-muted-foreground" />
															</button>
														)}
													</div>
												</div>
											</BlurFade>
										)
									})}
								</div>
							</div>
						</BlurFade>
					))}
			</div>

			{/* Empty State */}
			{filteredDocuments.length === 0 && (
				<BlurFade delay={0.6} inView>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<FileText className="w-8 h-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-medium mb-1">No documents found</h3>
						<p className="text-sm text-muted-foreground">
							{searchQuery || statusFilter !== 'all' || yearFilter !== 'all'
								? 'Try adjusting your filters to see more results.'
								: 'Tax documents will appear here as they become available.'}
						</p>
					</div>
				</BlurFade>
			)}
		</div>
	)
}
