import { useState, useCallback, useEffect } from 'react'
import { Building2, Search, Filter, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Property } from '@tenantflow/shared/types/properties'

// Enhanced imports for new state management
import { useAppStore } from '@/stores/app-store'
import { 
  useSelectionStore, 
  usePropertySelection,
  useBulkActions,
  selectSelectionMode,
  selectBulkSelection 
} from '@/stores/selection-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { useOptimisticMutations, useCacheManagement } from '@/lib/query/query-utils'
import { useProperties, useDeleteProperty } from '@/hooks/useProperties'
import { toast } from 'sonner'

/**
 * Enhanced PropertyList component demonstrating integration with new Zustand stores
 * Shows how to use:
 * - Bulk selection state management
 * - Optimistic updates for better UX
 * - Centralized modal state management
 * - Selection persistence across navigation
 */
export default function EnhancedPropertyList() {
  // Local state for filtering and search
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Centralized modal state
  const { openModal } = useAppStore()
  
  // Selection state management
  const { selectedProperty, setSelectedProperty } = usePropertySelection()
  const { 
    selectionMode, 
    setSelectionMode, 
    toggleBulkItem, 
    selectAllItems, 
    clearBulkSelection,
    getSelectedCount 
  } = useBulkActions()
  
  // Get bulk selection for properties
  const bulkSelectedProperties = useSelectionStore(selectBulkSelection('properties'))
  const selectedCount = getSelectedCount('properties')
  
  // Navigation state for breadcrumbs
  const { setBreadcrumbs, setCurrentPage } = useNavigationStore()
  
  // Optimistic updates and cache management
  const { optimisticRemoveProperty } = useOptimisticMutations()
  const { invalidateProperty } = useCacheManagement()
  
  // Data fetching
  const { data: propertiesResponse, isLoading, refetch } = useProperties()
  const deleteProperty = useDeleteProperty()
  
  const properties = propertiesResponse?.properties || []
  const total = propertiesResponse?.total || 0

  // Filter properties based on search
  const filteredProperties = properties.filter((property: Property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Set navigation context when component mounts
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Properties', path: '/properties', isActive: true },
    ])
    
    setCurrentPage({
      title: 'Properties',
      subtitle: `${total} properties`,
      section: 'properties',
    })
  }, [setBreadcrumbs, setCurrentPage, total])

  // Handle property selection
  const handlePropertySelect = useCallback((property: Property) => {
    if (selectionMode === 'bulk') {
      toggleBulkItem('properties', property.id)
    } else {
      setSelectedProperty(property)
      // Navigate to property detail or show details sidebar
      console.log('Selected property:', property)
    }
  }, [selectionMode, toggleBulkItem, setSelectedProperty])

  // Handle bulk operations
  const handleSelectAll = useCallback(() => {
    const allPropertyIds = filteredProperties.map((p: Property) => p.id)
    selectAllItems('properties', allPropertyIds)
  }, [filteredProperties, selectAllItems])

  const handleClearSelection = useCallback(() => {
    clearBulkSelection('properties')
    setSelectionMode('none')
  }, [clearBulkSelection, setSelectionMode])

  // Enhanced delete with optimistic updates
  const handleDeleteProperty = useCallback(async (property: Property) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${property.name}"? This action cannot be undone.`
    )
    
    if (!confirmDelete) return

    try {
      // Optimistic update - remove from UI immediately
      optimisticRemoveProperty(property.id)
      
      // Perform actual deletion
      await deleteProperty.mutateAsync(property.id)
      
      toast.success(`Property "${property.name}" deleted successfully`)
      
      // Clear selection if deleted property was selected
      if (selectedProperty?.id === property.id) {
        setSelectedProperty(null)
      }
      
      // Remove from bulk selection if selected
      if (bulkSelectedProperties.has(property.id)) {
        toggleBulkItem('properties', property.id)
      }
      
    } catch (error) {
      // On error, refetch to restore correct state
      await refetch()
      toast.error('Failed to delete property')
    }
  }, [
    optimisticRemoveProperty,
    deleteProperty,
    selectedProperty,
    setSelectedProperty,
    bulkSelectedProperties,
    toggleBulkItem,
    refetch
  ])

  // Bulk delete properties
  const handleBulkDelete = useCallback(async () => {
    const selectedPropertyIds = Array.from(bulkSelectedProperties)
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedPropertyIds.length} properties? This action cannot be undone.`
    )
    
    if (!confirmDelete) return

    try {
      // Delete properties in parallel with optimistic updates
      await Promise.all(
        selectedPropertyIds.map(async (propertyId) => {
          const property = properties.find((p: Property) => p.id === propertyId)
          if (property) {
            optimisticRemoveProperty(propertyId)
            await deleteProperty.mutateAsync(propertyId)
          }
        })
      )
      
      toast.success(`${selectedPropertyIds.length} properties deleted successfully`)
      clearBulkSelection('properties')
      setSelectionMode('none')
      
    } catch (error) {
      await refetch()
      toast.error('Failed to delete some properties')
    }
  }, [bulkSelectedProperties, properties, optimisticRemoveProperty, deleteProperty, clearBulkSelection, setSelectionMode, refetch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk selection controls */}
          {selectionMode === 'bulk' && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600">
                {selectedCount} selected
              </span>
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearSelection}>
                Clear
              </Button>
              {selectedCount > 0 && (
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedCount})
                </Button>
              )}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectionMode(selectionMode === 'bulk' ? 'none' : 'bulk')}
          >
            {selectionMode === 'bulk' ? 'Exit Bulk Mode' : 'Bulk Select'}
          </Button>

          <Button
            size="sm"
            onClick={() => openModal('propertyForm')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredProperties.length} of {total} properties
        </p>
        
        {selectedProperty && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedProperty(null)}>
            {selectedProperty.name} selected ✕
          </Badge>
        )}
      </div>

      {/* Properties grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property: Property) => {
          const isSelected = selectedProperty?.id === property.id
          const isBulkSelected = bulkSelectedProperties.has(property.id)
          
          return (
            <Card 
              key={property.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              } ${isBulkSelected ? 'bg-blue-50 border-blue-200' : ''}`}
              onClick={() => handlePropertySelect(property)}
            >
              <CardHeader className="relative">
                {/* Bulk selection checkbox */}
                {selectionMode === 'bulk' && (
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={isBulkSelected}
                      onChange={() => toggleBulkItem('properties', property.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Property actions dropdown */}
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProperty(property)
                        openModal('editProperty')
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Property
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProperty(property)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Property
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {property.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{property.address}</p>
                  <p className="text-sm text-gray-600">{property.city}, {property.state} {property.zipCode}</p>
                  
                  {property.propertyType && (
                    <Badge variant="outline">
                      {property.propertyType.replace('_', ' ')}
                    </Badge>
                  )}
                  
                  {property.units && (
                    <p className="text-sm text-gray-500">
                      {property.units.length} units
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredProperties.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first property.'}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <Button onClick={() => openModal('propertyForm')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}