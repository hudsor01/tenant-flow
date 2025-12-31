'use client'

import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'

export function LeasesEmptyState() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<FileText className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No leases yet
					</h2>
					<p className="text-muted-foreground mb-6">
						Create your first lease to start managing tenant agreements.
					</p>
					<Link
						href="/leases/new"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-5 h-5" />
						Create First Lease
					</Link>
				</div>
			</BlurFade>
		</div>
	)
}
