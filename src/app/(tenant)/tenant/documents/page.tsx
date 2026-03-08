'use client'

import { useTenantLeaseDocuments } from '#hooks/api/use-tenant-lease'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Calendar, Download, Eye, FileText, FolderOpen } from 'lucide-react'
import { createLogger } from '#lib/frontend-logger.js'
import {
	LeaseDocumentsSkeleton,
	MoveInDocumentsSection,
	PropertyRulesSection
} from './documents-static-sections'

const logger = createLogger({ component: 'TenantDocumentsPage' })

export default function TenantDocumentsPage() {
	const { data, isLoading, error, refetch } = useTenantLeaseDocuments()
	const documents = data?.documents ?? []
	const leaseDocs = documents.filter(doc => doc.type === 'LEASE')

	const renderDocumentRow = (doc: (typeof documents)[number]) => (
		<div key={doc.id} className="flex-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
			<div className="flex items-center gap-4 flex-1">
				{doc.type === 'LEASE' ? (
					<FileText className="size-6 text-accent-main" />
				) : (
					<FolderOpen className="size-6 text-accent-main" />
				)}
				<div className="flex-1">
					<p className="font-medium">{doc.name}</p>
					<div className="flex items-center gap-4 text-muted-foreground mt-1">
						{doc.created_at && (
							<div className="flex items-center gap-1">
								<Calendar className="size-3" />
								<span>
									Uploaded on{' '}
									{(() => {
										try {
											const date = new Date(doc.created_at)
											return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
										} catch {
											return 'Unknown date'
										}
									})()}
								</span>
							</div>
						)}
						{doc.url && <span>•</span>}
						<span>{doc.url ? 'Download available' : 'Contact manager for access'}</span>
					</div>
				</div>
			</div>
			<div className="flex gap-2">
				<Button
					variant="ghost"
					size="sm"
					disabled={!doc.url}
					aria-label={`View ${doc.name || 'document'}`}
					onClick={() => {
						if (!doc.url) return
						try {
							const url = new URL(doc.url)
							if (url.protocol !== 'https:') {
								logger.error('Invalid URL protocol', { metadata: { protocol: url.protocol } })
								return
							}
							if (!url.hostname) {
								logger.error('Invalid URL hostname', { metadata: { hostname: url.hostname } })
								return
							}
							window.open(doc.url, '_blank', 'noopener,noreferrer')
						} catch {
							logger.error('Invalid URL format', { metadata: { url: doc.url } })
						}
					}}
				>
					<Eye className="size-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={!doc.url}
					onClick={() => {
						if (!doc.url) return
						const anchor = document.createElement('a')
						anchor.href = doc.url
						anchor.download = doc.name || 'document'
						document.body.appendChild(anchor)
						anchor.click()
						document.body.removeChild(anchor)
					}}
				>
					<Download className="size-4 mr-2" />
					Download
				</Button>
			</div>
		</div>
	)

	return (
		<div className="space-y-8">
			<div>
				<h1 className="typography-h1">My Documents</h1>
				<p className="text-muted-foreground">View and download your lease documents and important notices</p>
			</div>

			{error && (
				<div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
					<div className="flex-between">
						<p className="text-sm text-destructive">Failed to load documents. Please try again.</p>
						<Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">Retry</Button>
					</div>
				</div>
			)}

			<CardLayout title="Lease Documents" description="Signed agreements and addendums">
				{isLoading ? (
					<LeaseDocumentsSkeleton />
				) : leaseDocs.length > 0 ? (
					<div className="space-y-3">{leaseDocs.map(renderDocumentRow)}</div>
				) : (
					<p className="text-muted-foreground text-center py-8">No lease documents available yet</p>
				)}
			</CardLayout>

			<MoveInDocumentsSection />
			<PropertyRulesSection />

			<CardLayout title="Notices & Communications" description="Important notices from your property manager">
				<div className="space-y-3">
					<p className="text-muted-foreground text-center py-8">No notices at this time</p>
				</div>
			</CardLayout>
		</div>
	)
}
