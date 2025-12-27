'use client'

import * as React from 'react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	FileText,
	Download,
	Clock,
	CheckCircle,
	Calendar,
	Search
} from 'lucide-react'
import { Input } from '#components/ui/input'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'

const logger = createLogger({ component: 'TaxDocumentsPage' })

interface TaxDocument {
	id: string
	name: string
	year: number
	status: 'ready' | 'pending' | 'filed'
	downloadUrl?: string
	estimatedDate?: string
}

// Sample data - in production this would come from an API
const sampleDocuments: TaxDocument[] = [
	{ id: '1', name: 'Form 1099-MISC', year: 2024, status: 'pending', estimatedDate: '2025-01-31' },
	{ id: '2', name: 'Schedule E (Rental Income)', year: 2024, status: 'pending', estimatedDate: '2025-02-15' },
	{ id: '3', name: 'Property Tax Statement', year: 2024, status: 'ready', downloadUrl: '#' },
	{ id: '4', name: 'Depreciation Schedule', year: 2024, status: 'ready', downloadUrl: '#' },
	{ id: '5', name: 'Form 1099-MISC', year: 2023, status: 'filed', downloadUrl: '#' },
	{ id: '6', name: 'Schedule E (Rental Income)', year: 2023, status: 'filed', downloadUrl: '#' },
	{ id: '7', name: 'Property Tax Statement', year: 2023, status: 'filed', downloadUrl: '#' },
	{ id: '8', name: 'Depreciation Schedule', year: 2023, status: 'filed', downloadUrl: '#' },
]

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

export default function TaxDocumentsPage() {
	const [yearFilter, setYearFilter] = React.useState<string>('all')
	const [statusFilter, setStatusFilter] = React.useState<string>('all')
	const [searchQuery, setSearchQuery] = React.useState('')
	const [isLoading, setIsLoading] = React.useState(true)

	// Simulate loading
	React.useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 500)
		return () => clearTimeout(timer)
	}, [])

	const documents = sampleDocuments

	// Get unique years for filter
	const years = [...new Set(documents.map(d => d.year))].sort((a, b) => b - a)

	// Filter documents
	const filteredDocuments = documents.filter(doc => {
		if (yearFilter !== 'all' && doc.year !== parseInt(yearFilter)) return false
		if (statusFilter !== 'all' && doc.status !== statusFilter) return false
		if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
		return true
	})

	// Group documents by year
	const documentsByYear = filteredDocuments.reduce<Record<number, TaxDocument[]>>((acc, doc) => {
		const yearDocs = acc[doc.year] ?? []
		yearDocs.push(doc)
		acc[doc.year] = yearDocs
		return acc
	}, {})

	const statusConfig = {
		ready: {
			icon: CheckCircle,
			label: 'Ready',
			className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
			iconClass: 'text-emerald-600',
		},
		pending: {
			icon: Clock,
			label: 'Pending',
			className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
			iconClass: 'text-amber-600',
		},
		filed: {
			icon: CheckCircle,
			label: 'Filed',
			className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
			iconClass: 'text-blue-600',
		},
	}

	// Summary counts
	const readyCount = documents.filter(d => d.status === 'ready').length
	const pendingCount = documents.filter(d => d.status === 'pending').length
	const filedCount = documents.filter(d => d.status === 'filed').length

	const handleDownload = (documentId: string) => {
		// TODO: [PROD] Implement actual download functionality
		logger.debug('Downloading document', { documentId })
	}

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Content skeleton */}
				<Skeleton className="h-12 w-full mb-6 rounded-lg" />
				<div className="space-y-6">
					{[1, 2].map(i => (
						<Skeleton key={i} className="h-48 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Tax Documents</h1>
						<p className="text-muted-foreground">Download and manage tax-related documents.</p>
					</div>
				</div>
			</BlurFade>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
				<button
					onClick={() => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')}
					className={`p-4 rounded-lg border transition-colors text-left ${
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
							<p className="text-2xl font-semibold tabular-nums">{readyCount}</p>
							<p className="text-sm text-muted-foreground">Ready to Download</p>
						</div>
					</div>
				</button>
				</BlurFade>

				<BlurFade delay={0.2} inView>
				<button
					onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
					className={`p-4 rounded-lg border transition-colors text-left ${
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
							<p className="text-2xl font-semibold tabular-nums">{pendingCount}</p>
							<p className="text-sm text-muted-foreground">Pending Generation</p>
						</div>
					</div>
				</button>
				</BlurFade>

				<BlurFade delay={0.25} inView>
				<button
					onClick={() => setStatusFilter(statusFilter === 'filed' ? 'all' : 'filed')}
					className={`p-4 rounded-lg border transition-colors text-left ${
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
							<p className="text-2xl font-semibold tabular-nums">{filedCount}</p>
							<p className="text-sm text-muted-foreground">Filed / Archived</p>
						</div>
					</div>
				</button>
				</BlurFade>
			</div>

			{/* Filters */}
			<BlurFade delay={0.3} inView>
			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search documents..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Select value={yearFilter} onValueChange={setYearFilter}>
					<SelectTrigger className="w-[130px]">
						<SelectValue placeholder="All Years" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Years</SelectItem>
						{years.map(year => (
							<SelectItem key={year} value={year.toString()}>{year}</SelectItem>
						))}
					</SelectContent>
				</Select>
				{statusFilter !== 'all' && (
					<button
						onClick={() => setStatusFilter('all')}
						className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
					>
						Clear filter
					</button>
				)}
			</div>
			</BlurFade>

			{/* Documents List */}
			<BlurFade delay={0.35} inView>
			<div className="space-y-6">
				{Object.entries(documentsByYear)
					.sort(([a], [b]) => Number(b) - Number(a))
					.map(([year, docs]) => (
						<div key={year} className="bg-card border border-border rounded-lg overflow-hidden">
							<div className="p-4 border-b border-border bg-muted/30">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<h3 className="font-medium text-foreground">Tax Year {year}</h3>
									<span className="text-sm text-muted-foreground">({docs.length} documents)</span>
								</div>
							</div>
							<div className="divide-y divide-border">
								{docs.map((doc) => {
									const status = statusConfig[doc.status]
									const StatusIcon = status.icon
									return (
										<div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
											<div className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
													<FileText className="w-5 h-5 text-muted-foreground" />
												</div>
												<div>
													<p className="text-sm font-medium">{doc.name}</p>
													{doc.status === 'pending' && doc.estimatedDate && (
														<p className="text-xs text-muted-foreground">
															Expected: {formatDate(doc.estimatedDate)}
														</p>
													)}
												</div>
											</div>
											<div className="flex items-center gap-3">
												<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.className}`}>
													<StatusIcon className="w-3.5 h-3.5" />
													{status.label}
												</span>
												{doc.status !== 'pending' && (
													<button
														onClick={() => handleDownload(doc.id)}
														className="p-2 hover:bg-muted rounded-lg transition-colors"
														title="Download"
													>
														<Download className="w-4 h-4 text-muted-foreground" />
													</button>
												)}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					))}
			</div>
			</BlurFade>

			{/* Empty State */}
			{filteredDocuments.length === 0 && (
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
			)}
		</div>
	)
}
