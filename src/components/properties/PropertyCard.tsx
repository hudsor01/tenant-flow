import React from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  MapPin,
  DollarSign,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  Home,
  UserCheck,
  UserX
} from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PropertyWithUnits } from '@/types/relationships'
import { useDeleteProperty } from '../../hooks/useProperties'
import { toast } from 'sonner'

interface PropertyCardProps {
  property: PropertyWithUnits
  onEdit?: (property: PropertyWithUnits) => void
  onView?: (property: PropertyWithUnits) => void
}

export default function PropertyCard({ property, onEdit, onView }: PropertyCardProps) {
  const deleteProperty = useDeleteProperty()

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        await deleteProperty.mutateAsync(property.id)
        toast.success('Property deleted successfully')
      } catch (error) {
        toast.error('Failed to delete property')
        console.error('Delete property error:', error)
      }
    }
  }

  // Calculate property statistics
  const totalUnits = property.units?.length || 0
  const occupiedUnits = property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0
  const vacantUnits = totalUnits - occupiedUnits
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  // Calculate total monthly rent (simplified - uses unit rent instead of lease data)
  const totalRent = property.units?.reduce((sum, unit) => {
    if (unit.status === 'OCCUPIED') {
      return sum + (unit.rent || 0)
    }
    return sum
  }, 0) || 0

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    },
    hover: {
      y: -4,
      transition: { duration: 0.2 }
    }
  }

  const statVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, delay: 0.1 }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="group"
    >
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
        {/* Property Image */}
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
          {property.imageUrl ? (
            <img
              src={property.imageUrl}
              alt={property.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-16 w-16 text-white/70" />
            </div>
          )}

          {/* Actions Dropdown */}
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onView?.(property)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(property)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Property
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Property
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Occupancy Badge */}
          <div className="absolute bottom-3 left-3">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              occupancyRate >= 90 ? 'bg-green-500 text-white' :
              occupancyRate >= 70 ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {occupancyRate}% Occupied
            </div>
          </div>
        </div>

        {/* Property Info */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {property.name}
              </CardTitle>
              <CardDescription className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                {property.address}, {property.city}, {property.state} {property.zipCode}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          {property.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {property.description}
            </p>
          )}

          {/* Statistics Grid */}
          <motion.div
            variants={statVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
          >
            {/* Total Units */}
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mr-3">
                <Home className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Units</p>
                <p className="text-lg font-bold text-gray-900">{totalUnits}</p>
              </div>
            </div>

            {/* Occupied Units */}
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mr-3">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Occupied</p>
                <p className="text-lg font-bold text-gray-900">{occupiedUnits}</p>
              </div>
            </div>

            {/* Vacant Units */}
            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg mr-3">
                <UserX className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Vacant</p>
                <p className="text-lg font-bold text-gray-900">{vacantUnits}</p>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mr-3">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Monthly</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalRent)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              onClick={() => onView?.(property)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors"
              onClick={() => onEdit?.(property)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
