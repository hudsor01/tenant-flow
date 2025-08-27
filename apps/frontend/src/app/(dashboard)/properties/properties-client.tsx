'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PropertiesDataTable } from '@/components/properties/properties-data-table'
import { PropertyDetailsDrawer } from '@/components/properties/property-details-drawer'
import { PropertyFormDialog } from '@/components/properties/property-form-dialog'
import { PropertyDeleteDialog } from '@/components/properties/property-delete-dialog'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']

interface PropertiesClientProps {
	className?: string
}

/**
 * Client component handling interactive properties functionality
 * Extracted from main page to follow React 19 server-first architecture
 */
export function PropertiesClient({ className }: PropertiesClientProps) {
	// Client-only state
	const [searchQuery, setSearchQuery] = useState('')
	const [propertyType] = useState<string>('')
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null
	)
	const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
		null
	)
	const [formDialogOpen, setFormDialogOpen] = useState(false)
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Event handlers
	const handleAddProperty = () => {
		setFormMode('create')
		setSelectedProperty(null)
		setFormDialogOpen(true)
	}

	const handleEditProperty = (property?: Property) => {
		if (property) {
			setSelectedProperty(property)
			setFormMode('edit')
			setFormDialogOpen(true)
		}
	}

	const handleViewProperty = (property: Property) => {
		setSelectedProperty(property)
		setSelectedPropertyId(property.id)
		setDrawerOpen(true)
	}

	const handleDeleteProperty = () => {
		setDeleteDialogOpen(true)
	}

	return (
		<div className={className}>
			{/* Search and Filter Controls */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 gap-2">
					<div className="relative max-w-sm flex-1">
						<i className="i-lucide-search inline-block text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"  />
						<Input
							placeholder="Search properties..."
							value={searchQuery}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>
							) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Button variant="outline" size="sm">
						<i className="i-lucide-filter inline-block mr-2 h-4 w-4"  />
						Filter
					</Button>
				</div>
				<Button onClick={handleAddProperty} size="sm">
					<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
					Add Property
				</Button>
			</div>

			{/* Data Table */}
			<PropertiesDataTable
				searchQuery={searchQuery}
				propertyType={propertyType}
				onViewProperty={handleViewProperty}
				onEditProperty={handleEditProperty}
			/>

			{/* Modals and Drawers */}
			<PropertyDetailsDrawer
				propertyId={selectedPropertyId}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				onEdit={() => handleEditProperty(selectedProperty ?? undefined)}
				onDelete={handleDeleteProperty}
			/>

			<PropertyFormDialog
				open={formDialogOpen}
				onOpenChange={(open) => setFormDialogOpen(open)}
				property={selectedProperty ?? undefined}
				mode={formMode}
			/>

			<PropertyDeleteDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				property={selectedProperty}
			/>
		</div>
	)
}
