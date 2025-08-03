import * as React from 'react'
import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { VariantProps } from 'class-variance-authority'
import { 
  MapPin, 
  DollarSign, 
  Users, 
  Home, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

import { cn } from '@/lib/utils/css.utils'
import { Badge } from './badge'
import { propertyCardVariants } from '@/lib/constants/property-card-variants'

interface PropertyCardProps extends 
  Omit<HTMLMotionProps<'div'>, 'variants' | 'property' | 'onSelect'>,
  VariantProps<typeof propertyCardVariants> {
  property: {
    id: string
    name: string
    address: string
    units?: { total: number; occupied: number; available: number }
    revenue?: { monthly: number; trend: number }
    status?: 'excellent' | 'good' | 'needs-attention' | 'critical'
    type?: 'residential' | 'commercial' | 'mixed'
    lastUpdate?: string
  }
  showMetrics?: boolean
  onSelect?: (propertyId: string) => void
  featured?: boolean
}

const PropertyCard = React.forwardRef<HTMLDivElement, PropertyCardProps>(
  ({ 
    className, 
    variant, 
    size, 
    property, 
    showMetrics = true, 
    onSelect, 
    featured = false,
    ...props 
  }, ref) => {
    const handleClick = () => {
      onSelect?.(property.id)
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect?.(property.id)
      }
    }

    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'excellent': return 'text-success-600 bg-success-50 border-success-200'
        case 'good': return 'text-primary-600 bg-primary-50 border-primary-200'
        case 'needs-attention': return 'text-warning-600 bg-warning-50 border-warning-200'
        case 'critical': return 'text-error-600 bg-error-50 border-error-200'
        default: return 'text-gray-600 bg-gray-50 border-gray-200'
      }
    }

    const getStatusIcon = (status?: string) => {
      switch (status) {
        case 'excellent': return CheckCircle2
        case 'good': return CheckCircle2
        case 'needs-attention': return Clock
        case 'critical': return AlertTriangle
        default: return Home
      }
    }

    const StatusIcon = getStatusIcon(property.status)
    const occupancyRate = property.units ? 
      Math.round((property.units.occupied / property.units.total) * 100) : 0

    return (
      <motion.div
        ref={ref}
        className={cn(propertyCardVariants({ variant: featured ? 'featured' : variant, size, className }))}
        onClick={onSelect ? handleClick : undefined}
        onKeyDown={onSelect ? handleKeyDown : undefined}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 right-4">
            <Badge variant="default" className="text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              Featured
            </Badge>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {property.name}
              </h3>
              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{property.address}</span>
              </div>
            </div>
            
            {property.status && (
              <Badge variant="outline" className={cn("ml-2 flex-shrink-0", getStatusColor(property.status))}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {property.status}
              </Badge>
            )}
          </div>

          {property.type && (
            <Badge variant="secondary" className="text-xs">
              {property.type}
            </Badge>
          )}
        </div>

        {/* Metrics Section */}
        {showMetrics && (
          <div className="space-y-4">
            {/* Revenue */}
            {property.revenue && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-success-50/50 to-transparent rounded-lg border border-success-100">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-success-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-success-700">Monthly Revenue</p>
                    <p className="text-lg font-bold text-success-800">
                      ${property.revenue.monthly.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  {property.revenue.trend > 0 ? (
                    <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-error-600 mr-1" />
                  )}
                  <span className={property.revenue.trend > 0 ? 'text-success-600' : 'text-error-600'}>
                    {Math.abs(property.revenue.trend)}%
                  </span>
                </div>
              </div>
            )}

            {/* Occupancy */}
            {property.units && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50/50 to-transparent rounded-lg border border-primary-100">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-primary-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-primary-700">Occupancy</p>
                    <p className="text-lg font-bold text-primary-800">
                      {occupancyRate}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {property.units.occupied}/{property.units.total} units
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {property.units.available} available
                  </p>
                </div>
              </div>
            )}

            {/* Units Overview */}
            {property.units && (
              <div className="flex items-center p-3 bg-gradient-to-r from-gray-50/50 to-transparent rounded-lg border border-gray-100">
                <Home className="w-5 h-5 text-gray-600 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Total Units</p>
                  <p className="text-lg font-bold text-gray-800">{property.units.total}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {property.lastUpdate && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Last updated: {property.lastUpdate}
            </p>
          </div>
        )}

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </motion.div>
    )
  }
)

PropertyCard.displayName = "PropertyCard"

export { PropertyCard }
