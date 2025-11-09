/**
 * Tenant Documents
 *
 * Shows all documents related to the tenant's lease:
 * - Lease agreement
 * - Lease addendums
 * - Rent receipts
 * - Move-in checklist
 * - Property rules/policies
 * - Important notices
 */

'use client'

import { TenantGuard } from '#components/auth/tenant-guard'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { Calendar, Download, Eye, FileText, FolderOpen } from 'lucide-react'

export default function TenantDocumentsPage() {
	const { data, isLoading, error, refetch } = useTenantPortalDocuments()
	const documents = data?.documents ?? []
	const leaseDocs = documents.filter(doc => doc.type === 'LEASE')
	const receiptDocs = documents.filter(doc => doc.type === 'RECEIPT')

	const renderDocumentRow = (doc: (typeof documents)[number]) => (
		<div
			key={doc.id}
			className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
		>
			<div className="flex items-center gap-4 flex-1">
				{doc.type === 'LEASE' ? (
					<FileText className="size-6 text-accent-main" />
				) : (
					<FolderOpen className="size-6 text-accent-main" />
				)}
				<div className="flex-1">
					<p className="font-medium">{doc.name}</p>
					<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
						{doc.createdAt && (
							<div className="flex items-center gap-1">
								<Calendar className="size-3" />
								<span>
									Uploaded on{' '}
									{(() => {
										try {
											const date = new Date(doc.createdAt)
											return isNaN(date.getTime())
												? 'Unknown date'
												: date.toLocaleDateString()
										} catch {
											return 'Unknown date'
										}
									})()}
								</span>
							</div>
						)}
						{doc.url && <span>•</span>}
						<span>
							{doc.url ? 'Download available' : 'Contact manager for access'}
						</span>
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
						// Validate URL scheme for security
						try {
							const url = new URL(doc.url)
							if (url.protocol === 'http:' || url.protocol === 'https:') {
								window.open(doc.url, '_blank', 'noopener,noreferrer')
							}
						} catch {
							// Invalid URL, do nothing
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
		<TenantGuard>
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
				<p className="text-muted-foreground">
					View and download your lease documents and important notices
				</p>
			</div>

			{error && (
				<div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
					<div className="flex items-center justify-between">
						<p className="text-sm text-destructive">
							Failed to load documents. Please try again.
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							className="ml-4"
						>
							Retry
						</Button>
					</div>
				</div>
			)}

			<CardLayout
				title="Lease Documents"
				description="Signed agreements and addendums"
			>
				{isLoading ? (
					<div className="space-y-3">
						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-4 flex-1">
								<FileText className="size-6 text-accent-main" />
								<div className="flex-1">
									<div className="flex items-center gap-3">
										<p className="font-medium">Lease Agreement - 2024</p>
										<Badge
											variant="outline"
											className="bg-green-50 text-green-700 border-green-200"
										>
											Signed
										</Badge>
									</div>
									<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
										<div className="flex items-center gap-1">
											<Calendar className="size-3" />
											<span>
												Signed on <Skeleton className="inline-block h-4 w-20" />
											</span>
										</div>
										<span>•</span>
										<span>PDF, 1.2 MB</span>
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Eye className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Download className="size-4 mr-2" />
									Download
								</Button>
							</div>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-4 flex-1">
								<FileText className="size-6 text-accent-main" />
								<div className="flex-1">
									<div className="flex items-center gap-3">
										<p className="font-medium">Pet Addendum</p>
										<Badge
											variant="outline"
											className="bg-green-50 text-green-700 border-green-200"
										>
											Signed
										</Badge>
									</div>
									<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
										<div className="flex items-center gap-1">
											<Calendar className="size-3" />
											<span>
												Signed on <Skeleton className="inline-block h-4 w-20" />
											</span>
										</div>
										<span>•</span>
										<span>PDF, 245 KB</span>
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Eye className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Download className="size-4 mr-2" />
									Download
								</Button>
							</div>
						</div>
					</div>
				) : leaseDocs.length > 0 ? (
					<div className="space-y-3">
						{leaseDocs.map(renderDocumentRow)}
					</div>
				) : (
					<p className="text-sm text-center text-muted-foreground py-8">
						No lease documents available yet
					</p>
				)}
			</CardLayout>

				{/* Move-In Documents */}
				<CardLayout
					title="Move-In Documents"
					description="Documents from your move-in inspection"
				>
					<div className="space-y-3">
						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-4 flex-1">
								<FileText className="size-6 text-accent-main" />
								<div className="flex-1">
									<p className="font-medium">Move-In Checklist</p>
									<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
										<div className="flex items-center gap-1">
											<Calendar className="size-3" />
											<span>
												Completed on{' '}
												<Skeleton className="inline-block h-4 w-20" />
											</span>
										</div>
										<span>•</span>
										<span>PDF, 892 KB</span>
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Eye className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Download className="size-4 mr-2" />
									Download
								</Button>
							</div>
						</div>

						<p className="text-sm text-center text-muted-foreground py-8">
							No move-in documents available yet
						</p>
					</div>
				</CardLayout>

				{/* Property Rules & Policies */}
				<CardLayout
					title="Property Rules & Policies"
					description="Important information about your property"
				>
					<div className="space-y-3">
						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-4 flex-1">
								<FolderOpen className="size-6 text-accent-main" />
								<div className="flex-1">
									<p className="font-medium">Community Rules</p>
									<p className="text-sm text-muted-foreground mt-1">
										Property guidelines and community standards
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Eye className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Download className="size-4 mr-2" />
									Download
								</Button>
							</div>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-4 flex-1">
								<FolderOpen className="size-6 text-accent-main" />
								<div className="flex-1">
									<p className="font-medium">Emergency Procedures</p>
									<p className="text-sm text-muted-foreground mt-1">
										What to do in case of emergency
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Eye className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Download className="size-4 mr-2" />
									Download
								</Button>
							</div>
						</div>

						<p className="text-sm text-center text-muted-foreground py-8">
							No property documents available yet
						</p>
					</div>
				</CardLayout>

				{/* Notices & Communications */}
				<CardLayout
					title="Notices & Communications"
					description="Important notices from your property manager"
				>
					<div className="space-y-3">
						<p className="text-sm text-center text-muted-foreground py-8">
							No notices at this time
						</p>
					</div>
				</CardLayout>
		</div>
	</TenantGuard>
	)
}
