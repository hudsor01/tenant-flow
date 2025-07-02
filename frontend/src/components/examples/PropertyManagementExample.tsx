import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Loader2, Plus, Edit, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { toast } from 'sonner'

// Import our API hooks
import {
  useProperties,
  usePropertyStats,
  usePropertyActions,
} from '../../hooks/useApiProperties'
import type { CreatePropertyDto, UpdatePropertyDto } from '../../types/api'

// Property form component
interface PropertyFormProps {
  property?: any
  onSubmit: (data: CreatePropertyDto | UpdatePropertyDto) => void
  onCancel: () => void
  isLoading?: boolean
}

function PropertyForm({ property, onSubmit, onCancel, isLoading }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    zipCode: property?.zipCode || '',
    description: property?.description || '',
    propertyType: property?.propertyType || 'SINGLE_FAMILY',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Property Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="propertyType">Property Type</Label>
          <select
            id="propertyType"
            value={formData.propertyType}
            onChange={(e) => handleChange('propertyType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="SINGLE_FAMILY">Single Family</option>
            <option value="MULTI_FAMILY">Multi Family</option>
            <option value="APARTMENT">Apartment</option>
            <option value="CONDO">Condo</option>
            <option value="TOWNHOUSE">Townhouse</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {property ? 'Update' : 'Create'} Property
        </Button>
      </div>
    </form>
  )
}

// Main component demonstrating API client usage
export function PropertyManagementExample() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Use our custom hooks
  const { data: properties, isLoading, error } = useProperties({
    search: searchQuery || undefined,
  })
  const { data: stats, isLoading: statsLoading } = usePropertyStats()
  const { create, update, delete: deleteProperty, uploadImage } = usePropertyActions()

  // Handle create property
  const handleCreateProperty = async (data: CreatePropertyDto) => {
    try {
      await create.mutateAsync(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      // Error is already handled by the hook with toast
      console.error('Failed to create property:', error)
    }
  }

  // Handle update property
  const handleUpdateProperty = async (data: UpdatePropertyDto) => {
    if (!editingProperty) return
    
    try {
      await update.mutateAsync({ id: editingProperty.id, data })
      setEditingProperty(null)
    } catch (error) {
      console.error('Failed to update property:', error)
    }
  }

  // Handle delete property
  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await deleteProperty.mutateAsync(propertyId)
    } catch (error) {
      console.error('Failed to delete property:', error)
    }
  }

  // Handle image upload
  const handleImageUpload = async (propertyId: string, file: File) => {
    try {
      await uploadImage.mutateAsync({ id: propertyId, file })
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading properties: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalProperties || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalUnits || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.occupiedUnits || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `$${stats?.totalRentAmount?.toLocaleString() || 0}`
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with search and create button */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
            </DialogHeader>
            <PropertyForm
              onSubmit={handleCreateProperty}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={create.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Properties List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties?.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {property.address}, {property.city}, {property.state}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {property.propertyType?.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {property.description && (
                    <p className="text-sm text-muted-foreground">
                      {property.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span>Units: {property._count?.units || 0}</span>
                    <span>Leases: {property._count?.leases || 0}</span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex justify-between pt-2">
                    <div className="space-x-2">
                      <Dialog 
                        open={editingProperty?.id === property.id} 
                        onOpenChange={(open) => setEditingProperty(open ? property : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Property</DialogTitle>
                          </DialogHeader>
                          <PropertyForm
                            property={editingProperty}
                            onSubmit={handleUpdateProperty}
                            onCancel={() => setEditingProperty(null)}
                            isLoading={update.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      
                      <input
                        type="file"
                        id={`file-${property.id}`}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleImageUpload(property.id, file)
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-${property.id}`)?.click()}
                        disabled={uploadImage.isPending}
                      >
                        {uploadImage.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Property</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{property.name}"? 
                            This action cannot be undone and will also delete all 
                            associated units and leases.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProperty(property.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {properties && properties.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No properties found matching your search.' : 'No properties found. Create your first property to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}