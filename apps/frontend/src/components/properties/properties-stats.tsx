'use client'

import { useProperties } from '@/hooks/api/use-properties'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Building2, 
  Users, 
  Home,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function PropertiesStats() {
  const { data: properties, isLoading, error } = useProperties()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading properties</AlertTitle>
        <AlertDescription>
          There was a problem loading your properties data.
        </AlertDescription>
      </Alert>
    )
  }
  
  const totalProperties = properties?.length || 0
  const totalUnits = properties?.reduce((acc, property) => acc + (property.units?.length || 0), 0) || 0
  const occupiedUnits = properties?.reduce((acc, property) => 
    acc + (property.units?.filter(unit => unit.isOccupied).length || 0), 0) || 0
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  
  const stats = [
    {
      title: 'Total Properties',
      value: totalProperties,
      description: `${totalUnits} total units`,
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      description: `${occupiedUnits}/${totalUnits} occupied`,
      icon: Home,
      color: occupancyRate >= 90 ? 'text-green-600' : occupancyRate >= 70 ? 'text-yellow-600' : 'text-red-600'
    },
    {
      title: 'Active Tenants',
      value: occupiedUnits,
      description: 'Current tenants',
      icon: Users,
      color: 'text-purple-600'
    }
  ]
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}