'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PropertiesDataTable } from '@/components/properties/properties-data-table'
import { Property_DetailsDrawer } from '@/components/properties/property-details-drawer'
import { Property_FormDialog } from '@/components/properties/property-form-dialog'
import { Property_DeleteDialog } from '@/components/properties/property-delete-dialog'
import type { PropertyWithUnits } from '@repo/shared'

// Define local alias
type Property_ = PropertyWithUnits

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
	const [selectedProperty_, setSelectedProperty_] = useState<Property_ | null>(
		null
	)
	const [selectedProperty_Id, setSelectedProperty_Id] = useState<string | null>(
		null
	)
	const [formDialogOpen, setFormDialogOpen] = useState(false)
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Event handlers
	const handleAddProperty_ = () => {
		setFormMode('create')
		setSelectedProperty_(null)
		setFormDialogOpen(true)
	}

	const handleEditProperty_ = (property?: Property_) => {
		if (property) {
			setSelectedProperty_(property)
			setFormMode('edit')
			setFormDialogOpen(true)
		}
	}

	const handleViewProperty_ = (property: Property_) => {
		setSelectedProperty_(property)
		setSelectedProperty_Id(property.id)
		setDrawerOpen(true)
	}

	const handleDeleteProperty_ = () => {
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
				<Button onClick={handleAddProperty_} size="sm">
					<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
					Add Property_
				</Button>
			</div>

			{/* Data Table */}
			<PropertiesDataTable
				searchQuery={searchQuery}
				propertyType={propertyType}
				onViewProperty_={handleViewProperty_}
				onEditProperty_={handleEditProperty_}
			/>

			{/* Modals and Drawers */}
			<Property_DetailsDrawer
				propertyId={selectedProperty_Id}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				onEdit={() => handleEditProperty_(selectedProperty_ ?? undefined)}
				onDelete={handleDeleteProperty_}
			/>

			<Property_FormDialog
				open={formDialogOpen}
				onOpenChange={(open) => setFormDialogOpen(open)}
				property={selectedProperty_ ?? undefined}
				mode={formMode}
			/>

            <Property_DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                property={selectedProperty_ ?? null}
            />
		</div>
	)
}
