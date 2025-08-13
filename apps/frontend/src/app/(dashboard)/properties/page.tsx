'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter
} from 'lucide-react'
import { PropertiesDataTable } from '@/components/properties/properties-data-table'
import { PropertiesStats } from '@/components/properties/properties-stats'
import { PropertyDetailsDrawer } from '@/components/properties/property-details-drawer'
import { PropertyFormDialog } from '@/components/properties/property-form-dialog'
import { PropertyDeleteDialog } from '@/components/properties/property-delete-dialog'
import { useProperties } from '@/hooks/api/use-properties'
import type { Property } from '@repo/shared'

function PropertiesHeader({ onAddProperty }: { onAddProperty: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Properties
        </h1>
        <p className="text-muted-foreground">
          Manage your rental properties and track occupancy
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button size="sm" onClick={onAddProperty}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>
    </div>
  )
}

interface PropertiesSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  propertyType: string
  onPropertyTypeChange: (type: string) => void
}

function PropertiesSearch({ 
  searchQuery, 
  onSearchChange, 
  propertyType, 
  onPropertyTypeChange 
}: PropertiesSearchProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search properties by name, address, or type..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
        
        {showFilters && (
          <div className="mt-4 flex gap-4">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={propertyType}
              onChange={(e) => onPropertyTypeChange(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="MIXED_USE">Mixed Use</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PropertiesPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyType, setPropertyType] = useState('')
  useProperties()

  const handleViewProperty = (property: Property) => {
    setSelectedPropertyId(property.id)
    setSelectedProperty(property)
    setDrawerOpen(true)
  }

  const handleAddProperty = () => {
    setFormMode('create')
    setSelectedProperty(null)
    setFormDialogOpen(true)
  }

  const handleEditProperty = (property?: Property) => {
    setFormMode('edit')
    setSelectedProperty(property || selectedProperty)
    setFormDialogOpen(true)
    setDrawerOpen(false)
  }

  const handleDeleteProperty = () => {
    setDeleteDialogOpen(true)
    setDrawerOpen(false)
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <PropertiesHeader onAddProperty={handleAddProperty} />
      
      <PropertiesStats />
      
      <PropertiesSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        propertyType={propertyType}
        onPropertyTypeChange={setPropertyType}
      />
      
      <PropertiesDataTable 
        searchQuery={searchQuery}
        propertyType={propertyType}
        onViewProperty={handleViewProperty}
        onEditProperty={handleEditProperty}
      />

      <PropertyDetailsDrawer
        propertyId={selectedPropertyId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={() => handleEditProperty(selectedProperty || undefined)}
        onDelete={handleDeleteProperty}
      />

      <PropertyFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        property={selectedProperty}
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