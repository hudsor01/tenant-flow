
import { Plus, Building2, Search } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BulkImportDialog } from '#components/bulk-import/bulk-import-dialog'
import { propertyBulkImportConfig } from './bulk-import-config'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import type { PropertyStatus } from '#types/core'
import type { PropertyType } from './types'

export interface EmptyPropertiesProps {
	onAddProperty?: (() => void) | undefined
}

export function EmptyProperties({ onAddProperty }: EmptyPropertiesProps) {
	return (
		<Empty>
			<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
				<Building2 />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle>No properties yet</EmptyTitle>
				<EmptyDescription>
					Add your first property to start managing your portfolio.
				</EmptyDescription>
			</EmptyHeader>
			<div className="flex items-center gap-3 mt-2">
				<BulkImportDialog config={propertyBulkImportConfig()} />
				<Button
					onClick={onAddProperty}
					className="gap-2"
					aria-label="Add your first property to the portfolio"
				>
					<Plus className="size-5" />
					Add Your First Property
				</Button>
			</div>
		</Empty>
	)
}

export interface PropertiesHeaderProps {
	onAddProperty?: (() => void) | undefined
}

export function PropertiesHeader({ onAddProperty }: PropertiesHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
			<div>
				<h1 className="typography-h1">Properties</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your property portfolio
				</p>
			</div>
			<div className="flex items-center gap-2">
				<BulkImportDialog config={propertyBulkImportConfig()} />
				<Button
					onClick={onAddProperty}
					className="gap-2 min-h-11"
					aria-label="Add a new property"
				>
					<Plus className="w-4 h-4" />
					Add Property
				</Button>
			</div>
		</div>
	)
}

interface NoResultsFilterProps {
	onClearFilters: () => void
}

export function NoResultsFilter({ onClearFilters }: NoResultsFilterProps) {
	return (
		<Empty className="flex-none gap-3 py-12 border-0">
			<EmptyMedia className="text-muted-foreground/40 mb-3 [&_svg]:size-10">
				<Search />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyDescription>No properties match your filters</EmptyDescription>
			</EmptyHeader>
			<div className="flex items-center gap-3 mt-2">
				<Button variant="link" onClick={onClearFilters} aria-label="Clear all filters">
					Clear filters
				</Button>
			</div>
		</Empty>
	)
}

export function useBulkHandlers(
	selectedRows: Set<string>,
	properties: { id: string; status: PropertyStatus; propertyType: PropertyType }[],
	openBulkEdit: (initialStatus: PropertyStatus, initialType: PropertyType) => void,
	deletePropertyMutation: { mutateAsync: (id: string) => Promise<unknown> },
	clearSelection: () => void
) {
	const handleBulkEditOpen = () => {
		if (selectedRows.size === 0) return
		const firstSelected = properties.find(p => selectedRows.has(p.id))
		if (firstSelected) {
			openBulkEdit(firstSelected.status, firstSelected.propertyType)
		}
	}

	const handleBulkDelete = async () => {
		if (selectedRows.size === 0) return
		const ids = Array.from(selectedRows)
		const label = ids.length === 1 ? 'property' : 'properties'
		const confirmed =
			typeof window === 'undefined'
				? true
				: window.confirm(
						`Delete ${ids.length} ${label}? This will mark the ${label} as inactive.`
					)
		if (!confirmed) return
		clearSelection()
		await Promise.allSettled(
			ids.map(id => deletePropertyMutation.mutateAsync(id))
		)
	}

	return { handleBulkEditOpen, handleBulkDelete }
}
