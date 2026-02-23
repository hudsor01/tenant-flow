'use client'

import { FileText, Plus } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface LeaseTemplateEmptyStateProps {
	searchQuery: string
	onCreateTemplate: () => void
}

export function LeaseTemplateEmptyState({
	searchQuery,
	onCreateTemplate
}: LeaseTemplateEmptyStateProps) {
	return (
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
	)
}
