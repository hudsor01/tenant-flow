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
	return (
		<TenantGuard>
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
				<p className="text-muted-foreground">
					View and download your lease documents and important notices
				</p>
			</div>

			{/* Document Categories */}
			<div className="grid gap-6">
				{/* Lease Documents */}
				<CardLayout
					title="Lease Documents"
					description="Your signed lease agreement and addendums"
				>
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

						<p className="text-sm text-center text-muted-foreground py-8">
							No lease documents available yet
						</p>
					</div>
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
		</div>
		</TenantGuard>
	)
}
