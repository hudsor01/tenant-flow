'use client'

import { Users, Search, UserPlus } from 'lucide-react'

interface NoTenantsEmptyStateProps {
	onInvite?: (() => void) | undefined
}

export function NoTenantsEmptyState({ onInvite }: NoTenantsEmptyStateProps) {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="max-w-md mx-auto text-center py-16">
				<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
					<Users className="w-8 h-8 text-primary" />
				</div>
				<h2 className="text-xl font-semibold text-foreground mb-3">
					No tenants yet
				</h2>
				<p className="text-muted-foreground mb-6">
					Invite your first tenant to get started with lease management.
				</p>
				<button
					onClick={onInvite}
					className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
				>
					<UserPlus className="w-5 h-5" />
					Invite Your First Tenant
				</button>
			</div>
		</div>
	)
}

interface NoResultsEmptyStateProps {
	onClearFilters: () => void
}

export function NoResultsEmptyState({ onClearFilters }: NoResultsEmptyStateProps) {
	return (
		<div className="text-center py-12">
			<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
			<p className="text-muted-foreground">No tenants match your filters</p>
			<button
				onClick={onClearFilters}
				className="mt-3 text-sm text-primary hover:underline"
			>
				Clear filters
			</button>
		</div>
	)
}
