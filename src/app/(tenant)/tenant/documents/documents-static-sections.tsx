import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { Badge } from '#components/ui/badge'
import { Calendar, Download, Eye, FileText, FolderOpen } from 'lucide-react'

export function LeaseDocumentsSkeleton() {
	return (
		<div className="space-y-3">
			<div className="flex-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
				<div className="flex items-center gap-4 flex-1">
					<FileText className="size-6 text-accent-main" />
					<div className="flex-1">
						<div className="flex items-center gap-3">
							<p className="font-medium">Lease Agreement - 2024</p>
							<Badge variant="outline" className="bg-success/10 text-success border-success/20">Signed</Badge>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground mt-1">
							<div className="flex items-center gap-1">
								<Calendar className="size-3" />
								<span>Signed on</span>
								<Skeleton className="inline-block h-4 w-20" />
							</div>
							<span>•</span>
							<span>PDF, 1.2 MB</span>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="ghost" size="sm"><Eye className="size-4" /></Button>
					<Button variant="outline" size="sm"><Download className="size-4 mr-2" />Download</Button>
				</div>
			</div>

			<div className="flex-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
				<div className="flex items-center gap-4 flex-1">
					<FileText className="size-6 text-accent-main" />
					<div className="flex-1">
						<div className="flex items-center gap-3">
							<p className="font-medium">Pet Addendum</p>
							<Badge variant="outline" className="bg-success/10 text-success border-success/20">Signed</Badge>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground mt-1">
							<div className="flex items-center gap-1">
								<Calendar className="size-3" />
								<span>Signed on</span>
								<Skeleton className="inline-block h-4 w-20" />
							</div>
							<span>•</span>
							<span>PDF, 245 KB</span>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="ghost" size="sm"><Eye className="size-4" /></Button>
					<Button variant="outline" size="sm"><Download className="size-4 mr-2" />Download</Button>
				</div>
			</div>
		</div>
	)
}

export function MoveInDocumentsSection() {
	return (
		<CardLayout title="Move-In Documents" description="Documents from your move-in inspection">
			<div className="space-y-3">
				<div className="flex-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
					<div className="flex items-center gap-4 flex-1">
						<FileText className="size-6 text-accent-main" />
						<div className="flex-1">
							<p className="font-medium">Move-In Checklist</p>
							<div className="flex items-center gap-4 text-muted-foreground mt-1">
								<div className="flex items-center gap-1">
									<Calendar className="size-3" />
									<span>Completed on</span>
									<Skeleton className="inline-block h-4 w-20" />
								</div>
								<span>•</span>
								<span>PDF, 892 KB</span>
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm"><Eye className="size-4" /></Button>
						<Button variant="outline" size="sm"><Download className="size-4 mr-2" />Download</Button>
					</div>
				</div>
				<p className="text-muted-foreground text-center py-8">No move-in documents available yet</p>
			</div>
		</CardLayout>
	)
}

export function PropertyRulesSection() {
	return (
		<CardLayout title="Property Rules & Policies" description="Important information about your property">
			<div className="space-y-3">
				<StaticDocumentRow icon={FolderOpen} title="Community Rules" subtitle="Property guidelines and community standards" />
				<StaticDocumentRow icon={FolderOpen} title="Emergency Procedures" subtitle="What to do in case of emergency" />
				<p className="text-muted-foreground text-center py-8">No property documents available yet</p>
			</div>
		</CardLayout>
	)
}

function StaticDocumentRow({ icon: Icon, title, subtitle }: { icon: typeof FolderOpen; title: string; subtitle: string }) {
	return (
		<div className="flex-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
			<div className="flex items-center gap-4 flex-1">
				<Icon className="size-6 text-accent-main" />
				<div className="flex-1">
					<p className="font-medium">{title}</p>
					<p className="text-muted-foreground mt-1">{subtitle}</p>
				</div>
			</div>
			<div className="flex gap-2">
				<Button variant="ghost" size="sm"><Eye className="size-4" /></Button>
				<Button variant="outline" size="sm"><Download className="size-4 mr-2" />Download</Button>
			</div>
		</div>
	)
}
