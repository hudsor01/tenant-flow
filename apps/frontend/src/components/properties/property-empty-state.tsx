'use client'

import { Building2, Plus, Search } from 'lucide-react'
import { Button } from '#components/ui/button'

interface PropertyEmptyStateProps {
	onAddProperty?: (() => void) | undefined
}

export function PropertyEmptyState({ onAddProperty }: PropertyEmptyStateProps) {
	return (
		<div className="p-6 lg:p-8 min-h-full bg-background">
			<div className="max-w-md mx-auto text-center py-16">
				<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
					<Building2 className="w-8 h-8 text-primary" />
				</div>
				<h2 className="text-xl font-semibold text-foreground mb-3">
					No properties yet
				</h2>
				<p className="text-muted-foreground mb-6">
					Add your first property to start managing your portfolio.
				</p>
				<Button
					onClick={onAddProperty}
					className="gap-2 min-h-11"
					aria-label="Add your first property to the portfolio"
				>
					<Plus className="w-5 h-5" />
					Add Your First Property
				</Button>
			</div>
		</div>
	)
}

interface PropertyNoResultsProps {
	onClearFilters: () => void
}

export function PropertyNoResults({ onClearFilters }: PropertyNoResultsProps) {
	return (
		<div className="text-center py-12">
			<Search
				className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3"
				aria-hidden="true"
			/>
			<p className="text-muted-foreground">
				No properties match your filters
			</p>
			<Button
				variant="link"
				onClick={onClearFilters}
				className="mt-3 min-h-11"
				aria-label="Clear all filters"
			>
				Clear filters
			</Button>
		</div>
	)
}
